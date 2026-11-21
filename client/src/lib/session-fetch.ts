/**
 * Shared `/auth/session` fetcher with in-flight coalescing and a brief cache.
 *
 * Multiple components mount on `/` (AuthProvider, Navbar, MobileMenuBubble,
 * Home) and ask for the current session in the same render tick. Coalescing
 * keeps initial page load to a single `GET /auth/session` request while
 * explicit auth transitions (`login`, `logout`, `restoreAuth`, `refetch`)
 * invalidate or force-bypass the cache immediately.
 */

export interface AuthSessionResponse {
  ok: boolean;
  status: number;
  data: Record<string, unknown> | null;
}

export interface FetchAuthSessionOptions {
  /** Bypass any in-flight or cached response and hit `/auth/session` directly. */
  force?: boolean;
  /** Optional legacy Bearer token to include alongside the HttpOnly cookie. */
  token?: string | null;
  /** Per-caller abort signal (cancels waiting for this caller without aborting peers). */
  signal?: AbortSignal;
}

const CACHE_TTL_MS = 1500;

interface CacheEntry {
  key: string;
  value: AuthSessionResponse;
  expiresAt: number;
}

let inFlightKey: string | null = null;
let inFlightPromise: Promise<AuthSessionResponse> | null = null;
let cachedEntry: CacheEntry | null = null;
let generation = 0;

function raceWithSignal<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    return Promise.reject(
      signal.reason ?? new DOMException("Aborted", "AbortError"),
    );
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      },
    );
  });
}

async function performSessionFetch(
  token?: string | null,
): Promise<AuthSessionResponse> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch("/auth/session", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  });

  let data: Record<string, unknown> | null = null;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export function invalidateAuthSessionCache(): void {
  generation += 1;
  inFlightKey = null;
  inFlightPromise = null;
  cachedEntry = null;
}

export function fetchAuthSession(
  options: FetchAuthSessionOptions = {},
): Promise<AuthSessionResponse> {
  const { force = false, token = null, signal } = options;
  const key = token ? `bearer:${token}` : "cookie";

  if (!force) {
    if (
      cachedEntry &&
      cachedEntry.key === key &&
      Date.now() < cachedEntry.expiresAt
    ) {
      return raceWithSignal(Promise.resolve(cachedEntry.value), signal);
    }
    if (inFlightPromise && inFlightKey === key) {
      return raceWithSignal(inFlightPromise, signal);
    }
  } else {
    invalidateAuthSessionCache();
  }

  const requestGeneration = generation;
  const promise = performSessionFetch(token)
    .then((result) => {
      if (generation === requestGeneration) {
        if (result.ok || result.status === 401) {
          cachedEntry = {
            key,
            value: result,
            expiresAt: Date.now() + CACHE_TTL_MS,
          };
        }
        if (inFlightPromise === promise) {
          inFlightPromise = null;
          inFlightKey = null;
        }
      }
      return result;
    })
    .catch((err) => {
      if (generation === requestGeneration && inFlightPromise === promise) {
        inFlightPromise = null;
        inFlightKey = null;
      }
      throw err;
    });

  inFlightKey = key;
  inFlightPromise = promise;

  return raceWithSignal(promise, signal);
}
