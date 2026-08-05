import 'dotenv/config'
export const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-nexus-gate-key';

// 1. Structure of a Gateway Route
export interface RouteConfig {
  pathPrefix: string;   // Incoming request path to match (e.g., '/api/users')
  targets: string[];       // Backend service URL to proxy to (e.g., 'http://localhost:4001')
  rateLimit: { capacity: number; refillPerSec: number }; // Rate limiting configuration
  allowedRoles? : string[]
}

// 2. Define our active routing table
export const ROUTES: RouteConfig[] = [
  {
    pathPrefix: '/api/users',
    targets: ['http://localhost:4001/users', 'http://localhost:4003/users'],
    rateLimit: {capacity:10, refillPerSec: 0.1}
  },
  {
    pathPrefix: '/api/orders',
    targets: ['http://localhost:4002/orders'],
    rateLimit: {capacity: 10, refillPerSec: 0.1},
    allowedRoles: ['admin']
  },
];