import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getCsrfToken, initializeCsrfToken } from "./auth";

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

export const queryClient = new QueryClient({
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
