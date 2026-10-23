import { useState, useEffect, useRef, useCallback } from 'react';

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
  startTime?: number;
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
    startTime: Date.now(),
  });
  const [instances, setInstances] = useState<Record<string, InstanceState>>(INITIAL_INSTANCES);

  const socketRef = useRef<WebSocket | null>(null);
  const PUBSUB_WS_URL = import.meta.env.VITE_PUBSUB_WS_URL || 'ws://localhost:5000';

  useEffect(() => {
    let ws: WebSocket | null = null;
    let isSubscribed = true;

    function connect() {
      ws = new WebSocket(PUBSUB_WS_URL);

      ws.onopen = () => {
        if (!isSubscribed) return;
        console.log('🟢 Dashboard connected to Pub/Sub Broker');
        socketRef.current = ws;
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!isSubscribed) return;
        try {
          const parsed = JSON.parse(event.data);

          if (parsed.type === 'TELEMETRY_EVENT') {
            const telemetryEvt: TelemetryEvent = parsed.data;
            setEvents((prev) => [telemetryEvt, ...prev].slice(0, 20));

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
          } else if (parsed.type === 'METRICS_UPDATE') {
            if (parsed.data?.summary) {
              setMetrics((prev) => ({ ...prev, ...parsed.data.summary }));
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
        if (!isSubscribed) return;
        console.log('🔴 Disconnected from Pub/Sub Broker');
        setIsConnected(false);
        if (socketRef.current === ws) {
          socketRef.current = null;
        }
      };
    }

    connect();

    return () => {
      isSubscribed = false;
      if (ws) {
        ws.close();
      }
      if (socketRef.current === ws) {
        socketRef.current = null;
      }
    };
  }, [PUBSUB_WS_URL]);

  // Keep uptime counter strictly tick-based without forcing cascading resets
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        upTimeSeconds: prev.startTime
          ? Math.floor((Date.now() - prev.startTime) / 1000)
          : prev.upTimeSeconds + 1,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const sendCommand = useCallback((type: string, payload?: any) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
      console.log('✅ [WebSocket Dispatched]:', { type, payload });
    } else {
      console.warn('⚠️ Cannot send command: WebSocket is not open. Current state:', ws?.readyState);
    }
  }, []);

  return { isConnected, events, metrics, instances, sendCommand };
}