// 1. Structure of a Gateway Route
export interface RouteConfig {
  pathPrefix: string;   // Incoming request path to match (e.g., '/api/users')
  target: string[];       // Backend service URL to proxy to (e.g., 'http://localhost:4001')
  rateLimit: { capacity: number; refillPerSec: number }; // Rate limiting configuration
  allowedRoles? : string[]
}

// 2. Define our active routing table
export const ROUTES: RouteConfig[] = [
  {
    pathPrefix: '/api/users',
    target: ['http://localhost:4001/users', 'http://localhost:4003/users'],
    rateLimit: {capacity:20, refillPerSec: 2}
  },
  {
    pathPrefix: '/api/orders',
    target: ['http://localhost:4002/orders'],
    rateLimit: {capacity: 10, refillPerSec: 1},
    allowedRoles: ['admin']
  },
];