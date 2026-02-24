import { Request, Response, NextFunction } from "express";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
}

const store = new Map<
  string,
  {
    count: number;
    resetTime: number;
  }
>();

/**
 * Simple in-memory rate limiter middleware
 * For production, use redis-based solution like express-rate-limit
 */
export function rateLimit(config: RateLimitConfig) {
  const { windowMs, maxRequests, message = "Too many requests" } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();

    let record = store.get(key);

    // Reset if window has passed
    if (!record || record.resetTime < now) {
      record = { count: 0, resetTime: now + windowMs };
      store.set(key, record);
    }

    record.count++;

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, maxRequests - record.count),
    );
    res.setHeader(
      "X-RateLimit-Reset",
      new Date(record.resetTime).toISOString(),
    );

    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        status: 429,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message,
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        },
      });
    }

    next();
  };
}

/**
 * Clean up rate limit store periodically
 */
export function cleanupRateLimitStore() {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetTime < now) {
        store.delete(key);
      }
    }
  }, 60000); // Cleanup every minute
}
