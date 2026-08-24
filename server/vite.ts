import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import {
  createServer as createViteServer,
  createLogger,
  loadConfigFromFile,
} from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(
  app: Express,
  server: Server,
  configFile?: string,
) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  let resolvedConfig = viteConfig as any;
  if (configFile) {
    const loaded = await loadConfigFromFile(
      { command: "serve", mode: "development" },
      path.resolve(import.meta.dirname, "..", configFile),
    );
    if (loaded) resolvedConfig = loaded.config;
  }

  const vite = await createViteServer({
    ...resolvedConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        // Don't exit on Vite errors — let the server keep running
        console.error("[VITE ERROR]", msg);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Determine which HTML entry point to serve
  const htmlEntry = configFile?.includes("music") ? "music.html" : "index.html";

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Don't serve SPA HTML for API routes — let Express handle them
    // (/auth/* routes are frontend pages, not API endpoints)
    if (url.startsWith("/api")) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        htmlEntry,
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      // Inject runtime config so the frontend can read sibling URL without baking it at build time
      const siblingUrl = process.env.SIBLING_URL;
      if (siblingUrl) {
        const runtimeScript = `<script>window.__APP_CONFIG__=${JSON.stringify({ siblingUrl })};</script>`;
        template = template.replace("</head>", `${runtimeScript}\n  </head>`);
      }
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    const htmlPath = path.resolve(distPath, "index.html");
    let html = fs.readFileSync(htmlPath, "utf-8");
    const siblingUrl = process.env.SIBLING_URL;
    if (siblingUrl) {
      html = html.replace(
        "</head>",
        `<script>window.__APP_CONFIG__=${JSON.stringify({ siblingUrl })};</script>\n  </head>`,
      );
    }
    res.set("Content-Type", "text/html").send(html);
  });
}
