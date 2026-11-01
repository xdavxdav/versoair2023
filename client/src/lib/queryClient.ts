import {
  MutationCache,
  QueryClient,
  QueryFunction,
} from "@tanstack/react-query";
import { toast } from "../hooks/use-toast";
import { getCsrfToken, initializeCsrfToken } from "./auth";
import { failureFromThrown, resolveLang } from "./submit-json";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  // Attach CSRF token on mutating requests
  const upperMethod = method.toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(upperMethod)) {
    let csrf = getCsrfToken();
    if (!csrf) {
      await initializeCsrfToken();
      csrf = getCsrfToken();
    }
    if (csrf) {
      headers["x-csrf-token"] = csrf;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Safety net: a mutation that fails and has no onError of its own still tells the
// user, instead of looking like nothing happened. Opt out with meta: { silent: true }.
const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    if (mutation.options.onError || mutation.meta?.silent) return;
    const failure = failureFromThrown(error);
    toast({
      title: resolveLang() === "fr" ? "Action impossible" : "Action failed",
      description: failure.message,
      variant: "destructive",
    });
  },
});

export const queryClient = new QueryClient({
  mutationCache,
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 60_000, // 60s — dashboards auto-refresh; individual queries can override
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Diagnostic: ensure compatibility with runtime which may call `defaultMutationOptions`
// (protects against edge cases where the method might be missing on the instance).
if (!(queryClient as any).defaultMutationOptions) {
  console.warn(
    "⚠️ queryClient missing defaultMutationOptions; adding compatibility shim",
  );
  (queryClient as any).defaultMutationOptions = function (options?: any) {
    // Merge instance defaults (if available) with provided options
    const defaults =
      typeof (this as any).getDefaultOptions === "function"
        ? (this as any).getDefaultOptions().mutations || {}
        : {};
    return { ...defaults, ...(options || {}) } as any;
  };
}
