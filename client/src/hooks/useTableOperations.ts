/**
 * useTableOperations Hook
 * Encapsulates all table CRUD operations and data management
 */

import { useCallback, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  TableRow,
  TableMetadata,
  RecordOperation,
} from "@/types/database-dashboard";
import { DB_CONFIG } from "@/constants/database";

interface UseTableOperationsReturn {
  // Data
  tableData: TableRow[];
  isLoadingTableData: boolean;
  tableError: Error | null;

  // Operations
  fetchTableData: (
    tableName: string,
    page: number,
    limit: number,
  ) => Promise<void>;
  addRecord: (tableName: string, record: TableRow) => Promise<boolean>;
  updateRecord: (
    tableName: string,
    recordId: string | number,
    updates: Partial<TableRow>,
  ) => Promise<boolean>;
  deleteRecord: (
    tableName: string,
    recordId: string | number,
  ) => Promise<boolean>;
  deleteMultiple: (
    tableName: string,
    ids: (string | number)[],
  ) => Promise<boolean>;

  // Utilities
  clearTableData: () => void;
  exportTableData: (
    tableName: string,
    format: "csv" | "json",
  ) => Promise<Blob | null>;
  importTableData: (tableName: string, file: File) => Promise<boolean>;

  // State
  operationHistory: RecordOperation[];
  lastOperation: RecordOperation | null;
}

/**
 * Custom hook for table CRUD operations
 * Handles data fetching, record manipulation, and import/export
 */
