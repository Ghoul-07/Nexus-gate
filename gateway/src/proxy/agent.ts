import http from 'http';
import https from 'https';

export interface AgentConfig {
  keepAlive?: boolean;
  keepAliveMsecs?: number;
  maxSockets?: number;
  maxFreeSockets?: number;
}

const DEFAULT_CONFIG: AgentConfig = {
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 100,      // Max concurrent sockets per host
  maxFreeSockets: 10,   // Sockets left open in free state
};

export const httpAgent = new http.Agent(DEFAULT_CONFIG);

export const httpsAgent = new https.Agent({
  ...DEFAULT_CONFIG,
  rejectUnauthorized: process.env.NODE_ENV === 'production'
});