import {v4 as uuidv4} from 'uuid'
import { metricsRegistry } from './metrics.js'

import type{
  NexusGatewayEvent,
  RequestReceivedPayload,
  RequestCompletedPayload,
  RequestFailedPayload,
  RateLimitExceededPayload
} from '@Nexus-gate/shared'

const TELEMETRY_TOPIC= "gateway-telemetry"
const SCHEMA_VERSION = 1


function createBaseEvent(partitionKey: string){
  return {
    eventId: uuidv4(),
    timestamp: Date.now(),
    topic: TELEMETRY_TOPIC,
    partitionKey,
    schemaVersion: SCHEMA_VERSION
  }
}

function dispatch(event : NexusGatewayEvent): void{
  if(process.env.NODE_ENV !== 'production'){
    console.log(`[Telemetry Event] [${event.eventType}]`, JSON.stringify(event.payload))
  }
}

export const telemetryPublisher = {
  emitRequestReceived(payload: RequestReceivedPayload): void {
    const event: NexusGatewayEvent = {
      ...createBaseEvent(payload.traceId),
      eventType: 'REQUEST_RECEIVED',
      payload
    }
    dispatch(event)
  },

  emitRequestCompleted(payload: RequestCompletedPayload): void{
    metricsRegistry.recordRequest(payload.method, payload.route, payload.statusCode, payload.latencyMs)

    const event: NexusGatewayEvent={
      ...createBaseEvent(payload.traceId),
      eventType:'REQUEST_COMPLETED',
      payload
    }
    dispatch(event)
  },

  emitRequestFailed(payload: RequestFailedPayload): void{
    metricsRegistry.recordRequest(payload.method, payload.route, payload.statusCode || 500, 0)

    const event : NexusGatewayEvent = {
      ...createBaseEvent(payload.traceId),
      eventType:'REQUEST_FAILED',
      payload
    }
    dispatch(event)
  },

  emitRateLimitExceeded(payload: RateLimitExceededPayload) : void{
    metricsRegistry.recordRequest("UNKNOWN", payload.route, 429, 0)

    const event : NexusGatewayEvent = {
      ...createBaseEvent(payload.route),
      eventType: 'RATE_LIMIT_EXCEEDED',
      payload
    }
    dispatch(event)
  }



}