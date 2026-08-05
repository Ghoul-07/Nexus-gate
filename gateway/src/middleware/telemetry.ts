import type {Request, Response, NextFunction} from 'express'
import { ROUTES } from '../config.js';
import { telemetryPublisher } from '../services/telemetryPublisher.js';
import { CORRELATION_HEADER } from './correlationId.js';

// Helper to identify the downstream/upstream target name
const getServiceName = (path: string): string => {
  const match = ROUTES.find(r => path.startsWith(r.pathPrefix))
  return match ? match.pathPrefix.replace('/api/', '') + '-service' : 'gateway';
};

export const telemetryMiddleware = (req: Request, res:Response, next: NextFunction) =>{
  const startTime = Date.now()
  const traceId = (req as any).correlationId || (req.headers[CORRELATION_HEADER] as string) || 'unknown-trace'

  const route = req.originalUrl || req.path
  const method = req.method
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown'


  // 1. emit REQUEST_RECEIVED when the request starts
  telemetryPublisher.emitRequestReceived({
    traceId,
    method,
    route,
    clientIp
  })

  // 2. Emit complete/failed when response finishes
 
  res.on('finish', () =>{
    const latencyMs = Date.now() - startTime
    const statusCode = res.statusCode
    const upstreamService = (req as any).proxyTarget || getServiceName(route)

    if(statusCode === 429){
      return 
    }

    if(statusCode >= 400){

      telemetryPublisher.emitRequestFailed({
        traceId,
        method,
        route,
        errorReason: `Request completed with HTTP ${statusCode}`,
        statusCode,
      })
    }
    else{
      telemetryPublisher.emitRequestCompleted({
        traceId,
        method,
        route,
        statusCode,
        latencyMs,
        upstreamService
      })
    }  
  })

  next()
}