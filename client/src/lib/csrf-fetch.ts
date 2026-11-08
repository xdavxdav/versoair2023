// The API rejects same-origin POST/PUT/PATCH/DELETE requests that lack an
// x-csrf-token header (403 CSRF_VALIDATION_FAILED). Many call sites still use a
// bare fetch(), so their actions failed with no visible result. Wrapping
// window.fetch once adds the header for them. The server check is unchanged,
// and the token is never sent to another origin.

import { getCsrfToken, initializeCsrfToken } from "./auth";

const CSRF_HEADER = "x-csrf-token";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface CsrfFetchDeps {
  origin: string;
  readToken: () => string | null;
  loadToken: () => Promise<string | null>;
}

function asRequest(input: RequestInfo | URL): Request | null {
  return typeof Request !== "undefined" && input instanceof Request
    ? input
    : null;
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  return (init?.method ?? asRequest(input)?.method ?? "GET").toUpperCase();
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function isSameOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url, origin).origin === origin;
  } catch {
    return false;
  }
}

export function createCsrfFetch(
  nativeFetch: FetchLike,
  deps: CsrfFetchDeps,
): FetchLike {
  let pendingLoad: Promise<string | null> | null = null;

  const resolveToken = async (): Promise<string | null> => {
    const known = deps.readToken();
    if (known) return known;
    // Concurrent requests share one token fetch.
    pendingLoad ??= deps
      .loadToken()
      .catch(() => null)
      .finally(() => {
        pendingLoad = null;
      });
    return (await pendingLoad) ?? deps.readToken();
  };

  return async (input, init) => {
    if (
      !MUTATING_METHODS.has(methodOf(input, init)) ||
      !isSameOrigin(urlOf(input), deps.origin)
    ) {
      return nativeFetch(input, init);
    }

    const headers = new Headers(init?.headers ?? asRequest(input)?.headers);
    // A blank value (e.g. read from a missing meta tag) always fails the
    // server check, so it counts as unset.
    if (headers.get(CSRF_HEADER)?.trim()) return nativeFetch(input, init);

    const token = await resolveToken();
    if (!token) return nativeFetch(input, init);

    headers.set(CSRF_HEADER, token);
    return nativeFetch(input, { ...init, headers });
  };
}

const INSTALLED = "__csrfFetchInstalled";

export function installCsrfFetch(): void {
  if (typeof window === "undefined" || typeof window.fetch !== "function") {
    return;
  }
  if ((window.fetch as unknown as Record<string, unknown>)[INSTALLED]) return;

  const wrapped = createCsrfFetch(window.fetch.bind(window), {
    origin: window.location.origin,
    readToken: getCsrfToken,
    loadToken: initializeCsrfToken,
  });
  window.fetch = Object.assign(wrapped, { [INSTALLED]: true });
}
