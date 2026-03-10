import dotenv from "dotenv";
dotenv.config();

// ─── Startup security checks (must run before anything else) ──────────────────
if (!process.env.JWT_SECRET) {
  console.error(
    "❌ [FATAL] JWT_SECRET environment variable is not set. Refusing to start.",
  );
  process.exit(1);
}
if (
  process.env.NODE_ENV === "production" &&
  process.env.JWT_SECRET.includes("dev_secret")
) {
  console.error(
    "❌ [FATAL] Default dev JWT_SECRET detected in production. Refusing to start.",
  );
  process.exit(1);
}
if (!process.env.SESSION_SECRET) {
  console.error(
    "❌ [FATAL] SESSION_SECRET environment variable is not set. Refusing to start.",
  );
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
import { startDigestWorker } from "./services/digest-worker";
import { setupSubscriptionExpiryCron } from "./services/subscription-expiry";
import { csrfSetCookie, csrfProtect } from "./middleware/csrf";
import { globalAuthGate } from "./middleware/auth";

const app = express();

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
            "https://www.googletagmanager.com",
            "https://cdn.jsdelivr.net",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          imgSrc: ["'self'", "data:", "https:"],
          // ws: is needed for Vite HMR in development
          connectSrc: ["'self'", "ws:", "wss:", "https:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "https:", "data:"],
          frameSrc: ["'none'"],
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
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));

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
  console.log("🔧 [SERVER] Starting server initialization...");

  // Initialize email transporter for notifications
  initializeEmailTransporter();
  console.log("✅ [SERVER] Email service initialized");

  // Register all API routes FIRST (handles /api/* and POST /auth/*)
  await registerRoutes(app);
  console.log("✅ [SERVER] Routes registered successfully");

  // Setup category integrity check (runs daily + on startup)
  setupCategoryIntegrityCheck();
  console.log("✅ [SERVER] Category integrity check scheduled");

  // Start digest worker for batched email delivery
  startDigestWorker();
  console.log(
    "✅ [SERVER] Digest worker started (hourly email queue processor)",
  );

  // Setup subscription expiry check (runs daily)
  setupSubscriptionExpiryCron();
  console.log("✅ [SERVER] Subscription expiry cron scheduled");

  // Error middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("❌ [SERVER] Unhandled error:", err.message || err);
    res.status(status).json({ message });
  });

  // Create an HTTP server from the Express app so we can pass the
  // proper Server instance to setupVite (it expects a Node HTTP Server).
  const server = http.createServer(app);

  // Initialize Socket.io for real-time notifications
  initializeSocket(server);
  console.log("✅ [SERVER] Socket.io initialized for real-time notifications");

  // Setup Vite/static LAST — SPA fallback catches unmatched GET routes
  // (like /auth/signin, /dashboard, etc.) and serves index.html
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
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
      console.log("🚀 [SERVER] Server running on port", port);
      console.log("🔗 [SERVER] Test endpoints:");
      console.log("   - http://localhost:" + port + "/api/simple-test");
      console.log("   - http://localhost:" + port + "/api/status");
      console.log("   - http://localhost:" + port + "/api/countries");
      console.log("🔒 [SERVER] CORS enabled for:", allowedOrigins);
      console.log("🌍 [SERVER] NODE_ENV:", process.env.NODE_ENV);
      console.log("🔑 [SERVER] CORS_ORIGIN env:", process.env.CORS_ORIGIN);
      log(`serving on port ${port}`);
    },
  );
})();
