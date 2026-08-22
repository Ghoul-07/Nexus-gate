import { createClient } from 'redis';
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

// 1. Initialize Redis Client
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true,
    rejectUnauthorized: false // Bypasses the local Windows SSL block
  }
});

redisClient.on('error', (err) => console.error('[Redis Error] Gateway Publisher:', err));
redisClient.on('connect', () => console.log('[Redis] Gateway Publisher connected to broker 🚀'));

// Connect asynchronously
redisClient.connect().catch(console.error);

// Background periodic snapshot (every 5 seconds) so idle state stays fresh
setInterval(() => {
  if (redisClient.isOpen) {
    redisClient.publish(
      'gateway-metrics',
      JSON.stringify({ type: 'METRICS_UPDATE', data: metricsRegistry.getSnapshot() })
    ).catch(() => {});
  }
}, 5000);

function createBaseEvent(partitionKey: string) {
  return {
    eventId: uuidv4(),
    timestamp: Date.now(),
    topic: TELEMETRY_TOPIC,
    partitionKey,
    schemaVersion: SCHEMA_VERSION
  };
}

// 2. Updated Dispatch Function 
function dispatch(event: NexusGatewayEvent): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Telemetry Event] [${event.eventType}]`, JSON.stringify(event.payload));
  }
  
  // TRACER BULLET 1: Right before it leaves the Gateway
  console.log(`\n🚀 [Step 1: Gateway] Routing ${event.eventType} event. Firing up to Redis...`);
  
  metricsRegistry.recordEvent(event);

  // Send the telemetry event to Redis
  redisClient.publish(TELEMETRY_TOPIC, JSON.stringify({ type: 'TELEMETRY_EVENT', data: event }))
    .then(() => {
      
      console.log(`✅ [Step 2: Gateway] Successfully published ${event.eventType} to Upstash Cloud!`);
    })
    .catch(err => {
      console.error('⚠️ Gateway failed to publish event to Redis broker:', err.message);
    });

  // Send the updated metrics snapshot to a separate Redis channel
  redisClient.publish('gateway-metrics', JSON.stringify({ type: 'METRICS_UPDATE', data: metricsRegistry.getSnapshot() }))
    .catch(err => {
      console.error('⚠️ Gateway failed to publish metrics to Redis broker:', err.message);
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