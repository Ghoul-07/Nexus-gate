import React, { useEffect, useRef } from 'react';
import { useGatewayWebSocket } from '../hooks/useGatewayWebSocket';
import { LiveInstanceCard } from './LiveInstanceCard';
import { ChaosControlPanel } from './ChaosControlPanel';

const EVENT_STYLES: Record<string, { color: string; bg: string }> = {
  REQUEST_RECEIVED: { color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)' },
  REQUEST_COMPLETED: { color: '#4ADE80', bg: 'rgba(74, 222, 128, 0.15)' },
  REQUEST_FAILED: { color: '#F87171', bg: 'rgba(248, 113, 113, 0.15)' },
  RATE_LIMIT_EXCEEDED: { color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)' },
  CIRCUIT_BREAKER_STATE_CHANGE: { color: '#A855F7', bg: 'rgba(168, 85, 247, 0.15)' },
};

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

.ng-root {
  position: relative;
  min-height: 100vh;
  background: #0A0B08;
  color: #ECE7D8;
  font-family: 'JetBrains Mono', monospace;
  box-sizing: border-box;
}
.ng-root *, .ng-root *::before, .ng-root *::after { box-sizing: inherit; }

.ng-grid-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.04;
  background-image: linear-gradient(#FFB300 1px, transparent 1px), linear-gradient(90deg, #FFB300 1px, transparent 1px);
  background-size: 42px 42px;
}

