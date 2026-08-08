import { useState, useEffect } from 'react';

export function useGatewayWebSocket() {
  // State to hold the latest events and metrics
  const [telemetry, setTelemetry] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    // Connect directly to the new Pub/Sub broker
    const ws = new WebSocket('ws://localhost:5000');

    ws.onopen = () => {
      console.log('🟢 Connected to Pub/Sub Broker');
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        
        // Route the incoming data to the correct state variable
        if (parsed.type === 'TELEMETRY_EVENT') {
          setTelemetry(parsed.data);
        } else if (parsed.type === 'METRICS_UPDATE') {
          setMetrics(parsed.data);
        }
      } catch (err) {
        console.error('⚠️ Failed to parse WebSocket message', err);
      }
    };

    ws.onclose = () => {
      console.log('🔴 Disconnected from Pub/Sub Broker');
    };

    // Cleanup the connection when the component unmounts
    return () => {
      ws.close();
    };
  }, []);

  return { telemetry, metrics };
}