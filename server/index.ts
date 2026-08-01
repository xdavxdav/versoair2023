import dotenv from "dotenv";
dotenv.config();

// ─── Set sibling URL for runtime injection into HTML ─────────────────────────
// CRITICAL: Prevents localhost:5004 from leaking to production users on Render
// Priority: SIBLING_URL > MUSIC_APP_URL > PRODUCTION_URL/APP_PUBLIC_URL (fallback)
const isProdEnv = process.env.NODE_ENV === "production";
if (!process.env.SIBLING_URL) {
  // Try MUSIC_APP_URL first, then fallback to PRODUCTION_URL/APP_PUBLIC_URL
  const musicUrl =
    process.env.MUSIC_APP_URL ||
    process.env.PRODUCTION_URL ||
    process.env.APP_PUBLIC_URL ||
    (isProdEnv
      ? "https://verso-air-online.onrender.com"
      : "http://localhost:5004");

  // On production, append /music if not already present
  if (isProdEnv && musicUrl && !musicUrl.includes("/music")) {
    process.env.SIBLING_URL = musicUrl + "/music";
  } else {
    process.env.SIBLING_URL = musicUrl;
  }
}

// ─── Startup security checks (must run before anything else) ──────────────────
const isProd = isProdEnv;

const requiredEnvVars = ["JWT_SECRET", "SESSION_SECRET", "DATABASE_URL"];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(
      `[FATAL] ${key} environment variable is not set. Refusing to start.`,
    );
    process.exit(1);
  }
}

if (isProd && process.env.JWT_SECRET!.includes("dev_secret")) {
  console.error(
    "[FATAL] Default dev JWT_SECRET detected in production. Refusing to start.",
  );
  process.exit(1);
}
if (isProd && process.env.JWT_SECRET!.length < 32) {
  console.error(
    "[FATAL] JWT_SECRET is too short. Must be at least 32 characters.",
  );
  process.exit(1);
}
if (isProd && !process.env.CORS_ORIGIN) {
  console.error("[FATAL] CORS_ORIGIN must be set in production.");
  process.exit(1);
}
if (isProd && !process.env.PRODUCTION_URL) {
  console.error("[FATAL] PRODUCTION_URL must be set in production.");
  process.exit(1);
}

import express, { Request, Response, NextFunction } from "express";
import http from "http";
// @ts-ignore
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./prod-static";
import { setupCategoryIntegrityCheck } from "./services/category-integrity-check";
import { initializeSocket } from "./websocket/socket-config";
import { initializeEmailTransporter } from "./services/email-service";
import { ensureAllTables } from "./services/ensure-tables";
import { createLogger } from "./utils/logger";

const serverLog = createLogger("server");
import { startDigestWorker } from "./services/digest-worker";
import { setupSubscriptionExpiryCron } from "./services/subscription-expiry";
import { setupRoyaltyEngine } from "./services/royalty-engine";
import { setupJournalCron } from "./services/journal-cron";
import { setupNewsletterCron } from "./services/newsletter-cron";
import { setupMarketplaceAutoApprove } from "./services/marketplace-auto-approve";
import { csrfSetCookie, csrfProtect } from "./middleware/csrf";
import { globalAuthGate } from "./middleware/auth";

const app = express();

process.on("unhandledRejection", (reason) => {
  serverLog.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  serverLog.error("Uncaught exception:", error);
});

// ─── Security headers (helmet) ────────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== "production";

// Disable all security headers in development to prevent TLS/HTTPS issues with localhost
if (!isDev) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https://www.googletagmanager.com",
            "https://cdn.jsdelivr.net",
            // Google Translate engine scripts
            "https://translate.google.com",
            "https://translate.googleapis.com",
            "https://translate-pa.googleapis.com",
            "https://www.gstatic.com",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            // Google Translate injects inline styles + sheets
            "https://translate.googleapis.com",
            "https://www.gstatic.com",
          ],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: [
            "'self'",
            "ws:",
            "wss:",
            "https:",
            // Google Translate API calls
            "https://translate.googleapis.com",
            "https://translate-pa.googleapis.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "https:", "data:"],
          // Google Translate needs iframes for inter-frame communication
          frameSrc: ["https://translate.google.com", "https://www.gstatic.com"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? (process.env.CORS_ORIGIN || "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    : [
        "http://localhost:5003",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:5173", // Vite dev server default port
        "http://10.0.0.93:5003", // Local network access
      ];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  }),
);

