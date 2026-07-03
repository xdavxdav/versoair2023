import { createRoot } from "react-dom/client";
import App from "./App";
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

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for PWA background audio + offline caching
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