export const useTableOperations = (): UseTableOperationsReturn => {
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [isLoadingTableData, setIsLoadingTableData] = useState(false);
  const [tableError, setTableError] = useState<Error | null>(null);
  const [operationHistory, setOperationHistory] = useState<RecordOperation[]>(
    [],
  );

  // Fetch table data
  const fetchTableData = useCallback(
    async (
      tableName: string,
      page: number = 1,
      limit: number = 20,
    ): Promise<void> => {
      setIsLoadingTableData(true);
      setTableError(null);

      try {
        const offset = (page - 1) * limit;
        const response = await fetch(
          `${DB_CONFIG.API_BASE_URL}/api/tables/${tableName}/data?offset=${offset}&limit=${limit}`,
          {
            signal: AbortSignal.timeout(DB_CONFIG.DEFAULT_TIMEOUT),
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch table data: ${response.statusText}`);
        }

        const result = await response.json();
        setTableData(result.rows || []);
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to fetch table data");
        setTableError(error);
        setTableData([]);
      } finally {
        setIsLoadingTableData(false);
      }
    },
    [],
  );

  // Add record
  const addRecord = useCallback(
    async (tableName: string, record: TableRow): Promise<boolean> => {
      const timestamp = new Date();

      try {
        const response = await fetch(
          `${DB_CONFIG.API_BASE_URL}/api/tables/${tableName}/records`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(record),
            signal: AbortSignal.timeout(DB_CONFIG.DEFAULT_TIMEOUT),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to add record");
        }

        const newRecord = (await response.json()) as TableRow;
        setTableData((prev) => [...prev, newRecord]);

        // Log operation
        setOperationHistory((prev) => [
          ...prev,
          {
            type: "create",
            table: tableName,
            record: newRecord,
            timestamp,
            success: true,
          } as RecordOperation,
        ]);

        return true;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to add record");
        setTableError(error);

        // Log failed operation
        setOperationHistory((prev) => [
          ...prev,
          {
            type: "create",
            table: tableName,
            record: record as TableRow,
            timestamp,
            success: false,
            error: error.message,
          } as RecordOperation,
        ]);

        return false;
      }
    },
    [],
  );

  // Update record
  const updateRecord = useCallback(
    async (
      tableName: string,
      recordId: string | number,
      updates: Partial<TableRow>,
    ): Promise<boolean> => {
      const timestamp = new Date();

      try {
        const response = await fetch(
          `${DB_CONFIG.API_BASE_URL}/api/tables/${tableName}/records/${recordId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
            signal: AbortSignal.timeout(DB_CONFIG.DEFAULT_TIMEOUT),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to update record");
        }

        const updatedRecord = (await response.json()) as TableRow;
        setTableData((prev) =>
          prev.map((row) =>
            row.id === recordId ? { ...row, ...updatedRecord } : row,
          ),
        );

        // Log operation
        setOperationHistory((prev) => [
          ...prev,
          {
            type: "update",
            table: tableName,
            record: updatedRecord,
            timestamp,
            success: true,
          } as RecordOperation,
        ]);

        return true;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to update record");
        setTableError(error);

        setOperationHistory((prev) => [
          ...prev,
          {
            type: "update",
            table: tableName,
            record: updates as TableRow,
            timestamp,
            success: false,
            error: error.message,
          } as RecordOperation,
        ]);

        return false;
      }
    },
    [],
  );

  // Delete record
  const deleteRecord = useCallback(
    async (tableName: string, recordId: string | number): Promise<boolean> => {
      const timestamp = new Date();
      const deletedRecord = tableData.find((row) => row.id === recordId);

      try {
        const response = await fetch(
          `${DB_CONFIG.API_BASE_URL}/api/tables/${tableName}/records/${recordId}`,
          {
            method: "DELETE",
            signal: AbortSignal.timeout(DB_CONFIG.DEFAULT_TIMEOUT),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to delete record");
        }

        setTableData((prev) => prev.filter((row) => row.id !== recordId));

        // Log operation
        setOperationHistory((prev) => [
          ...prev,
          {
            type: "delete",
            table: tableName,
            record: deletedRecord || ({} as TableRow),
            timestamp,
            success: true,
          } as RecordOperation,
        ]);

        return true;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to delete record");
        setTableError(error);

        setOperationHistory((prev) => [
          ...prev,
          {
            type: "delete",
            table: tableName,
            record: deletedRecord || ({} as TableRow),
            timestamp,
            success: false,
            error: error.message,
          } as RecordOperation,
        ]);

        return false;
      }
    },
    [tableData],
  );

  // Delete multiple records
  const deleteMultiple = useCallback(
    async (tableName: string, ids: (string | number)[]): Promise<boolean> => {
      const timestamp = new Date();

      try {
        const response = await fetch(
          `${DB_CONFIG.API_BASE_URL}/api/tables/${tableName}/records/bulk-delete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
            signal: AbortSignal.timeout(DB_CONFIG.DEFAULT_TIMEOUT),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to delete records");
        }

        setTableData((prev) =>
          prev.filter((row) => !ids.includes(row.id as string | number)),
        );

        setOperationHistory((prev) => [
          ...prev,
          {
            type: "delete",
            table: tableName,
            record: { ids } as any as TableRow,
            timestamp,
            success: true,
          },
        ]);

        return true;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to delete records");
        setTableError(error);
        return false;
      }
    },
    [],
  );

  // Clear table data
  const clearTableData = useCallback(() => {
    setTableData([]);
    setTableError(null);
  }, []);

  // Export table data
  const exportTableData = useCallback(
    async (tableName: string, format: "csv" | "json"): Promise<Blob | null> => {
      try {
        if (format === "csv") {
          if (tableData.length === 0) return null;

          const headers = Object.keys(tableData[0]);
          const csv = [
            headers.join(","),
            ...tableData.map((row) =>
              headers
                .map((header) => {
                  const value = row[header];
                  return typeof value === "string" ? `"${value}"` : value;
                })
                .join(","),
            ),
          ].join("\n");

          return new Blob([csv], { type: "text/csv" });
        } else {
          const json = JSON.stringify(tableData, null, 2);
          return new Blob([json], { type: "application/json" });
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Export failed");
        setTableError(error);
        return null;
      }
    },
    [tableData],
  );

  // Import table data
  const importTableData = useCallback(
    async (tableName: string, file: File): Promise<boolean> => {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
          `${DB_CONFIG.API_BASE_URL}/api/tables/${tableName}/import`,
          {
            method: "POST",
            body: formData,
            signal: AbortSignal.timeout(DB_CONFIG.DEFAULT_TIMEOUT),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to import data");
        }

        const result = await response.json();
        setTableData((prev) => [...prev, ...result.imported]);

        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Import failed");
        setTableError(error);
        return false;
      }
    },
    [],
  );

  const lastOperation =
    operationHistory.length > 0
      ? operationHistory[operationHistory.length - 1]
      : null;

  return {
    // Data
    tableData,
    isLoadingTableData,
    tableError,

    // Operations
    fetchTableData,
    addRecord,
    updateRecord,
    deleteRecord,
    deleteMultiple,

    // Utilities
    clearTableData,
    exportTableData,
    importTableData,

    // State
    operationHistory,
    lastOperation,
  };
};

export default useTableOperations;
