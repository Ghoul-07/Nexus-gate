import { useGatewayWebSocket } from "../hooks/useGatewayWebSocket";

const GATEWAY_WS_URL = import.meta.env.VITE_GATEWAY_WS_URL;

function Dashboard() {
  const { isConnected, metrics, events } = useGatewayWebSocket(GATEWAY_WS_URL);

  return (
    <div className="dashboard-container">
      {/* Header Bar*/}
      <header className="dashboard-header">
        <h1>⚡ Nexus-Gate Telemetry</h1>
        
        <div className={`status-badge ${isConnected ? "online" : "offline"}`}>
          <span className="dot" />
          <span>{isConnected ? "Live WebSockets" : "disconnected"}</span>
        </div>
        
      </header>

      {/* Metric Cards Grid */}
      <div className="metrics-grid">
        <div className="card">
          <h3>Total Requests</h3>
          <p className="value">{metrics?.totalRequests ?? 0}</p>
        </div>

        <div className="card">
          <h3>Avg Latency</h3>
          <p className="value">{metrics?.avgLatencyMs ?? 0} ms</p>
        </div>

        <div className="card">
          <h3>Total Errors</h3>
          <p className="value error">{metrics?.totalErrors ?? 0}</p>
        </div>

        <div className="card">
          <h3>Uptime</h3>
          <p className="value">{metrics?.upTimeSeconds ?? 0}s</p>
        </div>
      </div>

      {/* Live Event Console Feed */}
      <div className="events-panel">
        <h2>📡 Live Telemetry Event Feed</h2>
        <div className="events-log">
          {events.length === 0 ? (
            <p className="no-events">Waiting for events from gateway...</p>
          ) : (
            events.map((evt, idx) => (
              <div key={idx} className="event-item">
                <span className="event-time">
                  [{new Date(evt.timestamp || Date.now()).toLocaleTimeString()}]
                </span>
                <span className="event-type">[{evt.eventType}]</span>
                <pre className="event-payload">
                  {JSON.stringify(evt.payload)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
export default Dashboard;
