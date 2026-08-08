import { v4 as uuidv4 } from 'uuid';
import { metricsRegistry } from './metrics.js';
import type {
  NexusGatewayEvent,
  RequestReceivedPayload,
  RequestCompletedPayload,
  RequestFailedPayload,
  RateLimitExceededPayload,
  CircuitBreakerPayload
} from '@Nexus-gate/shared';

const TELEMETRY_TOPIC = "gateway-telemetry";
const SCHEMA_VERSION = 1;

// Define the target endpoint for your new Pub/Sub broker
const PUBSUB_BROKER_URL = process.env.PUBSUB_URL || 'http://localhost:5000/publish';

function createBaseEvent(partitionKey: string) {
  return {
    eventId: uuidv4(),
    timestamp: Date.now(),
    topic: TELEMETRY_TOPIC,
    partitionKey,
    schemaVersion: SCHEMA_VERSION
  };
}

function dispatch(event: NexusGatewayEvent): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Telemetry Event] [${event.eventType}]`, JSON.stringify(event.payload));
  }
  
  metricsRegistry.recordEvent(event);

  // 1. Send the telemetry event to the Pub/Sub broker
  fetch(PUBSUB_BROKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'TELEMETRY_EVENT', data: event })
  }).catch(err => {
    // Fail silently: Do not crash the gateway if the broker is down
    console.error('⚠️ Gateway failed to publish event to Pub/Sub broker:', err.message);
  });

  // 2. Send the updated metrics snapshot to the Pub/Sub broker
  fetch(PUBSUB_BROKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'METRICS_UPDATE', data: metricsRegistry.getSnapshot() })
  }).catch(err => {
    console.error('⚠️ Gateway failed to publish metrics to Pub/Sub broker:', err.message);
  });
}

export const telemetryPublisher = {
  emitRequestReceived(payload: RequestReceivedPayload): void {
    const event: NexusGatewayEvent = {
      ...createBaseEvent(payload.traceId),
      eventType: 'REQUEST_RECEIVED',
      payload
    };
    dispatch(event);
  },

  emitRequestCompleted(payload: RequestCompletedPayload): void {
    metricsRegistry.recordRequest(payload.method, payload.route, payload.statusCode, payload.latencyMs);

    const event: NexusGatewayEvent = {
      ...createBaseEvent(payload.traceId),
      eventType: 'REQUEST_COMPLETED',
      payload
    };
    dispatch(event);
  },

  emitRequestFailed(payload: RequestFailedPayload): void {
    metricsRegistry.recordRequest(payload.method, payload.route, payload.statusCode || 500, 0);

    const event: NexusGatewayEvent = {
      ...createBaseEvent(payload.traceId),
      eventType: 'REQUEST_FAILED',
      payload
    };
    dispatch(event);
  },

  emitRateLimitExceeded(payload: RateLimitExceededPayload): void {
    metricsRegistry.recordRequest("UNKNOWN", payload.route, 429, 0);

    const event: NexusGatewayEvent = {
      ...createBaseEvent(payload.route),
      eventType: 'RATE_LIMIT_EXCEEDED',
      payload
    };
    dispatch(event);
  },
  
  emitCircuitBreakerStateChange(payload: CircuitBreakerPayload): void {
    const event: NexusGatewayEvent = {
      ...createBaseEvent(payload.targetUrl),
      eventType: 'CIRCUIT_BREAKER_STATE_CHANGE',
      payload
    };
    dispatch(event);
  }
};