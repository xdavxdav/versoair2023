import { useEffect, useState, useCallback } from "react";
import { TableBrowser } from "./TableBrowser";
import { TableMetadata, ViewMode } from "@/types/database-dashboard";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface TableBrowserContainerProps {
  onViewData?: (table: TableMetadata) => void;
  onAddRecord?: (table: TableMetadata) => void;
}

export function TableBrowserContainer({
  onViewData,
  onAddRecord,
}: TableBrowserContainerProps) {
  const [tables, setTables] = useState<TableMetadata[]>([]);
  const [filteredTables, setFilteredTables] = useState<TableMetadata[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tables from PostgreSQL via API
  const fetchTables = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call API to get all tables from PostgreSQL
      const response = await fetch("/api/manage/database/tables");

      if (!response.ok) {
        throw new Error(`Failed to fetch tables: ${response.statusText}`);
      }

      const data = await response.json();
      setTables(data || []);
      setFilteredTables(data || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("Error fetching tables:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Filter tables based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTables(tables);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = tables.filter(
      (table) =>
        table.name.toLowerCase().startsWith(query) ||
        table.displayName?.toLowerCase().startsWith(query) ||
        table.description?.toLowerCase().startsWith(query) ||
        (table.tags &&
          Array.isArray(table.tags) &&
          table.tags.some((tag: string) =>
            tag.toLowerCase().startsWith(query),
          )),
    );

    setFilteredTables(filtered);
  }, [searchQuery, tables]);

  const handleExportData = async (
    tableName: string,
    format: "csv" | "json",
  ) => {
    try {
      const response = await fetch(
        `/api/manage/database/export?table=${tableName}&format=${format}`,
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tableName}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error exporting data:", err);
      alert("Failed to export data");
    }
  };

  const handleCopyName = (name: string) => {
    navigator.clipboard.writeText(name);
    // Optional: Show toast notification
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-gray-600">Loading tables from PostgreSQL...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-md bg-red-50">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col items-center gap-4">
            <p className="text-red-700 font-semibold">Error Loading Tables</p>
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={fetchTables}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TableBrowser
      tables={tables}
      filteredTables={filteredTables}
      selectedTable={selectedTable}
      searchQuery={searchQuery}
      viewMode={viewMode}
      isLoadingData={isLoading}
      onSearchChange={setSearchQuery}
      onSelectTable={setSelectedTable}
      onViewData={onViewData || (() => {})}
      onAddRecord={onAddRecord || (() => {})}
      onExportData={handleExportData}
      onCopyName={handleCopyName}
      onViewModeChange={handleViewModeChange}
    />
  );
}
