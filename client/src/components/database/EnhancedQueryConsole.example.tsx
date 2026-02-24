/**
 * Example Implementation: Enhanced Query Console with Security & Rate Limiting
 *
 * This file demonstrates how to integrate all the new utilities into existing components
 */

import { useState, useCallback } from "react";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { validateQuery, sanitizeQueryForLogging } from "@/utils/query-security";
import { RateLimiter } from "@/utils/rate-limit";
import { LoadingOverlay, LoadingButton } from "@/components/ui/LoadingOverlay";
import { SkeletonText } from "@/components/ui/skeleton";
import {
  Responsive,
  ResponsiveGrid,
  Stack,
  Container,
} from "@/components/ui/Responsive";
import { InlineLoading } from "@/components/ui/LoadingOverlay";

// Example rate limiter (10 queries per 10 seconds)
const queryLimiter = new RateLimiter(10, 10000);

interface QueryConsoleExampleProps {
  onQueryExecute?: (query: string, result: any) => void;
}

/**
 * Enhanced Query Console Component with all improvements
 */
export const EnhancedQueryConsole: React.FC<QueryConsoleExampleProps> = ({
  onQueryExecute,
}) => {
  // State
  const [query, setQuery] = useState("SELECT * FROM users LIMIT 10");
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  // Debounced query executor (prevents rapid-fire requests)
  const executeQuery = useDebouncedCallback(async (queryStr: string) => {
    setError("");
    setWarning("");

    // 1. Validate query for security
    const validation = validateQuery(queryStr);

    if (!validation.isValid) {
      setError(validation.errors[0]);
      return;
    }

    // Show warnings
    if (validation.warnings.length > 0) {
      setWarning(validation.warnings[0]);
    }

    // 2. Check rate limiting
    if (!queryLimiter.isAllowed()) {
      const waitTime = queryLimiter.getRemainingTime();
      setError(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)}s before executing another query.`,
      );
      return;
    }

    // 3. Execute query
    setIsExecuting(true);
    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryStr,
          sanitized: sanitizeQueryForLogging(queryStr),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "Query execution failed");
      }

      const data = await response.json();
      setResult(data);
      setQueryHistory((prev) => [queryStr, ...prev.slice(0, 9)]);
      onQueryExecute?.(queryStr, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsExecuting(false);
    }
  }, 500); // Debounce for 500ms

  return (
    <Container maxWidth="2xl" className="py-8">
      <LoadingOverlay
        isVisible={isExecuting}
        message="Executing query..."
        variant="loading"
      />

      <Responsive
        mobile={
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Query Console</h1>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter SQL query..."
              className="w-full h-32 p-4 border border-slate-300 rounded font-mono text-sm"
              disabled={isExecuting}
            />
            <LoadingButton
              onClick={() => executeQuery(query)}
              isLoading={isExecuting}
              loadingText="Executing..."
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              Execute Query
            </LoadingButton>
          </div>
        }
        desktop={
          <div className="grid grid-cols-2 gap-6">
            {/* Query Input */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Query</h2>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter SQL query..."
                className="w-full h-96 p-4 border border-slate-300 rounded font-mono text-sm"
                disabled={isExecuting}
              />
              <Stack direction="row" spacing="md" className="mt-4">
                <LoadingButton
                  onClick={() => executeQuery(query)}
                  isLoading={isExecuting}
                  loadingText="Executing..."
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  Execute Query
                </LoadingButton>
                <button
                  onClick={() => setQuery("")}
                  disabled={isExecuting}
                  className="px-4 py-2 bg-slate-200 text-slate-900 rounded hover:bg-slate-300 disabled:opacity-50"
                >
                  Clear
                </button>
              </Stack>

              {/* Query History */}
              {queryHistory.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold mb-2">History</h3>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {queryHistory.map((h, idx) => (
                      <button
                        key={idx}
                        onClick={() => setQuery(h)}
                        className="w-full text-left px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded truncate"
                        title={h}
                      >
                        {h.substring(0, 50)}...
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Results */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Results</h2>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              {warning && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm mb-4">
                  ⚠️ {warning}
                </div>
              )}

              <InlineLoading isLoading={isExecuting} isFetching={isExecuting}>
                {result ? (
                  <div className="bg-slate-50 rounded p-4 font-mono text-sm max-h-96 overflow-y-auto">
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded p-4 text-slate-500">
                    {isExecuting ? (
                      <SkeletonText lines={5} />
                    ) : (
                      "Results will appear here"
                    )}
                  </div>
                )}
              </InlineLoading>
            </div>
          </div>
        }
      />
    </Container>
  );
};

// Export for use in DatabaseDashboard
export default EnhancedQueryConsole;
