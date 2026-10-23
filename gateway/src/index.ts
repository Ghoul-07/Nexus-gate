import express from 'express'
import type {Response, Request} from 'express'
import cors from 'cors'
import { ROUTES } from './config.js'
import { telemetryMiddleware } from './middleware/telemetry.js'
import { correlationMiddleware } from './middleware/correlationId.js'
import { authMiddleware } from './middleware/authMiddleware.js'
import { rateLimiterMiddleware } from './middleware/rateLimiter.js'
import { getServicesHealth, startHealthCheckPoller } from './services/healthChecker.js'
import { getNextTarget, trackRequestEnd, trackRequestStart } from './services/loadBalancer.js'
import { metricsRegistry } from './services/metrics.js'
import { getCircuitBreaker } from './services/circuitBreaker.js'
import { forwardRequest } from './proxy/index.js'
import { getActiveChaos } from './services/chaosManager.js'
import http from 'http'
import authRouter from './auth/authRoutes.js'
import 'dotenv/config'

const app = express()
const PORT = process.env.PORT || 3000
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:5173';

app.use(cors({
  origin:[DASHBOARD_URL, 'http://localhost:5173'],
  credentials:true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id']
}))


app.use(correlationMiddleware)
app.use(telemetryMiddleware)
app.use('/auth', express.json() ,authRouter)


// gateway self-health check
app.get('/health', (req: Request,res: Response)=>{
  res.json({
    status:'healthy',
    service:'Nexus-Gate Gateway',
    timestamp: new Date().toISOString()
  })
})

// aggregate health status endpoint
app.get('/health/services', (req: Request, res: Response) => {
  res.json({
    timeStamp: new Date().toISOString(),
    services: getServicesHealth()
  })
})

// Expose internal gateway metrics
app.get('/metrices', (req: Request, res:Response) =>{
  res.json(metricsRegistry.getSnapshot())
})

// Register Reverse Proxy Middleware for each route defined in config.ts
ROUTES.forEach((route) => {
  // resolve target before the proxy runs
  app.use(
    route.pathPrefix,
    authMiddleware(route),                   // Verify JWT and roles
    rateLimiterMiddleware(route),           // Enforce token rate limit
    async(req:Request, res:Response) =>{            
      
      // pick healthy instance via Load Balancer
      const target = getNextTarget(route)

      if(!target){
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'All upstream instances are down or circuit breaker tripped'
        })
      }
      // increment active connections
      trackRequestStart(target)

      const targetOrigin = new URL(target).origin
      const breaker = getCircuitBreaker(targetOrigin)

      // chaos control
      const chaos = getActiveChaos()
      const isTargeted = !chaos.targetOrigin || chaos.targetOrigin === targetOrigin


      if (isTargeted && chaos.mode === 'SPIKE_500') {
        trackRequestEnd(target)
        breaker.recordFailure()
        return res.status(500).json({
          error: 'Chaos Engineering Injected Fault',
          simulatedBy: 'Nexus-Gate Control Plane',
          target
        })
      }

      if (isTargeted && chaos.mode === 'LATENCY' && chaos.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, chaos.delayMs))
      }

      // forward request through our native stream proxy

      await forwardRequest(req, res, {
        target,
        timeoutMs: 10000,
        onResponse: (statusCode) =>{
          trackRequestEnd(target)
          if(statusCode >= 500){
            breaker.recordFailure()
          }
          else{
            breaker.recordSuccess()
          }
        },
        onError: (err, statusCode) =>{
          console.error(`[Proxy Error] ${req.url}: `, err.message)
          trackRequestEnd(target)
          breaker.recordFailure()
        }
      })  
  })
});

const server = http.createServer(app)

server.listen(PORT, ()=>{
  console.log(`[Nexus-Gate] gateway listening on PORT:${PORT}`)
  startHealthCheckPoller(10000)
})