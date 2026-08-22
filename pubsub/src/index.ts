import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from 'redis';
import 'dotenv/config';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.error("❌ CRITICAL: REDIS_URL is missing from pubsub/.env");
  process.exit(1);
}

let latestMetricsSnapshot: any = null

// 1. Initialize WebSocket Server for the React Dashboard
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  console.log('[WebSocket] React Control Plane connected');
  ws.send(JSON.stringify({ status: 'connected', message: 'Nexus-Gate Telemetry Stream Active' }));

  if(latestMetricsSnapshot){
    ws.send(JSON.stringify(latestMetricsSnapshot))
  }
});

// Broadcast helper function
const broadcastToDashboard = (data: any) => {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};

// 2. Initialize Redis Subscriber
const redisSubscriber = createClient({ 
  url: REDIS_URL,
  socket: {
    tls: true,
    rejectUnauthorized: false
  }
});

redisSubscriber.on('error', (err) => console.error('[Redis Error] Subscriber:', err));
redisSubscriber.on('connect', () => console.log('[Redis] Pub/Sub Subscriber connected to Upstash Cloud ☁️'));

const bootBroker = async () => {
  await redisSubscriber.connect();

  // 3. Subscribe to Gateway Telemetry Events
  await redisSubscriber.subscribe('gateway-telemetry', (message) => {
    const eventData = JSON.parse(message);
    broadcastToDashboard(eventData);
  });

  // 4. Subscribe to Gateway Metrics Updates
  await redisSubscriber.subscribe('gateway-metrics', (message) => {
    const metricsData = JSON.parse(message);
    latestMetricsSnapshot = metricsData
    broadcastToDashboard(metricsData);
  });

  console.log(`[Nexus-PubSub] WebSocket relay actively listening on ws://localhost:${PORT}`);
};

bootBroker().catch(console.error);