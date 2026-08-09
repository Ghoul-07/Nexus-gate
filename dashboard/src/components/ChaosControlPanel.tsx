import React, { useState } from 'react';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL

const STYLES = `
.ccp-title {
  font-family: 'Oswald', sans-serif;
  font-size: 14px;
  color: #F3EEDD;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
}
.ccp-stack { display: flex; flex-direction: column; gap: 10px; }
.ccp-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid #2B2C1F;
  background: #101109;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.1s ease;
  font-family: 'JetBrains Mono', monospace;
  text-align: left;
}
.ccp-toggle:hover:not(:disabled) { border-color: #4A4526; }
.ccp-toggle:active:not(:disabled) { transform: scale(0.99); }
.ccp-toggle:disabled { opacity: 0.5; cursor: not-allowed; }
.ccp-label { font-size: 12px; font-weight: 600; color: #ECE7D8; text-transform: uppercase; letter-spacing: 0.03em; }
.ccp-sub { font-size: 10px; color: #8C8874; margin-top: 2px; }
.ccp-switch {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  border: 1px solid #2B2C1F;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}
.ccp-knob {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #4A4838;
  transform: translateX(3px);
  transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}
`;

type ToggleKey = 'normal' | 'spike' | 'latency';

const Toggle: React.FC<{
  label: string;
  sub: string;
  active: boolean;
  color: string;
  disabled?: boolean;
  onClick: () => void;
}> = ({ label, sub, active, color, disabled, onClick }) => (
  <button className="ccp-toggle" onClick={onClick} disabled={disabled}>
    <div>
      <div className="ccp-label">{label}</div>
      <div className="ccp-sub">{sub}</div>
    </div>
    <span
      className="ccp-switch"
      style={{
        borderColor: active ? color : '#2B2C1F',
        backgroundColor: active ? `${color}26` : '#0A0B08',
      }}
    >
      <span
        className="ccp-knob"
        style={{
          backgroundColor: active ? color : '#4A4838',
          transform: active ? 'translateX(18px)' : 'translateX(3px)',
          boxShadow: active ? `0 0 6px ${color}` : 'none',
        }}
      />
    </span>
  </button>
);

export const ChaosControlPanel: React.FC = () => {
  const [activeToggle, setActiveToggle] = useState<ToggleKey | null>(null);
  const [isSpiking, setIsSpiking] = useState(false);

  const flash = (key: ToggleKey, duration: number) => {
    setActiveToggle(key);
    setTimeout(() => setActiveToggle((cur) => (cur === key ? null : cur)), duration);
  };

  const fireNormalTraffic = async () => {
    flash('normal', 500);
    for (let i = 0; i < 10; i++) {
      fetch(`${GATEWAY_URL}/api/orders`).catch(() => {});
    }
  };

  const triggerErrorSpike = async () => {
    setIsSpiking(true);
    flash('spike', 1000);
    for (let i = 0; i < 5; i++) {
      fetch(`${GATEWAY_URL}/api/orders?chaos=500`).catch(() => {});
    }
    setTimeout(() => setIsSpiking(false), 1000);
  };

  const triggerLatency = () => {
    flash('latency', 1500);
    fetch(`${GATEWAY_URL}/api/orders?delay=20000`).catch(() => {});
  };

  return (
    <div>
      <style>{STYLES}</style>
      <h2 className="ccp-title">
        <span style={{ color: '#FFB300' }}>&#9889;</span> Chaos control panel
      </h2>
      <div className="ccp-stack">
        <Toggle
          label="Fire normal traffic"
          sub="Sends 10 requests to /api/orders"
          active={activeToggle === 'normal'}
          color="#4ADE80"
          onClick={fireNormalTraffic}
        />
        <Toggle
          label={isSpiking ? 'Spiking errors...' : 'Trigger 500 error spike'}
          sub="Forces 5 upstream failures"
          active={activeToggle === 'spike'}
          color="#F87171"
          disabled={isSpiking}
          onClick={triggerErrorSpike}
        />
        <Toggle
          label="Inject 20s latency"
          sub="Delays the next response by 20s"
          active={activeToggle === 'latency'}
          color="#FBBF24"
          onClick={triggerLatency}
        />
      </div>
    </div>
  );
};