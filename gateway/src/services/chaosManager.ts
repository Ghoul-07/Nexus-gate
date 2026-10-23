import { createClient } from 'redis';
import 'dotenv/config';

export type ChaosMode = 'NORMAL' | 'SPIKE_500' | 'LATENCY';

export interface ChaosConfig {
  mode: ChaosMode;
  targetOrigin?: string; // Optional: target a specific origin like 'http://localhost:4001'
  delayMs?: number;      // Used when mode is 'LATENCY'
}

let activeChaos: ChaosConfig = {
  mode: 'NORMAL',
};

const REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
  const chaosSubscriber = createClient({
    url: REDIS_URL,
    socket: {
      tls: true,
      rejectUnauthorized: false
    }
  });

  chaosSubscriber.on('error', (err) => console.error('[Redis Error] Chaos Subscriber:', err));

  chaosSubscriber.connect().then(async () => {
    console.log('[Redis] Chaos Manager subscribed to gateway-control ⚡');

    await chaosSubscriber.subscribe('gateway-control', (message) => {
      try {
        const command = JSON.parse(message);
        console.log('[Gateway Chaos Command Received]:', command);

        if (command.type === 'CHAOS_TRIGGER') {
          activeChaos = {
            mode: command.payload?.mode || 'NORMAL',
            targetOrigin: command.payload?.targetOrigin,
            delayMs: command.payload?.delayMs || 5000,
          };
          console.log(` [Chaos Engaged] Mode: ${activeChaos.mode}`);
        } else if (command.type === 'CHAOS_RESET') {
          activeChaos = { mode: 'NORMAL' };
          console.log(' [Chaos Disengaged] System returned to NORMAL');
        }
      } catch (err: any) {
        console.error('[Chaos Manager] Failed to parse command:', err.message);
      }
    });
  }).catch(console.error);
}

export function getActiveChaos(): ChaosConfig {
  return activeChaos;
}

export function resetChaos(): void {
  activeChaos = { mode: 'NORMAL' };
}