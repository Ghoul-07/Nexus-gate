import { useEffect, useState } from "react";

export interface MetricsSnapshot {
  totalRequests: number;
  totalErrors: number;
  avgLatencyMs: number;
  upTimeSeconds: number;
  requestsByStatus: Record<number, number>;
  requestsByRoute: Record<string, number>;
  requestsByMethod: Record<string, number>;
}

export interface TelemetryEvent {
  eventType: string;
  payload: Record<string, unknown>;
  timestamp?: number;
}

export function useGatewayWebSocket(url: string){
  const [isConnected, setIsConnected] = useState(false)
  const [metrics, setMetrics] = useState<MetricsSnapshot | null >(null)
  const [events, setEvents] = useState<TelemetryEvent[]>([])

  useEffect(()=>{
    const ws = new WebSocket(url)

    ws.onopen = () =>{
      console.log("Dashboard connected to Gateway WS")
      setIsConnected(true)
    }

    ws.onclose = () =>{
      console.log("Dashboard disconnected from Gateway WS")
      setIsConnected(false)
    }

    ws.onmessage = (event) =>{
      try{
        const message = JSON.parse(event.data)

        if(message.type === 'METRICS_SNAPSHOT'){
          setMetrics(message.data)
          if(message.data.recentEvents){
            setEvents(message.data.recentEvents)
          }
        }
        if(message.type === 'METRICS_UPDATE'){
          setMetrics(message.data)
        }
        if(message.type === 'TELEMETRY_EVENT'){
          setEvents((prev) => [message.data, ...prev.slice(0, 49)])                // keep last 50 events
        }
      }catch(err){
        console.error('Failed to parse WS message', err)
      }
    }

    return () =>{
      ws.close()
    }
  },[url])

  return {isConnected, metrics, events}
}