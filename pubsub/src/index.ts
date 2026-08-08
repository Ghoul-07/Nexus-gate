import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize the WebSocket server
const wss = new WebSocketServer({ server });

app.use(express.json());

// Track connected clients
const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  console.log('🔌 New React Dashboard client connected to Pub/Sub');
  clients.add(ws);

  ws.on('close', () => {
    clients.delete(ws);
    console.log('❌ Client disconnected');
  });
});

// The Gateway will POST telemetry events here
app.post('/publish', (req, res) => {
  const eventPayload = req.body;

  // Broadcast the event to all connected UI clients
  const message = JSON.stringify(eventPayload);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });

  res.status(200).send({ status: 'Event broadcasted' });
});

const PORT = process.env.PUBSUB_PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Pub/Sub Message Broker running on port ${PORT}`);
});