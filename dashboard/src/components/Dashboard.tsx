import React, { useEffect, useRef, useState } from 'react';
import { useGatewayWebSocket } from '../hooks/useGatewayWebSocket';
import { LiveInstanceCard } from './LiveInstanceCard';
import { ChaosControlPanel } from './ChaosControlPanel';

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
  height: clamp(360px, 42vw, 480px);
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
.ng-clock {
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
}
.ng-clock-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #8C8874; }
.ng-clock-value { font-size: 17px; color: #FFB300; letter-spacing: 0.1em; }

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
.ng-layout { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
.ng-col-side { flex: 1 1 320px; min-width: 300px; display: flex; flex-direction: column; gap: 24px; }
.ng-col-main { flex: 2 1 480px; min-width: 320px; }

.ng-panel { position: relative; background: #15160F; border: 1px solid #2B2C1F; border-radius: 8px; padding: 24px; }
.ng-panel-tight { padding: 20px; }
.ng-rivet { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: #3A3B29; }

.ng-panel-title {
  font-size: 11px; color: #8C8874; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.2em;
  display: flex; align-items: center; gap: 8px; margin: 0 0 12px;
}
.ng-panel-title-dot { width: 6px; height: 6px; border-radius: 50%; background: #FFB300; animation: ng-pulse 2s ease-in-out infinite; }

.ng-log {
  background: #0A0B08; border: 1px solid #2B2C1F; border-radius: 6px;
  padding: 14px; height: 224px; overflow-y: auto; font-size: 11px;
}
.ng-log pre { color: rgba(255,179,0,0.8); white-space: pre-wrap; word-break: break-word; line-height: 1.6; margin: 0; }

.ng-section-head { display: flex; align-items: center; justify-content: space-between; padding: 0 4px; margin-bottom: 16px; }
.ng-section-title { font-family: 'Oswald', sans-serif; font-size: 14px; color: #F3EEDD; text-transform: uppercase; letter-spacing: 0.15em; margin: 0; }
.ng-section-badge { font-size: 10px; color: #FFB300; text-transform: uppercase; letter-spacing: 0.15em; border: 1px solid #3A3418; background: #1C1E14; padding: 6px 12px; border-radius: 4px; }

.ng-mesh-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
.ng-mesh-card { position: relative; background: #15160F; border: 1px solid #2B2C1F; border-radius: 8px; transition: border-color 0.2s ease; }
.ng-mesh-card:hover { border-color: #4A4526; }
.ng-empty { grid-column: 1 / -1; text-align: center; padding: 80px 0; background: #15160F; border: 1px solid #2B2C1F; border-radius: 8px; }
.ng-empty p { font-size: 12px; color: #8C8874; text-transform: uppercase; letter-spacing: 0.2em; animation: ng-pulse 2s ease-in-out infinite; margin: 0; }

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

    const chips = [
      { x: 0.86, y: 0.24, w: 46, h: 30 },
      { x: 0.9, y: 0.68, w: 34, h: 34 },
    ];

    const drawChip = (cx: number, cy: number, w: number, h: number) => {
      const x = cx - w / 2;
      const y = cy - h / 2;
      ctx.strokeStyle = 'rgba(255, 179, 0, 0.18)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
      const pins = 4;
      for (let i = 0; i < pins; i++) {
        const py = y + (h / (pins + 1)) * (i + 1);
        ctx.beginPath();
        ctx.moveTo(x - 6, py);
        ctx.lineTo(x, py);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + w, py);
        ctx.lineTo(x + w + 6, py);
        ctx.stroke();
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      chips.forEach((c) => drawChip(c.x * width, c.y * height, c.w, c.h));

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
  const { telemetry, metrics } = useGatewayWebSocket();
  const instances = metrics?.instances || {};
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => setClock(new Date().toTimeString().slice(0, 8));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="ng-root">
      <style>{STYLES}</style>
      <div className="ng-grid-overlay" />

      <div className="ng-hero">
        <HeroCircuit />
        <div className="ng-hero-fade" />

        <div className="ng-hero-content">
          <div className="ng-clock">
            <span className="ng-clock-label">Local time</span>
            <span className="ng-clock-value">{clock}</span>
          </div>

          <div className="ng-eyebrow">
            <span className="ng-dot"><span className="ng-dot-core" /></span>
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
        <div className="ng-layout">
          <div className="ng-col-side">
            <div className="ng-panel">
              <span className="ng-rivet" style={{ top: 10, left: 10 }} />
              <span className="ng-rivet" style={{ top: 10, right: 10 }} />
              <span className="ng-rivet" style={{ bottom: 10, left: 10 }} />
              <span className="ng-rivet" style={{ bottom: 10, right: 10 }} />
              <ChaosControlPanel />
            </div>

            <div className="ng-panel ng-panel-tight">
              <span className="ng-rivet" style={{ top: 10, left: 10 }} />
              <span className="ng-rivet" style={{ top: 10, right: 10 }} />
              <span className="ng-rivet" style={{ bottom: 10, left: 10 }} />
              <span className="ng-rivet" style={{ bottom: 10, right: 10 }} />
              <h3 className="ng-panel-title">
                <span className="ng-panel-title-dot" />
                Live event stream
              </h3>
              <div className="ng-log">
                <pre>{telemetry ? JSON.stringify(telemetry, null, 2) : '// awaiting gateway telemetry packets...'}</pre>
              </div>
            </div>
          </div>

          <div className="ng-col-main">
            <div className="ng-section-head">
              <h2 className="ng-section-title">Upstream instance mesh</h2>
              <span className="ng-section-badge">Least-connections active</span>
            </div>

            <div className="ng-mesh-grid">
              {Object.keys(instances).length > 0 ? (
                Object.entries(instances).map(([targetUrl, data]: [string, any]) => (
                  <div key={targetUrl} className="ng-mesh-card">
                    <span className="ng-rivet" style={{ top: 10, left: 10 }} />
                    <span className="ng-rivet" style={{ top: 10, right: 10 }} />
                    <span className="ng-rivet" style={{ bottom: 10, left: 10 }} />
                    <span className="ng-rivet" style={{ bottom: 10, right: 10 }} />
                    <LiveInstanceCard
                      targetUrl={targetUrl}
                      status={data.status}
                      activeConnections={data.activeConnections}
                    />
                  </div>
                ))
              ) : (
                <div className="ng-empty">
                  <p>Scanning network mesh — is the gateway online?</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};