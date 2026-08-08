import React from 'react';

const STYLES = `
.lic-row { padding: 20px; display: flex; align-items: center; gap: 16px; }
.lic-gauge { position: relative; flex-shrink: 0; width: 64px; height: 64px; }
.lic-gauge-value {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 600; color: #ECE7D8;
}
.lic-url { font-size: 12px; color: #ECE7D8; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lic-status-row { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
.lic-status-dot { position: relative; width: 6px; height: 6px; }
.lic-status-core { position: absolute; inset: 0; border-radius: 50%; }
.lic-status-ping { position: absolute; inset: 0; border-radius: 50%; animation: lic-ping 1.8s cubic-bezier(0,0,0.2,1) infinite; opacity: 0.6; }
.lic-status-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; }
.lic-caption { font-size: 9px; color: #8C8874; text-transform: uppercase; letter-spacing: 0.15em; margin: 10px 0 0; }
@keyframes lic-ping { 75%, 100% { transform: scale(2); opacity: 0; } }
`;

interface LiveInstanceCardProps {
  targetUrl: string;
  status: 'UP' | 'DOWN' | 'CIRCUIT_OPEN';
  activeConnections: number;
}

const STATUS_META: Record<LiveInstanceCardProps['status'], { color: string; label: string; pulse: boolean }> = {
  UP: { color: '#4ADE80', label: 'Up', pulse: true },
  DOWN: { color: '#F87171', label: 'Down', pulse: false },
  CIRCUIT_OPEN: { color: '#FBBF24', label: 'Circuit open', pulse: true },
};

// Gauge saturates visually at 20 concurrent connections.
const GAUGE_MAX = 20;
const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const LiveInstanceCard: React.FC<LiveInstanceCardProps> = ({ targetUrl, status, activeConnections }) => {
  const meta = STATUS_META[status];
  const fraction = Math.min(activeConnections / GAUGE_MAX, 1);
  const offset = CIRCUMFERENCE * (1 - fraction);

  return (
    <div className="lic-row">
      <style>{STYLES}</style>
      <div className="lic-gauge">
        <svg viewBox="0 0 64 64" width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="#2B2C1F" strokeWidth="4" />
          <circle
            cx="32"
            cy="32"
            r={RADIUS}
            fill="none"
            stroke={meta.color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        </svg>
        <div className="lic-gauge-value">{activeConnections}</div>
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="lic-url" title={targetUrl}>{targetUrl}</p>
        <div className="lic-status-row">
          <span className="lic-status-dot">
            {meta.pulse && <span className="lic-status-ping" style={{ backgroundColor: meta.color }} />}
            <span className="lic-status-core" style={{ backgroundColor: meta.color }} />
          </span>
          <span className="lic-status-label" style={{ color: meta.color }}>{meta.label}</span>
        </div>
        <p className="lic-caption">In-flight connections</p>
      </div>
    </div>
  );
};