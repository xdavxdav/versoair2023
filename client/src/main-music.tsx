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

function showBootstrapState(title: string, message: string) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;background:#06020f;color:white;padding:24px;font-family:system-ui,sans-serif"><section style="max-width:440px;text-align:center"><h1 style="font-size:24px;margin:0 0 10px">${title}</h1><p style="color:#c4b5fd;line-height:1.6">${message}</p><button id="verso-retry" style="margin-top:20px;border:0;border-radius:10px;background:#8b5cf6;color:white;padding:12px 20px;font-weight:700;cursor:pointer">Retry</button></section></main>`;
  document
    .getElementById("verso-retry")
    ?.addEventListener("click", () => window.location.reload());
}

async function bootstrap() {
  const root = document.getElementById("root");
  if (!root) throw new Error("Verso Air music root element is missing");
  showBootstrapState("Loading Verso Air…", "Preparing Musical Universe");
  const timeout = window.setTimeout(() => {
    showBootstrapState(
      "Musical Universe could not start",
      "The application took too long to initialize. Check your connection and try again.",
    );
  }, BOOT_TIMEOUT_MS);

  try {
    const { default: App } = await import("./AppMusic");
    window.clearTimeout(timeout);
    createRoot(root).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>,
    );
  } catch (error) {
    window.clearTimeout(timeout);
    console.error("[Verso Air music bootstrap]", error);
    showBootstrapState(
      "Musical Universe could not start",
      "A frontend initialization error occurred. Retry the application or reload the page.",
    );
  }
}

bootstrap().catch((error) => {
  console.error("[Verso Air music bootstrap:fatal]", error);
  showBootstrapState(
    "Musical Universe could not start",
    "Please retry the application.",
  );
});

// Register Service Worker for PWA background audio + offline caching
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
