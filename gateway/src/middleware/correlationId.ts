import type {Request, Response, NextFunction} from 'express';
import {v4 as uuidv4 } from 'uuid'

export const CORRELATION_HEADER='x-request-id'

export function correlationMiddleware(req:Request, res:Response, next: NextFunction){
  const correlationId = (req.headers[CORRELATION_HEADER] as string) || uuidv4();

  // Attach to express request object so other middlewares can see/access it
  (req as any).correlationId = correlationId 

  // send correlationId in response so the client receives the trace ID
  res.setHeader(CORRELATION_HEADER, correlationId)
  next()
}