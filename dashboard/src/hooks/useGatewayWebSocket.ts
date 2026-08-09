import { useState, useEffect } from 'react';

export interface TelemetryEvent {
  eventId?: string;
  eventType: string;
  timestamp?: number;
  payload?: any;
}

export interface SystemMetrics {
  totalRequests: number;
  avgLatencyMs: number;
  totalErrors: number;
  upTimeSeconds: number;
}

export interface InstanceState {
  targetUrl: string;
  status: 'UP' | 'DOWN' | 'CIRCUIT_OPEN';
  activeConnections: number;
}

const INITIAL_INSTANCES: Record<string, InstanceState> = {
  'http://localhost:4001': { targetUrl: 'http://localhost:4001', status: 'UP', activeConnections: 0 },
  'http://localhost:4003': { targetUrl: 'http://localhost:4003', status: 'UP', activeConnections: 0 },
  'http://localhost:4002': { targetUrl: 'http://localhost:4002', status: 'UP', activeConnections: 0 },
};

export function useGatewayWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalRequests: 0,
    avgLatencyMs: 0,
    totalErrors: 0,
    upTimeSeconds: 0,
  });
  const [instances, setInstances] = useState<Record<string, InstanceState>>(INITIAL_INSTANCES);

  const PUBSUB_WS_URL = import.meta.env.VITE_PUBSUB_WS_URL

  useEffect(() => {
    const ws = new WebSocket(PUBSUB_WS_URL);

    ws.onopen = () => {
      console.log('🟢 Dashboard connected to Pub/Sub Broker');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);

        // Handle raw telemetry lifecycle events
        if (parsed.type === 'TELEMETRY_EVENT') {
          const telemetryEvt: TelemetryEvent = parsed.data;

          // Push to scrolling event log (keep last 20)
          setEvents((prev) => [telemetryEvt, ...prev].slice(0, 20));

          // Real-time tracking of target instance connection state & circuit breaker status
          const targetUrl = telemetryEvt.payload?.targetUrl;

          if (targetUrl) {
            setInstances((prev) => {
              const current = prev[targetUrl] || { targetUrl, status: 'UP', activeConnections: 0 };
              let newConns = current.activeConnections;
              let newStatus = current.status;

              if (telemetryEvt.eventType === 'REQUEST_RECEIVED') {
                newConns = newConns + 1;
              } else if (
                telemetryEvt.eventType === 'REQUEST_COMPLETED' ||
                telemetryEvt.eventType === 'REQUEST_FAILED'
              ) {
                newConns = Math.max(0, newConns - 1);
              } else if (telemetryEvt.eventType === 'CIRCUIT_BREAKER_STATE_CHANGE') {
                newStatus = telemetryEvt.payload?.state === 'OPEN' ? 'CIRCUIT_OPEN' : 'UP';
              }

              return {
                ...prev,
                [targetUrl]: { ...current, activeConnections: newConns, status: newStatus },
              };
            });
          }
        } 
        // Handle aggregated metrics snapshots
        else if (parsed.type === 'METRICS_UPDATE') {
          if (parsed.data?.summary) {
            setMetrics(parsed.data.summary);
          } else if (parsed.data) {
            setMetrics((prev) => ({ ...prev, ...parsed.data }));
          }
          if (parsed.data?.instances) {
            setInstances(parsed.data.instances);
          }
        }
      } catch (err) {
        console.error('⚠️ Failed to parse WebSocket packet', err);
      }
    };

    ws.onclose = () => {
      console.log('🔴 Disconnected from Pub/Sub Broker');
      setIsConnected(false);
    };

    return () => ws.close();
  }, []);

  return { isConnected, events, metrics, instances };
}