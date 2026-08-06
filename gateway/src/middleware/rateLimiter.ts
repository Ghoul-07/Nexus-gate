import type { Request, Response, NextFunction } from 'express';
import type { RouteConfig } from '../config.js';
import { telemetryPublisher } from '../services/telemetryPublisher.js';

interface Bucket {
  tokens: number;
  lastRefillTimestamp: number;
}

// In-memory store mapping key -> Bucket
const buckets = new Map<string, Bucket>();

export const rateLimiterMiddleware = (route: RouteConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    //  Keying Strategy: Rate limit per User ID (from authMiddleware), fallback to IP
    const clientId = req.user?.id || req.ip || 'anonymous';
    const bucketKey = `${clientId}:${route.pathPrefix}`;

    const clientIp = req.ip || req.socket.remoteAddress || 'unknown'
    
    const { capacity, refillPerSec } = route.rateLimit;
    const now = Date.now();


    //  Retrieve existing bucket or initialize a fresh full bucket
    let bucket = buckets.get(bucketKey);

    if (!bucket) {
      bucket = {
        tokens: capacity,
        lastRefillTimestamp: now,
      };
      buckets.set(bucketKey, bucket);
    } else {
      //  Lazy Refill: Calculate tokens accrued since last request
      const elapsedSeconds = (now - bucket.lastRefillTimestamp) / 1000;
      const tokensToAdd = elapsedSeconds * refillPerSec;

      bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefillTimestamp = now;
    }

    // Check if token is available
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1; // Consume 1 token

      // Set standard headers so clients know their quota status
      res.setHeader('X-RateLimit-Limit', capacity);
      res.setHeader('X-RateLimit-Remaining', Math.floor(bucket.tokens));

      return next();
    }

    // Rate limit exceeded! Reject with 429
    res.setHeader('X-RateLimit-Limit', capacity);
    res.setHeader('X-RateLimit-Remaining', 0);
    res.setHeader('Retry-After', Math.ceil(1 / refillPerSec));

    telemetryPublisher.emitRateLimitExceeded({
      route: req.originalUrl || req.path,
      clientIp,
      limit: capacity,
      windowMs: Math.ceil((1 / refillPerSec) * 1000)
    })
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded for route '${route.pathPrefix}'. Max capacity is ${capacity} requests with a refill rate of ${refillPerSec}/sec.`,
    });
  };
};