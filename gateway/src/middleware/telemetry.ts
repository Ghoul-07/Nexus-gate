import type {Request, Response, NextFunction} from 'express'
import { v4 as uuidv4} from 'uuid'
import type { NexusGatewayEvent } from '@Nexus-gate/shared/eventSchema.ts'

// Helper to identify the downstream/upstream target name
const getServiceName = (path: string): string => {
  if (path.startsWith('/api/users')) return 'user-service';
  if (path.startsWith('/api/orders')) return 'order-service';
  return 'gateway';
};


export const telemetryMiddleware = (req: Request, res:Response, next: NextFunction) =>{
  const startTime = Date.now()
  const traceId = uuidv4()

  // Attach traceId to request headers so downstream services/clients can see it
  req.headers['x-trace-id'] = traceId

  // Listen for when the response finishes sending to the client

  res.on('finish', () =>{
    const latencyMs = Date.now() - startTime

    const event : NexusGatewayEvent = {
      eventId: uuidv4(),
      timestamp: Date.now(),
      topic: 'gateway-telemetry',
      partitionKey: traceId,
      schemaVersion: 1,
      eventType: 'REQUEST_COMPLETED',
      payload:{
        traceId,
        method: req.method,
        route: req.originalUrl,
        statusCode: res.statusCode,
        latencyMs,
        upstreamService: getServiceName(req.originalUrl)
      }
    }
    console.log('[Telemetry event]: ', JSON.stringify(event, null, 2))
  })

  next()
}