// ============================================================
// Nexus-Gate Event Schema — the shared contract between
// Gateway (producer) and Pub/Sub (broker/consumers).
// ============================================================

// 1. All possible event types Nexus-Gate can emit
export type EventType =
  | 'REQUEST_RECEIVED'
  | 'REQUEST_COMPLETED'
  | 'REQUEST_FAILED'
  | 'CIRCUIT_BREAKER_STATE_CHANGE'
  | 'RATE_LIMIT_EXCEEDED';

// 2. Base metadata every single message MUST have
export interface BaseEvent {
  eventId: string;          // Unique ID (UUID)
  timestamp: number;        // Epoch timestamp in ms
  topic: string;            // e.g., "gateway-telemetry"
  partitionKey: string;     // e.g., traceId or route — broker hashes this to a partition
  schemaVersion: number;    // lets the schema evolve later without breaking consumers
}

// 3. Per-event-type payloads (discriminated union members)

export interface RequestReceivedPayload {
  traceId: string;          // ties this event to others from the same request
  method: string;           // GET, POST, PUT, DELETE
  route: string;             // e.g., "/api/users"
  clientIp: string;
}

export interface RequestCompletedPayload {
  traceId: string;
  method: string;
  route: string;
  statusCode: number;
  latencyMs: number;
  upstreamService: string;  // which backend actually served it
}

export interface RequestFailedPayload {
  traceId: string;
  method: string;
  route: string;
  errorReason: string;
  statusCode?: number;      // may not exist if the request never got a response (e.g. timeout)
}

export interface CircuitBreakerPayload {
  targetUrl: string;
  previousState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  newState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  reason?: string;
}

export interface RateLimitExceededPayload {
  route: string;
  clientIp: string;
  limit: number;
  windowMs: number;
}

// 4. The complete event structure published to Pub/Sub —
//    a discriminated union keyed on eventType, so TypeScript
//    enforces the correct payload shape per event type.
export type NexusGatewayEvent =
  | (BaseEvent & { eventType: 'REQUEST_RECEIVED'; payload: RequestReceivedPayload })
  | (BaseEvent & { eventType: 'REQUEST_COMPLETED'; payload: RequestCompletedPayload })
  | (BaseEvent & { eventType: 'REQUEST_FAILED'; payload: RequestFailedPayload })
  | (BaseEvent & { eventType: 'CIRCUIT_BREAKER_STATE_CHANGE'; payload: CircuitBreakerPayload })
  | (BaseEvent & { eventType: 'RATE_LIMIT_EXCEEDED'; payload: RateLimitExceededPayload });