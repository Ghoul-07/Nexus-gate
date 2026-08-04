import express from 'express'
import type {Response, Request} from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { ROUTES } from './config.js'
import { telemetryMiddleware } from './middleware/telemetry.js'
import { getServicesHealth, startHealthCheckPoller } from './services/healthChecker.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(telemetryMiddleware)

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


// Register Reverse Proxy Middleware for each route defined in config.ts
ROUTES.forEach((route) => {
  app.use(
    route.pathPrefix,
    createProxyMiddleware({
      target: route.target,
      changeOrigin: true,
    })
  );
});
app.listen(PORT, ()=>{
  console.log(`[Nexus-Gate] gateway listening on PORT ${PORT}`)
  startHealthCheckPoller(10000)
})