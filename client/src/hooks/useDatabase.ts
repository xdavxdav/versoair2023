/**
 * useDatabase Hook
 * Encapsulates all database-related logic and API calls
 */

import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, UseQueryResult } from "@tanstack/react-query";
import {
  DatabaseHealthMetrics,
  ApiHealthResponse,
  ApiTablesResponse,
  ApiCategoriesResponse,
  QueryResponse,
  DatabaseConnectionStatus,
} from "@/types/database-dashboard";
import { DB_CONFIG, TIMING_CONFIG, QUERY_CONFIG } from "@/constants/database";

interface UseDatabaseReturn {
  // Health & Connection
  health: UseQueryResult<ApiHealthResponse>;
  connectionStatus: DatabaseConnectionStatus;
  isConnected: boolean;

  // Tables
  tables: UseQueryResult<ApiTablesResponse>;
  tablesList: any[];

  // Categories
  categories: UseQueryResult<ApiCategoriesResponse>;
  categoriesList: any[];

  // Query Execution
  executeQuery: (query: string) => Promise<QueryResponse>;
  isExecutingQuery: boolean;

  // Mutations
  testConnection: () => Promise<void>;

  // Utility
  refetch: () => void;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom hook for database operations
 * Handles API calls, caching, and state management
 */
export const useDatabase = (): UseDatabaseReturn => {
  const [connectionStatus, setConnectionStatus] =
    useState<DatabaseConnectionStatus>(DatabaseConnectionStatus.CONNECTING);
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch database status
  const health = useQuery<ApiHealthResponse>({
    queryKey: ["database-health"],
    queryFn: async () => {
      const response = await fetch(`${DB_CONFIG.API_BASE_URL}/api/status`, {
        signal: AbortSignal.timeout(DB_CONFIG.DEFAULT_TIMEOUT),
      });
      if (!response.ok) {
        throw new Error("Status check failed");
      }
      return response.json();
    },
    retry: DB_CONFIG.MAX_RETRIES,
    staleTime: TIMING_CONFIG.STALE_TIME_HEALTH,
    refetchInterval: TIMING_CONFIG.HEALTH_CHECK_INTERVAL,
  });

  // Fetch tables
  const tables = useQuery<ApiTablesResponse>({
    queryKey: ["tables"],
    queryFn: async () => {
      const response = await fetch(`${DB_CONFIG.API_BASE_URL}/api/tables`, {
        signal: AbortSignal.timeout(DB_CONFIG.DEFAULT_TIMEOUT),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch tables");
      }
      return response.json();
    },
    retry: DB_CONFIG.MAX_RETRIES,
    staleTime: TIMING_CONFIG.STALE_TIME_TABLES,
    gcTime: TIMING_CONFIG.GC_TIME,
  });

  // Fetch categories
  const categories = useQuery<ApiCategoriesResponse>({
    queryKey: ["business-categories"],
    queryFn: async () => {
      const response = await fetch(
        `${DB_CONFIG.API_BASE_URL}/api/admin/categories`,
        {
          signal: AbortSignal.timeout(DB_CONFIG.DEFAULT_TIMEOUT),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      return response.json();
    },
    retry: 2,
    staleTime: TIMING_CONFIG.STALE_TIME_CATEGORIES,
    gcTime: TIMING_CONFIG.GC_TIME,
  });

  // Update connection status based on health
  useEffect(() => {
    if (health.data) {
      if (health.data.health.database?.connected) {
        setConnectionStatus(DatabaseConnectionStatus.CONNECTED);
        setError(null);
      } else {
        setConnectionStatus(DatabaseConnectionStatus.DISCONNECTED);
      }
    } else if (health.isError) {
      setConnectionStatus(DatabaseConnectionStatus.ERROR);
      setError(health.error as Error);
    }
  }, [health.data, health.isError, health.error]);

  // Execute custom query
  const executeQuery = useCallback(
    async (query: string): Promise<QueryResponse> => {
      if (!query.trim()) {
        return {
          success: false,
          error: "Query cannot be empty",
          executionTime: 0,
        };
      }

      setIsExecutingQuery(true);
      const startTime = performance.now();

      try {
        const response = await fetch(`${DB_CONFIG.API_BASE_URL}/api/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: AbortSignal.timeout(QUERY_CONFIG.QUERY_TIMEOUT),
        });

        const executionTime = performance.now() - startTime;

        if (!response.ok) {
          const errorData = await response.json();
          return {
            success: false,
            error: errorData.message || "Query execution failed",
            executionTime,
          };
        }

        const result = await response.json();
        return {
          success: true,
          data: result,
          executionTime,
        };
      } catch (err) {
        const executionTime = performance.now() - startTime;
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(err instanceof Error ? err : new Error(errorMessage));
        return {
          success: false,
          error: errorMessage,
          executionTime,
        };
      } finally {
        setIsExecutingQuery(false);
      }
    },
    [],
  );

  // Test connection mutation
  const testConnection = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${DB_CONFIG.API_BASE_URL}/api/status`, {
        signal: AbortSignal.timeout(DB_CONFIG.DEFAULT_TIMEOUT),
      });
      if (response.ok) {
        await health.refetch();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Connection test failed"),
      );
    }
  }, [health]);

  // Refetch all data
  const refetch = useCallback(() => {
    health.refetch();
    tables.refetch();
    categories.refetch();
  }, [health, tables, categories]);

  const isLoading =
    health.isLoading || tables.isLoading || categories.isLoading;

  return {
    // Health & Connection
    health,
    connectionStatus,
    isConnected: connectionStatus === DatabaseConnectionStatus.CONNECTED,

    // Tables
    tables,
    tablesList: tables.data?.tables ?? [],

    // Categories
    categories,
    categoriesList: categories.data?.categories ?? [],

    // Query Execution
    executeQuery,
    isExecutingQuery,

    // Mutations
    testConnection,

    // Utility
    refetch,
    isLoading,
    error,
  };
};

export default useDatabase;
