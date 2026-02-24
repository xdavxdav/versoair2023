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

  if (!fs.existsSync(distPath)) {
    // Log all available dirs to help debug
    console.error(`[STATIC] dist/public not found. Contents of cwd (${process.cwd()}):`);
    try {
      console.error(fs.readdirSync(process.cwd()).join(", "));
    } catch (e) {
      console.error("Could not read cwd");
    }
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // SPA fallback — serve index.html for any route not matched by static files
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
