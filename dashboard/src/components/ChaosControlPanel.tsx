import React, { useState, useEffect, memo } from 'react';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000';
const TOKEN_STORAGE_KEY = 'nexus_demo_token';

const DEMO_CREDENTIALS = {
  username: 'alice',
  password: 'alice123',
};

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

interface ChaosControlPanelProps {
  sendCommand?: (type: string, payload?: any) => void;
  authToken?: string;
  isConnected?: boolean;
}

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

function getValidToken(): string | null {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }
    return token;
  } catch {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }
}

const ChaosControlPanelComponent: React.FC<ChaosControlPanelProps> = ({
  sendCommand,
  authToken,
  isConnected = true,
}) => {
  const [activeToggle, setActiveToggle] = useState<ToggleKey | null>(null);
  const [isSpiking, setIsSpiking] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(() => authToken || getValidToken());

  useEffect(() => {
    if (sessionToken) return;

    let active = true;
    async function loginDemoUser() {
      try {
        const res = await fetch(`${GATEWAY_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(DEMO_CREDENTIALS),
        });

        if (!res.ok) return;
        const data = await res.json();
        const token = data.token || data.accessToken;
        if (token && active) {
          localStorage.setItem(TOKEN_STORAGE_KEY, token);
          setSessionToken(token);
        }
      } catch (err: any) {
        console.error('Login error:', err.message);
      }
    }

    loginDemoUser();
    return () => {
      active = false;
    };
  }, [sessionToken]);

  const flash = (key: ToggleKey, duration: number) => {
    setActiveToggle(key);
    setTimeout(() => setActiveToggle((cur) => (cur === key ? null : cur)), duration);
  };

  const getHeaders = (): Record<string, string> => {
    const activeToken = authToken || sessionToken || localStorage.getItem(TOKEN_STORAGE_KEY);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return headers;
  };

  const fireNormalTraffic = async () => {
    flash('normal', 800);
    const headers = getHeaders();
    const requests = Array.from({ length: 10 }).map(() =>
      fetch(`${GATEWAY_URL}/api/users`, { headers }).catch(() => {})
    );
    await Promise.allSettled(requests);
  };

  const triggerErrorSpike = async () => {
    setIsSpiking(true);
    flash('spike', 2500);

    if (sendCommand) {
      sendCommand('CHAOS_TRIGGER', { mode: 'SPIKE_500' });
    }

    // Wait 250ms for Redis to deliver to Gateway
    await new Promise((resolve) => setTimeout(resolve, 250));

    const headers = getHeaders();
    const requests = Array.from({ length: 5 }).map(() =>
      fetch(`${GATEWAY_URL}/api/users`, { headers }).catch(() => {})
    );
    await Promise.allSettled(requests);

    setTimeout(() => {
      if (sendCommand) {
        sendCommand('CHAOS_RESET');
      }
      setIsSpiking(false);
    }, 2000);
  };

  const triggerLatency = async () => {
    flash('latency', 4000);
    if (sendCommand) {
      sendCommand('CHAOS_TRIGGER', { mode: 'LATENCY', delayMs: 4000 });
    }

    fetch(`${GATEWAY_URL}/api/users`, { headers: getHeaders() }).catch(() => {});

    setTimeout(() => {
      if (sendCommand) {
        sendCommand('CHAOS_RESET');
      }
    }, 4500);
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
          sub="Sends 10 requests to /api/users"
          active={activeToggle === 'normal'}
          color="#4ADE80"
          onClick={fireNormalTraffic}
        />
        <Toggle
          label={isSpiking ? 'Spiking errors...' : 'Trigger 500 error spike'}
          sub="Forces 5 upstream failures"
          active={activeToggle === 'spike'}
          color="#F87171"
          disabled={isSpiking || !isConnected}
          onClick={triggerErrorSpike}
        />
        <Toggle
          label="Inject 4s latency"
          sub="Delays the next response by 4s"
          active={activeToggle === 'latency'}
          color="#FBBF24"
          disabled={!isConnected}
          onClick={triggerLatency}
        />
      </div>
    </div>
  );
};

export const ChaosControlPanel = memo(ChaosControlPanelComponent);