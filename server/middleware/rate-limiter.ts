import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

/**
 * Rate Limiter Middleware
 * Prevents spam on connection requests and other sensitive endpoints
 * Uses memory store for single-server deployments
 * For serverless/distributed: use Upstash Redis backend
 */

// Connection request rate limiter: max 5 requests per hour per user
export const connectionRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: "Too many connection requests. Please try again after 1 hour.",
    retryAfter: "1 hour",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    console.warn(
      `[RATE_LIMIT] Connection request limit exceeded for user: ${req.ip}`,
    );
    res.status(429).json({
      error: "Too many connection requests",
      message: "You can send a maximum of 5 connection requests per hour",
      retryAfter: "1 hour",
    });
  },
  // Use the ipKeyGenerator helper for proper IPv6 support
  skip: (req: Request) => {
    // For userId-based rate limiting, extract from request
    // The default keyGenerator handles IPv6 properly
    return false;
  },
});

// Profile update rate limiter: max 10 updates per hour
export const profileUpdateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: "Too many profile updates. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.warn(
      `[RATE_LIMIT] Profile update limit exceeded for user: ${req.ip}`,
    );
    res.status(429).json({
      error: "Too many profile updates",
      message: "You can update your profile a maximum of 10 times per hour",
      retryAfter: "1 hour",
    });
  },
});

// Login attempt rate limiter: max 5 attempts per 15 minutes
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Too many login attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    console.warn(`[RATE_LIMIT] Login attempt limit exceeded for: ${req.ip}`);
    res.status(429).json({
      error: "Too many login attempts",
      message:
        "Your account has been temporarily locked. Please try again in 15 minutes.",
      retryAfter: "15 minutes",
    });
  },
});

// Registration rate limiter: max 10 new accounts per hour per IP
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.warn(`[RATE_LIMIT] Registration limit exceeded for: ${req.ip}`);
    res.status(429).json({
      success: false,
      message:
        "Too many accounts created from this IP. Please try again later.",
    });
  },
});

// Forgot-password rate limiter: max 5 requests per hour per IP
// Prevents email flooding attacks
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.warn(`[RATE_LIMIT] Forgot-password limit exceeded for: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many password reset requests. Please try again in an hour.",
    });
  },
});

// Generic API rate limiter: max 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.warn(`[RATE_LIMIT] API rate limit exceeded for: ${req.ip}`);
    res.status(429).json({
      error: "Rate limit exceeded",
      message: "Too many requests. Please slow down.",
      retryAfter: "15 minutes",
    });
  },
});

// AI endpoint rate limiter: max 30 requests per 5 minutes per IP
// Prevents prompt-abuse, server hammering, and LLM cost runaway
export const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    console.warn(`[RATE_LIMIT] AI rate limit exceeded for: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: "Too many AI requests. Please wait a moment and try again.",
      retryAfter: "5 minutes",
    });
  },
});

// Marketplace messaging limiter: max 40 messages/conversations per hour per user
// Spam control only — NOT a paywall. Buyer<->seller messaging stays free for all tiers.
export const marketplaceMessageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.userId;
    return userId ? `mp-user-${userId}` : (req.ip as string);
  },
  handler: (req: Request, res: Response) => {
    console.warn(
      `[RATE_LIMIT] Marketplace message limit exceeded for: ${(req as any).user?.userId || req.ip}`,
    );
    res.status(429).json({
      success: false,
      error:
        "You're sending messages too fast. Please slow down and try again shortly.",
    });
  },
});

// Fan-chat slow mode: 2 messages per minute per user (== 30s cooldown).
// Paid tiers (essential+) skip the limit — Phase 1 plan: "free for all, cooldown removed for subscribers".
export const fanChatSlowMode = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    return userId ? `fan-user-${userId}` : (req.ip as string);
  },
  skip: (req: Request) => {
    const user = (req as any).user;
    if (!user) return false;
    if (user.role === "superuser") return true;
    const tier = user.subscriptionTier;
    return (
      tier === "essential" ||
      tier === "verified" ||
      tier === "max" ||
      tier === "enterprise"
    );
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error:
        "Slow mode: please wait ~30 seconds between messages. Subscribers post without cooldown.",
      slowMode: true,
      upgradeAvailable: true,
    });
  },
});

/**
 * For serverless deployments (Vercel, AWS Lambda, etc.),
 * use Upstash Redis for rate limiting persistence:
 *
 * npm install @upstash/ratelimit redis
 *
 * Then use:
 * import { Ratelimit } from "@upstash/ratelimit";
 * import { Redis } from "@upstash/redis";
 *
 * const redis = new Redis({
 *   url: process.env.UPSTASH_REDIS_REST_URL,
 *   token: process.env.UPSTASH_REDIS_REST_TOKEN,
 * });
 *
 * export const connectionRequestLimiter = new Ratelimit({
 *   redis: Redis.fromEnv(),
 *   limiter: Ratelimit.slidingWindow(5, "1 h"),
 *   analytics: true,
 * });
 */

console.log("[RATE_LIMIT] Rate limiters initialized (memory store)");
console.log(
  "[RATE_LIMIT] For production serverless: Configure Upstash Redis in .env",
);
