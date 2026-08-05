import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { RouteConfig } from '../config.js';
import type { DemoUser } from '../auth/users.js'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-nexus-gate-key';

export const authMiddleware = (route?: RouteConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header.',
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      // 1. Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as Omit<DemoUser, 'passwordHash'>;
      
      // 2. Attach user payload to request
      req.user = decoded;

      // 3. Enforce Role-Based Access Control (RBAC) if route defines allowedRoles
      if (route?.allowedRoles && route.allowedRoles.length > 0) {
        if (!route.allowedRoles.includes(decoded.role)) {
          return res.status(403).json({
            error: 'FORBIDDEN',
            message: `Access denied. Requires one of the following roles: [${route.allowedRoles.join(', ')}]`,
          });
        }
      }

      next();
    } catch (err) {
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'JWT verification failed or token has expired.',
      });
    }
  };
};