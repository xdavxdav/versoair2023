import { HelmetProvider } from "react-helmet-async";
import { createRoot } from "react-dom/client";
import React from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

/**
 * 🛡️ Google Translate + React DOM compatibility patch.
 * Google Translate wraps text nodes in <font> tags, which breaks React's
 * virtual DOM reconciliation (insertBefore / removeChild fail because the
 * target node is no longer a direct child). This patch silently handles
 * the mismatch instead of crashing.
 * @see https://github.com/facebook/react/issues/11538
 */
if (typeof Node !== "undefined" && Node.prototype) {
  const origInsertBefore = Node.prototype.insertBefore;
  (Node.prototype as any).insertBefore = function <T extends Node>(
    newNode: T,
    refNode: Node | null,
  ): T {
    if (refNode && refNode.parentNode !== this) {
      // Google Translate moved refNode into a <font> wrapper — skip gracefully
      return newNode;
    }
    return origInsertBefore.call(this, newNode, refNode) as T;
  };

  const origRemoveChild = Node.prototype.removeChild;
  (Node.prototype as any).removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      // Same issue — node was reparented by Google Translate
      return child;
    }
    return origRemoveChild.call(this, child) as T;
  };
}

const BOOT_TIMEOUT_MS = 15000;

function showBootstrapState(title: string, message: string, retry = true) {
  const root = document.getElementById("root");
  if (!root) {
    document.body.innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;background:#0f172a;color:white;padding:24px;font-family:system-ui,sans-serif"><section style="max-width:440px;text-align:center"><h1>${title}</h1><p style="color:#cbd5e1">${message}</p></section></main>`;
    return;
  }

  root.innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;background:linear-gradient(135deg,#0f172a,#1e293b);color:white;padding:24px;font-family:system-ui,sans-serif"><section style="max-width:440px;text-align:center"><div style="width:48px;height:48px;margin:0 auto 20px;border:3px solid rgba(255,255,255,.25);border-top-color:#34d399;border-radius:50%;animation:spin 1s linear infinite"></div><h1 style="font-size:24px;margin:0 0 10px">${title}</h1><p style="color:#cbd5e1;line-height:1.6">${message}</p>${retry ? '<button id="verso-retry" style="margin-top:20px;border:0;border-radius:10px;background:#10b981;color:#06281d;padding:12px 20px;font-weight:700;cursor:pointer">Retry</button>' : ""}</section></main><style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
  document
    .getElementById("verso-retry")
    ?.addEventListener("click", () => window.location.reload());
}

async function bootstrap() {
  const root = document.getElementById("root");
  if (!root) throw new Error("Verso Air root element is missing");

  showBootstrapState("Loading Verso Air…", "Preparing the application");
  const timeout = window.setTimeout(() => {
    showBootstrapState(
      "Verso Air could not start",
      "The application took too long to initialize. Check your connection and try again.",
    );
  }, BOOT_TIMEOUT_MS);

  try {
    const { default: App } = await import("./App");
    window.clearTimeout(timeout);
    createRoot(root).render(
      <ErrorBoundary>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </ErrorBoundary>,
    );
  } catch (error) {
    window.clearTimeout(timeout);
    console.error("[Verso Air bootstrap]", error);
    showBootstrapState(
      "Verso Air could not start",
      "A frontend initialization error occurred. Retry the application or reload the page.",
    );
  }
}

bootstrap().catch((error) => {
  console.error("[Verso Air bootstrap:fatal]", error);
  showBootstrapState(
    "Verso Air could not start",
    "Please retry the application.",
  );
});

// Register Service Worker for PWA background audio + offline caching
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
