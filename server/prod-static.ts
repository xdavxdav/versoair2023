import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  // Use process.cwd() which is always /app in Docker (WORKDIR /app)
  const distPath = path.join(process.cwd(), "dist", "public");

  console.log(`[STATIC] Serving static files from: ${distPath}`);
  console.log(`[STATIC] Directory exists: ${fs.existsSync(distPath)}`);

  if (fs.existsSync(distPath)) {
    try {
      const assets = fs.readdirSync(distPath);
      console.log(`[STATIC] Contents: ${assets.join(", ")}`);
    } catch (err) {
      console.warn("[STATIC] Could not list dist contents:", err);
    }
  }

  if (!fs.existsSync(distPath)) {
    console.error(
      `[STATIC] dist/public not found. Contents of cwd (${process.cwd()}):`,
    );
    try {
      console.error(fs.readdirSync(process.cwd()).join(", "));
    } catch (e) {
      console.error("Could not read cwd");
    }
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static assets with proper headers and max-age cache
  app.use(
    express.static(distPath, {
      maxAge: "1y",
      immutable: true,
      index: false, // Don't auto-serve index.html for directory requests
    }),
  );

  // SPA fallback — ONLY for requests that are NOT static assets
  // (i.e., navigation requests from the browser)
  app.use("*", (req, res, next) => {
    // If the request looks like a file (has a dot extension), skip fallback
    if (req.originalUrl.includes(".")) {
      return next();
    }

    // Inject runtime config (SIBLING_URL) into the HTML so the client
    // can discover the music app URL without hardcoding localhost.
    fs.readFile(path.join(distPath, "index.html"), "utf-8", (err, html) => {
      if (err) {
        console.error("[STATIC] Failed to read index.html:", err);
        return res.sendFile(path.join(distPath, "index.html"));
      }
      const siblingUrl = process.env.SIBLING_URL;
      const runtimeScript = siblingUrl
        ? `<script>window.__APP_CONFIG__=${JSON.stringify({ siblingUrl })};</script>\n  `
        : "";
      const injected = html.replace("</head>", `${runtimeScript}</head>`);
      res.set("Content-Type", "text/html");
      res.send(injected);
    });
  });
}
