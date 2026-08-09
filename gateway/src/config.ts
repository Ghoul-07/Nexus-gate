import 'dotenv/config'
export const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-nexus-gate-key';

// Read target base URLs from process.env if provided (via Docker), otherwise default to localhost
const USER_1 = process.env.USER1_TARGET || 'http://localhost:4001';
const USER_2 = process.env.USER2_TARGET || 'http://localhost:4003';
const ORDER_SVC = process.env.ORDER_TARGET || 'http://localhost:4002';

// 1. Structure of a Gateway Route
export interface RouteConfig {
  pathPrefix: string;   // Incoming request path to match (e.g., '/api/users')
  targets: string[];       // Backend service URL to proxy to
  rateLimit: { capacity: number; refillPerSec: number }; // Rate limiting configuration
  allowedRoles? : string[]
}

// 2. Define our active routing table
export const ROUTES: RouteConfig[] = [
  {
    pathPrefix: '/api/users',
    targets: [`${USER_1}/users`, `${USER_2}/users`],
    rateLimit: {capacity:10, refillPerSec: 0.1}
  },
  {
    pathPrefix: '/api/orders',
    targets: [`${ORDER_SVC}/orders`],
    rateLimit: {capacity: 10, refillPerSec: 0.1},
    allowedRoles: ['admin']
  },
];