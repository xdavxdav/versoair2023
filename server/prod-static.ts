import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { pool } from "./db";
import { injectBusinessRouteSeoMeta } from "./utils/business-route-seo";
import { publicBusinessVisibilitySql } from "./utils/business-visibility";
import { injectRouteSeoMeta } from "./utils/route-seo-meta";

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
      setHeaders: (res, filePath) => {
        if (
          filePath.endsWith("index.html") ||
          filePath.endsWith("/sw.js") ||
          filePath.endsWith("/service-worker.js")
        ) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      },
    }),
  );

  // SPA fallback — ONLY for requests that are NOT static assets
  // (i.e., navigation requests from the browser)
  app.use("*", (req, res, next) => {
    const acceptsHtml = req.accepts("html") === "html";
    const isNavigation = req.method === "GET" || req.method === "HEAD";

    // APIs and non-HTML requests must keep their normal 404 behavior. A valid
    // SPA route may contain dots in a slug, so the URL itself is not enough to
    // identify a static asset.
    if (
      !isNavigation ||
      req.path.startsWith("/api/") ||
      req.path.startsWith("/assets/") ||
      !acceptsHtml
    ) {
      return next();
    }

    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.vary("Accept");

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
      let injected = html.replace("</head>", `${runtimeScript}</head>`);

      // Crawlers (Facebook/WhatsApp/Slack/etc.) require absolute og:image/twitter:image URLs.
      const origin = (
        process.env.PRODUCTION_URL ||
        process.env.APP_PUBLIC_URL ||
        `${req.protocol}://${req.get("host")}`
      ).replace(/\/+$/, "");
      injected = injected.replace(
        /(property="og:image"\s+content=")\/([^"]+)"/,
        `$1${origin}/$2"`,
      );
      injected = injected.replace(
        /(name="twitter:image"\s+content=")\/([^"]+)"/,
        `$1${origin}/$2"`,
      );
      injected = injected.replace(
        /(property="og:url"\s+content=")\/?([^"]*)"/,
        `$1${origin}${req.originalUrl}"`,
      );

      const businessMatch = req.path.match(/^\/business\/(\d+)\/?$/);
      if (!businessMatch) {
        // Last, so canonical www URLs are not rewritten to the runtime origin above.
        injected = injectRouteSeoMeta(injected, req.originalUrl.split("?")[0]);
        res.set("Content-Type", "text/html").send(injected);
        return;
      }

      const businessId = Number(businessMatch[1]);
      pool
        .query(
          `SELECT b.id, b.name, b.description, b.address, b.city, b.country_code,
                  c.name AS country_name, bc.name AS category_name, b.phone,
                  b.email, b.website, b.rating, b.reviews, b.latitude,
                  b.longitude, b.logo_url
           FROM businesses b
           LEFT JOIN business_categories bc ON bc.id = b.category_id
           LEFT JOIN countries c ON c.code = b.country_code
           WHERE b.id = $1 AND ${publicBusinessVisibilitySql("b")}`,
          [businessId],
        )
        .then(({ rows }) => {
          res.set("Content-Type", "text/html");
          if (rows.length === 0) {
            res.status(404).send(injected);
            return;
          }

          const business = rows[0];
          const seoHtml = injectBusinessRouteSeoMeta(injected, {
            id: Number(business.id),
            name: business.name,
            description: business.description,
            category: business.category_name,
            city: business.city,
            country: business.country_name,
            countryCode: business.country_code,
            address: business.address,
            phone: business.phone,
            email: business.email,
            website: business.website,
            rating: business.rating == null ? undefined : Number(business.rating),
            reviewCount:
              business.reviews == null ? undefined : Number(business.reviews),
            latitude:
              business.latitude == null ? undefined : Number(business.latitude),
            longitude:
              business.longitude == null ? undefined : Number(business.longitude),
            imageUrl: business.logo_url,
          });
          res.send(seoHtml);
        })
        .catch((error) => {
          console.error(
            `[STATIC] Business SEO lookup failed for id ${businessId}:`,
            error,
          );
          res.status(503).type("text/html").send(injected);
        });
    });
  });
}