.ng-hero {
  position: relative;
  height: clamp(340px, 38vw, 440px);
  overflow: hidden;
  border-bottom: 1px solid #2B2C1F;
}
.ng-hero-fade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(to bottom, rgba(10,11,8,0.15) 0%, rgba(10,11,8,0.55) 65%, #0A0B08 100%),
    linear-gradient(to right, #0A0B08 0%, rgba(10,11,8,0.15) 35%, rgba(10,11,8,0.15) 70%, #0A0B08 100%);
}
.ng-hero-content {
  position: relative;
  z-index: 2;
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 24px;
}
.ng-status-badge {
  position: absolute;
  top: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #2B2C1F;
  background: rgba(10,11,8,0.7);
  border-radius: 4px;
  padding: 8px 14px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}
.ng-status-badge.online { color: #4ADE80; border-color: rgba(74, 222, 128, 0.3); }
.ng-status-badge.offline { color: #F87171; border-color: rgba(248, 113, 113, 0.3); }

.ng-eyebrow { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.ng-dot { position: relative; width: 8px; height: 8px; }
.ng-dot::before, .ng-dot-core {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #4ADE80;
}
.ng-dot::before { animation: ng-ping 1.8s cubic-bezier(0,0,0.2,1) infinite; opacity: 0.6; }
.ng-eyebrow-text { font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: #8C8874; }

.ng-title-row { display: flex; align-items: center; gap: 16px; }
.ng-chip-badge {
  width: 56px; height: 56px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(255,179,0,0.4);
  border-radius: 4px;
  background: #15160F;
}
.ng-title-wrap { position: relative; display: inline-block; }
.ng-title-glow {
  position: absolute;
  inset: 0;
  font-family: 'Oswald', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  font-size: clamp(2.5rem, 7vw, 4.5rem);
  letter-spacing: 0.03em;
  line-height: 1;
  color: #FFB300;
  filter: blur(18px);
  opacity: 0.45;
}
.ng-title {
  position: relative;
  font-family: 'Oswald', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  font-size: clamp(2.5rem, 7vw, 4.5rem);
  letter-spacing: 0.03em;
  line-height: 1;
  margin: 0;
  background-image: linear-gradient(180deg, #F9F1DC 0%, #FFB300 120%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.ng-title-dash { color: #FFB300; -webkit-text-fill-color: #FFB300; }

.ng-subtitle { font-size: 14px; color: #A8A38E; letter-spacing: 0.02em; margin: 16px 0 0; max-width: 560px; }

.ng-body { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 32px 24px; }

/* Metrics Bar */
.ng-metrics-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}
.ng-metric-card {
  position: relative;
  background: #15160F;
  border: 1px solid #2B2C1F;
  border-radius: 6px;
  padding: 16px;
}
.ng-metric-title { font-size: 10px; color: #8C8874; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 6px; }
.ng-metric-value { font-size: 22px; font-weight: 700; color: #FFB300; margin: 0; }
.ng-metric-value.error { color: #F87171; }

.ng-layout { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
.ng-col-side { flex: 1 1 360px; min-width: 320px; display: flex; flex-direction: column; gap: 24px; }
.ng-col-main { flex: 2 1 480px; min-width: 320px; }

.ng-panel { position: relative; background: #15160F; border: 1px solid #2B2C1F; border-radius: 8px; padding: 24px; }
.ng-panel-tight { padding: 20px; }
.ng-rivet { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: #3A3B29; }

.ng-panel-title {
  font-size: 11px; color: #8C8874; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.2em;
  display: flex; align-items: center; gap: 8px; margin: 0 0 14px;
}
.ng-panel-title-dot { width: 6px; height: 6px; border-radius: 50%; background: #FFB300; animation: ng-pulse 2s ease-in-out infinite; }

.ng-log-stream {
  background: #0A0B08; border: 1px solid #2B2C1F; border-radius: 6px;
  padding: 12px; height: 320px; overflow-y: auto; display: flex;
  flex-direction: column; gap: 10px;
}
.ng-log-item {
  border: 1px solid #1E2015; background: #12130C; border-radius: 4px;
  padding: 10px; font-size: 11px; display: flex; flex-direction: column; gap: 6px;
}
.ng-log-header { display: flex; align-items: center; justify-content: space-between; }
.ng-event-pill {
  font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.1em; padding: 3px 6px; border-radius: 3px;
}
.ng-log-time { font-size: 10px; color: #6B6858; }
.ng-log-body { font-size: 11px; color: #ECE7D8; word-break: break-all; }
.ng-log-payload { font-size: 10px; color: #8C8874; background: #0A0B08; padding: 6px; border-radius: 3px; margin-top: 4px; white-space: pre-wrap; }

.ng-section-head { display: flex; align-items: center; justify-content: space-between; padding: 0 4px; margin-bottom: 16px; }
.ng-section-title { font-family: 'Oswald', sans-serif; font-size: 14px; color: #F3EEDD; text-transform: uppercase; letter-spacing: 0.15em; margin: 0; }
.ng-section-badge { font-size: 10px; color: #FFB300; text-transform: uppercase; letter-spacing: 0.15em; border: 1px solid #3A3418; background: #1C1E14; padding: 6px 12px; border-radius: 4px; }

.ng-mesh-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
.ng-mesh-card { position: relative; background: #15160F; border: 1px solid #2B2C1F; border-radius: 8px; transition: border-color 0.2s ease; }
.ng-mesh-card:hover { border-color: #4A4526; }

@keyframes ng-ping { 75%, 100% { transform: scale(2); opacity: 0; } }
@keyframes ng-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
`;

const pointAlongTrace = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => {
  const corner = { x: b.x, y: a.y };
  const seg1 = Math.hypot(corner.x - a.x, corner.y - a.y);
  const seg2 = Math.hypot(b.x - corner.x, b.y - corner.y);
  const total = seg1 + seg2;
  if (total === 0) return a;
  const d = t * total;
  if (d <= seg1) {
    const r = seg1 === 0 ? 0 : d / seg1;
    return { x: a.x + (corner.x - a.x) * r, y: a.y + (corner.y - a.y) * r };
  }
  const r = seg2 === 0 ? 0 : (d - seg1) / seg2;
  return { x: corner.x + (b.x - corner.x) * r, y: corner.y + (b.y - corner.y) * r };
};

const HeroCircuit: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const nodes: { x: number; y: number; vx: number; vy: number }[] = [];
    for (let i = 0; i < 42; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      });
    }

    const packets: { p1: number; p2: number; progress: number; speed: number; color: string }[] = [];
    for (let i = 0; i < 16; i++) {
      packets.push({
        p1: Math.floor(Math.random() * nodes.length),
        p2: Math.floor(Math.random() * nodes.length),
        progress: Math.random(),
        speed: 0.0035 + Math.random() * 0.006,
        color: Math.random() > 0.35 ? '#FFB300' : '#4ADE80',
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      nodes.forEach((node, idx) => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        nodes.forEach((other, oIdx) => {
          if (idx >= oIdx) return;
          const dist = Math.hypot(node.x - other.x, node.y - other.y);
          if (dist < 150) {
            const corner = { x: other.x, y: node.y };
            ctx.strokeStyle = `rgba(255, 179, 0, ${0.09 * (1 - dist / 150)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(corner.x, corner.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        });

        ctx.fillStyle = 'rgba(255, 179, 0, 0.5)';
        ctx.fillRect(node.x - 1.5, node.y - 1.5, 3, 3);
      });

      packets.forEach((packet) => {
        packet.progress += packet.speed;
        if (packet.progress >= 1) {
          packet.progress = 0;
          packet.p1 = packet.p2;
          packet.p2 = Math.floor(Math.random() * nodes.length);
          packet.color = Math.random() > 0.35 ? '#FFB300' : '#4ADE80';
        }
        const nodeA = nodes[packet.p1];
        const nodeB = nodes[packet.p2];
        if (!nodeA || !nodeB) return;

        const pos = pointAlongTrace(nodeA, nodeB, packet.progress);
        ctx.fillStyle = packet.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = packet.color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }} />;
};

export const Dashboard: React.FC = () => {
  const { isConnected, events, metrics, instances } = useGatewayWebSocket();

  return (
    <div className="ng-root">
      <style>{STYLES}</style>
      <div className="ng-grid-overlay" />

      {/* Hero Header */}
      <div className="ng-hero">
        <HeroCircuit />
        <div className="ng-hero-fade" />

        <div className="ng-hero-content">
          <div className={`ng-status-badge ${isConnected ? 'online' : 'offline'}`}>
            <span className="ng-dot"><span className="ng-dot-core" /></span>
            <span>{isConnected ? 'Live WebSockets' : 'Disconnected'}</span>
          </div>

          <div className="ng-eyebrow">
            <span className="ng-eyebrow-text">System operational</span>
          </div>

          <div className="ng-title-row">
            <div className="ng-chip-badge">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <rect x="6" y="6" width="12" height="12" rx="1.5" stroke="#FFB300" strokeWidth="1.4" />
                <path
                  d="M9 2v3M12 2v3M15 2v3M9 19v3M12 19v3M15 19v3M2 9h3M2 12h3M2 15h3M19 9h3M19 12h3M19 15h3"
                  stroke="#FFB300"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="ng-title-wrap">
              <h1 className="ng-title-glow">Nexus-Gate</h1>
              <h1 className="ng-title">
                Nexus<span className="ng-title-dash">-</span>Gate
              </h1>
            </div>
          </div>

          <p className="ng-subtitle">Gateway control deck — live routing, circuit breaking, and load balancing telemetry.</p>
        </div>
      </div>

      <div className="ng-body">
        {/* System Metric Summary Cards */}
        <div className="ng-metrics-bar">
          <div className="ng-metric-card">
            <span className="ng-rivet" style={{ top: 8, left: 8 }} />
            <span className="ng-rivet" style={{ top: 8, right: 8 }} />
            <p className="ng-metric-title">Total Requests</p>
            <p className="ng-metric-value">{metrics.totalRequests ?? 0}</p>
          </div>

          <div className="ng-metric-card">
            <span className="ng-rivet" style={{ top: 8, left: 8 }} />
            <span className="ng-rivet" style={{ top: 8, right: 8 }} />
            <p className="ng-metric-title">Avg Latency</p>
            <p className="ng-metric-value">{metrics.avgLatencyMs ?? 0} ms</p>
          </div>

          <div className="ng-metric-card">
            <span className="ng-rivet" style={{ top: 8, left: 8 }} />
            <span className="ng-rivet" style={{ top: 8, right: 8 }} />
            <p className="ng-metric-title">Total Errors</p>
            <p className="ng-metric-value error">{metrics.totalErrors ?? 0}</p>
          </div>

          <div className="ng-metric-card">
            <span className="ng-rivet" style={{ top: 8, left: 8 }} />
            <span className="ng-rivet" style={{ top: 8, right: 8 }} />
            <p className="ng-metric-title">Uptime</p>
            <p className="ng-metric-value">{metrics.upTimeSeconds ?? 0}s</p>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="ng-layout">
          <div className="ng-col-side">
            <div className="ng-panel">
              <span className="ng-rivet" style={{ top: 10, left: 10 }} />
              <span className="ng-rivet" style={{ top: 10, right: 10 }} />
              <span className="ng-rivet" style={{ bottom: 10, left: 10 }} />
              <span className="ng-rivet" style={{ bottom: 10, right: 10 }} />
              <ChaosControlPanel />
            </div>

            {/* Granular Live Telemetry Feed */}
            <div className="ng-panel ng-panel-tight">
              <span className="ng-rivet" style={{ top: 10, left: 10 }} />
              <span className="ng-rivet" style={{ top: 10, right: 10 }} />
              <span className="ng-rivet" style={{ bottom: 10, left: 10 }} />
              <span className="ng-rivet" style={{ bottom: 10, right: 10 }} />
              <h3 className="ng-panel-title">
                <span className="ng-panel-title-dot" />
                Live event stream
              </h3>

              <div className="ng-log-stream">
                {events.length > 0 ? (
                  events.map((evt: any, i: number) => {
                    const meta = EVENT_STYLES[evt.eventType] || { color: '#8C8874', bg: '#1A1C12' };
                    const time = new Date(evt.timestamp || Date.now()).toLocaleTimeString();
                    const route = evt.payload?.route || evt.payload?.targetUrl || 'N/A';
                    return (
                      <div key={evt.eventId || i} className="ng-log-item">
                        <div className="ng-log-header">
                          <span className="ng-event-pill" style={{ color: meta.color, backgroundColor: meta.bg }}>
                            {evt.eventType}
                          </span>
                          <span className="ng-log-time">[{time}]</span>
                        </div>
                        <div className="ng-log-body">
                          {evt.payload?.method ? `${evt.payload.method} ` : ''}{route}
                          {evt.payload?.latencyMs ? ` (${evt.payload.latencyMs}ms)` : ''}
                        </div>
                        {evt.payload && (
                          <div className="ng-log-payload">
                            {JSON.stringify(evt.payload)}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ color: '#6B6858', fontSize: 11, textAlign: 'center', marginTop: 120 }}>
                    // awaiting gateway telemetry packets...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upstream Instance Mesh */}
          <div className="ng-col-main">
            <div className="ng-section-head">
              <h2 className="ng-section-title">Upstream instance mesh</h2>
              <span className="ng-section-badge">Least-connections active</span>
            </div>

            <div className="ng-mesh-grid">
              {Object.entries(instances).map(([targetUrl, data]: [string, any]) => (
                <div key={targetUrl} className="ng-mesh-card">
                  <span className="ng-rivet" style={{ top: 10, left: 10 }} />
                  <span className="ng-rivet" style={{ top: 10, right: 10 }} />
                  <span className="ng-rivet" style={{ bottom: 10, left: 10 }} />
                  <span className="ng-rivet" style={{ bottom: 10, right: 10 }} />
                  <LiveInstanceCard
                    targetUrl={targetUrl}
                    status={data.status || 'UP'}
                    activeConnections={data.activeConnections || 0}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;