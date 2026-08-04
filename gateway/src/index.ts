import express from 'express'
import type {Response, Request} from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { ROUTES } from './config.js'
import { telemetryMiddleware } from './middleware/telemetry.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(telemetryMiddleware)

app.get('/health', (req:Request,res:Response)=>{
  res.json({
    status:'healthy',
    service:'Nexus-Gate Gateway',
    timestamp: new Date().toISOString()
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
})