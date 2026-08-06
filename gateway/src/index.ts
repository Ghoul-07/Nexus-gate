import express from 'express'
import type {Response, Request} from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { ROUTES } from './config.js'
import { telemetryMiddleware } from './middleware/telemetry.js'
import { correlationMiddleware } from './middleware/correlationId.js'
import { authMiddleware } from './middleware/authMiddleware.js'
import { rateLimiterMiddleware } from './middleware/rateLimiter.js'
import { getServicesHealth, startHealthCheckPoller } from './services/healthChecker.js'
import { getNextTarget } from './services/loadBalancer.js'
import { metricsRegistry } from './services/metrics.js'
import authRouter from './auth/authRoutes.js'
import 'dotenv/config'

const app = express()
const PORT = process.env.PORT || 3000

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
    (req, res, next) =>{                    // pick healthy instance
    const target = getNextTarget(route)
    if(!target){
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'All upstream instances are down'
      })
    }
    ;(req as any).proxyTarget = target
    next()
  })
  app.use(
    route.pathPrefix,
    createProxyMiddleware({
      changeOrigin: true,
      router: (req) => (req as any).proxyTarget,
      on: {
        error: (err, req, res) => {
          console.error(`[Proxy Error] ${req.url}:`, err.message)
          if ('writeHead' in res) {
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Bad Gateway', message: 'Upstream service unavailable' }))
          }
        },
      },
    })
  );
});

app.listen(PORT, ()=>{
  console.log(`[Nexus-Gate] gateway listening on PORT ${PORT}`)
  startHealthCheckPoller(10000)
})