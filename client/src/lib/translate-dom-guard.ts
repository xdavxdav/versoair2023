// Google Translate replaces the text nodes React created with <font> wrappers.
// When React later removes a node, or inserts one next to it, the DOM throws
// "not a child of this node" and the error boundary replaces the whole page.
// Skipping exactly those calls (they would throw anyway) lets the rest of the
// update run. Any other DOM error still propagates unchanged.
// https://github.com/facebook/react/issues/11538

interface ChildHost {
  removeChild(child: unknown): unknown;
  insertBefore(node: unknown, reference: unknown): unknown;
}

const INSTALLED = "__translateDomGuardInstalled";

function isNodeLike(value: unknown): value is { parentNode: unknown } {
  return typeof value === "object" && value !== null && "parentNode" in value;
}

export function installTranslateDomGuard(
  host: ChildHost | undefined = typeof Node === "function"
    ? (Node.prototype as unknown as ChildHost)
    : undefined,
  warn: (message: string) => void = (message) => console.warn(message),
): boolean {
  if (!host || (host as unknown as Record<string, unknown>)[INSTALLED]) {
    return false;
  }

  const nativeRemoveChild = host.removeChild;
  const nativeInsertBefore = host.insertBefore;
  const warned = new Set<string>();
  const note = (method: string) => {
    if (warned.has(method)) return;
    warned.add(method);
    warn(
      `[translate-dom-guard] skipped ${method} on a node that moved (browser translation)`,
    );
  };

  host.removeChild = function (this: unknown, child: unknown) {
    if (isNodeLike(child) && child.parentNode !== this) {
      note("removeChild");
      return child;
    }
    return nativeRemoveChild.call(this, child);
  };

  host.insertBefore = function (
    this: unknown,
    node: unknown,
    reference: unknown,
  ) {
    if (isNodeLike(reference) && reference.parentNode !== this) {
      note("insertBefore");
      return node;
    }
    return nativeInsertBefore.call(this, node, reference);
  };

  Object.defineProperty(host, INSTALLED, { value: true });
  return true;
}
