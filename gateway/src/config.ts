// 1. Structure of a Gateway Route
export interface RouteConfig {
  pathPrefix: string;   // Incoming request path to match (e.g., '/api/users')
  target: string;       // Backend service URL to proxy to (e.g., 'http://localhost:4001')
}

// 2. Define our active routing table
export const ROUTES: RouteConfig[] = [
  {
    pathPrefix: '/api/users',
    target: 'http://localhost:4001/users',
    
  },
  {
    pathPrefix: '/api/orders',
    target: 'http://localhost:4002/orders',
    
  },
];