// ─── Cookie parser (needed for HttpOnly auth cookies) ─────────────────────────
app.use(cookieParser());

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// ─── CSRF protection ──────────────────────────────────────────────────────────
app.use(csrfSetCookie);
app.use(csrfProtect);

// ─── 🔒 GLOBAL AUTH GATE — every request must be authenticated ────────────────
// Only whitelisted paths (login, register, health) are exempt.
// Superuser gets unrestricted free pass on all routes.
app.use(globalAuthGate);

// ---------- Logging middleware ----------
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: any = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    // Call with only the body to satisfy Response.json typing (it accepts a single optional body arg)
    return originalResJson.call(res, bodyJson);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;

    if (path.startsWith("/api")) {
      let line = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      if (capturedJsonResponse) {
        line += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (line.length > 80) {
        line = line.slice(0, 79) + "…";
      }

      log(line);
    }
  });

  next();
});

// ---------- MAIN SERVER BOOTSTRAP ----------
(async () => {
  serverLog.info("Starting server initialization...");

  // Initialize email transporter for notifications
  await initializeEmailTransporter();
  serverLog.info("Email service initialized");

  // Ensure ALL schema tables exist (critical for Neon/Render fresh deploys)
  await ensureAllTables();
  serverLog.info("Database tables verified");

  // Register all API routes FIRST (handles /api/* and POST /auth/*)
  await registerRoutes(app);
  serverLog.info("Routes registered successfully");

  // Setup category integrity check (runs daily + on startup)
  setupCategoryIntegrityCheck();
  serverLog.info("Category integrity check scheduled");

  // Start digest worker for batched email delivery
  startDigestWorker();
  serverLog.info("Digest worker started (hourly email queue processor)");

  // Setup subscription expiry check (runs daily)
  setupSubscriptionExpiryCron();
  serverLog.info("Subscription expiry cron scheduled");

  // Setup StreamRoyale royalty distribution engine (weekly Monday 06:00 UTC)
  setupRoyaltyEngine();
  serverLog.info("StreamRoyale royalty engine started");

  // Setup marketing cron jobs (journal generation + newsletter dispatch)
  setupJournalCron();
  serverLog.info("Journal cron scheduled (weekly + monthly)");

  setupNewsletterCron();
  serverLog.info("Newsletter cron scheduled (hourly)");

  // Setup marketplace auto-approve (approves pending listings after 24h)
  setupMarketplaceAutoApprove();
  serverLog.info("Marketplace auto-approve cron scheduled (hourly)");

  // Error middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    serverLog.error("Unhandled error:", err.message || err);
    res.status(status).json({ message });
  });

  // Create an HTTP server from the Express app so we can pass the
  // proper Server instance to setupVite (it expects a Node HTTP Server).
  const server = http.createServer(app);

  // Initialize Socket.io for real-time notifications
  initializeSocket(server);
  serverLog.info("Socket.io initialized for real-time notifications");

  // Setup Vite/static LAST — SPA fallback catches unmatched GET routes
  // (like /auth/signin, /dashboard, etc.) and serves index.html
  // Explicitly gate on NODE_ENV so bundled production build never tries to
  // resolve the vite dev module (which is excluded from the bundle).
  if (
    process.env.NODE_ENV !== "production" &&
    app.get("env") === "development"
  ) {
    try {
      const { setupVite } = await import("./vite");
      await setupVite(app, server);
    } catch (err) {
      serverLog.warn(
        "Vite dev middleware unavailable, falling back to static",
        { err: (err as Error).message },
      );
      serveStatic(app);
    }
  } else {
    serveStatic(app);
  }

  // ---------- START SERVER ----------
  const port = parseInt(process.env.PORT || "5003", 10);

  server.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      serverLog.info(`Server running on port ${port}`);
      serverLog.info(`CORS enabled for: ${allowedOrigins}`);
      serverLog.info(`NODE_ENV: ${process.env.NODE_ENV}`);
      log(`serving on port ${port}`);
    },
  );
})().catch((err) => {
  serverLog.error("FATAL: Server failed to start:", err);
  process.exit(1);
});
