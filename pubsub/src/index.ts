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


//2. Initialize Redis Clients: Subscriber for telemetry, Publisher for incoming dashboard commands
const redisOptions = {
  url:REDIS_URL,
  socket: {
    tls:true,
    rejectUnauthorized:false
  }
} as const

const redisSubscriber = createClient(redisOptions)
const redisPublisher = createClient(redisOptions)

redisSubscriber.on('error', (err) => console.error('[Redis Error] Subscriber:', err));
redisPublisher.on('error', (err) => console.error('[Redis Error] Publisher:', err));

// Broadcast helper function to push updates to all active UI clients
const broadcastToDashboard = (data: any) => {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};

wss.on('connection', (ws) => {
  console.log('[WebSocket] React Control Plane connected');
  ws.send(JSON.stringify({ status: 'connected', message: 'Nexus-Gate Telemetry Stream Active' }));

  if(latestMetricsSnapshot){
    ws.send(JSON.stringify(latestMetricsSnapshot))
  }

  // --- BIDIRECTIONAL CONTROL PLANE: Receive commands from React Dashboard ---
  ws.on('message', async (rawMessage) => {
    try{
      const parsed = JSON.parse(rawMessage.toString())
      console.log('[WebSocket Command Received]:', parsed);

      // Forward chaos commands to the gateway via Redis/PubSub
      if (parsed.type === 'CHAOS_TRIGGER' || parsed.type === 'CHAOS_RESET') {
        await redisPublisher.publish('gateway-control', JSON.stringify(parsed));
      }
    }catch(err: any){
      console.error('[WebSocket] Failed to process message from client:', err.message);
    }
  })
});

const bootBroker = async () => {
  await Promise.all([redisSubscriber.connect(), redisPublisher.connect()])
  console.log('[Redis] Pub/Sub Subscriber and Publisher connected to Upstash Cloud ☁️');

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