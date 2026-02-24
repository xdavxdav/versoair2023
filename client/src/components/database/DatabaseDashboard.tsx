import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  useEscapeKey,
  useModalAccessibility,
  generateAriaLabel,
  announceToScreenReader,
  useFocusOnMount,
} from "@/utils/a11y";
import {
  QueryConsole,
  TableBrowser,
  BusinessManager,
  BackupManager,
  SettingsPanel,
} from "./index";
import { Database, Settings, Menu, MoreVertical, Loader2 } from "lucide-react";
import { ErrorBoundary } from "./ErrorBoundary";
import {
  DatabaseConnectionStatus,
  ViewMode,
  BackupType,
  TabName,
  ExportFormat,
  DatabaseHealthMetrics,
  QueryExecutionResult,
  TableMetadata,
  TableRow,
  ModalState,
  FormFieldValue,
  DatabaseCategory,
  ApiHealthResponse,
  ApiTablesResponse,
  BusinessCategoryOption,
  DEFAULT_RECORDS_PER_PAGE,
  DEFAULT_AUTO_REFRESH_INTERVAL,
  factories,
  typeGuards,
} from "@/types/database-dashboard";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5003";

export const DatabaseDashboard = memo(() => {
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    DatabaseCategory | "all"
  >("all");
  const [selectedBusinessType, setSelectedBusinessType] = useState<
    string | null
  >(null);

  // Table Management State
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [currentTableData, setCurrentTableData] = useState<TableRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.LIST);

  // Form and Record State
  const [formData, setFormData] = useState<FormFieldValue>({});
  const [recordToDelete, setRecordToDelete] = useState<TableRow | null>(null);

  // Query Execution State
  const [sqlQuery, setSqlQuery] = useState<string>(
    "SELECT * FROM users LIMIT 10",
  );
  const [queryResult, setQueryResult] = useState<QueryExecutionResult | null>(
    null,
  );
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);

  // Database State
  const [databaseHealth, setDatabaseHealth] =
    useState<DatabaseHealthMetrics | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<DatabaseConnectionStatus>(DatabaseConnectionStatus.CONNECTING);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Backup State
  const [backupType, setBackupType] = useState<BackupType>(BackupType.FULL);

  // UI State
  const [activeTab, setActiveTab] = useState<TabName>(TabName.DASHBOARD);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  const recordsPerPage = DEFAULT_RECORDS_PER_PAGE;
  const queryEditorRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts for accessibility
  useEscapeKey(() => {
    if (modal.type !== "none") {
      setModal({ type: "none" });
    }
  }, modal.type !== "none");

  // Focus management for modals
  useEffect(() => {
    if (modal.type !== "none" && queryEditorRef.current) {
      // Focus query editor when add/edit modal opens
      if (modal.type === "add" || modal.type === "edit") {
        setTimeout(() => queryEditorRef.current?.focus(), 100);
      }
    }
  }, [modal.type]);

  // Fetch database health
  const { data: healthData, refetch: refetchHealth } =
    useQuery<ApiHealthResponse>({
      queryKey: ["database-health"],
      queryFn: async () => {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        if (!response.ok) throw new Error("Health check failed");
        return response.json();
      },
      retry: 1,
      staleTime: 30000,
    });

  // Fetch tables
  const { data: tablesResponse, refetch: refetchTables } =
    useQuery<ApiTablesResponse>({
      queryKey: ["tables"],
      queryFn: async () => {
        const response = await fetch(`${API_BASE_URL}/api/tables`);
        if (!response.ok) throw new Error("Failed to fetch tables");
        return response.json();
      },
      retry: 1,
      staleTime: 60000,
    });

  const tablesData = tablesResponse?.tables ?? [];

  // Fetch business categories
  const {
    data: categoriesResponse = { categories: [] },
    isLoading: isCategoriesLoading,
  } = useQuery<{ categories: BusinessCategoryOption[] }>({
    queryKey: ["business-categories"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/admin/categories`);
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
    staleTime: 300000,
    gcTime: 600000,
    retry: 2,
  });

  const businessCategories = categoriesResponse?.categories ?? [];

  // Update health data
  useEffect(() => {
    if (healthData) {
      setDatabaseHealth(healthData.health);
      setConnectionStatus(
        healthData.health.database?.connected
          ? DatabaseConnectionStatus.CONNECTED
          : DatabaseConnectionStatus.DISCONNECTED,
      );
      setLastFetchTime(new Date());
    }
  }, [healthData]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetchHealth();
      refetchTables();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetchHealth, refetchTables]);

  // Filter tables based on search and category - memoized for performance
  const filteredTables = useMemo(() => {
    const tablesToFilter =
      tablesData && tablesData.length > 0 ? tablesData : [];

    let filtered = tablesToFilter;

    // Filter by category if selected
    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter((table: TableMetadata) => {
        const tableCategory = Object.values(DatabaseCategory).includes(
          table.category as DatabaseCategory,
        )
          ? (table.category as DatabaseCategory)
          : DatabaseCategory.OTHER;
        return tableCategory === selectedCategory;
      });
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (table: TableMetadata) =>
          table.name.toLowerCase().includes(query) ||
          table.displayName.toLowerCase().includes(query) ||
          table.description.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [tablesData, searchQuery, selectedCategory]);

  // Handle query execution
  const handleExecuteQuery = useCallback(async () => {
    if (!sqlQuery.trim()) return;

    setIsExecutingQuery(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sqlQuery }),
      });

      if (response.ok) {
        const result = await response.json();
        if (typeGuards.isQueryExecutionResult(result)) {
          setQueryResult(result);
        }
      }
    } catch (error) {
      console.error("Query execution failed:", error);
    } finally {
      setIsExecutingQuery(false);
    }
  }, [sqlQuery]);

  // Handle export
  const handleExportResults = useCallback(
    (format: ExportFormat) => {
      if (!queryResult) return;

      const content =
        format === ExportFormat.CSV
          ? [
              queryResult.columns.join(","),
              ...queryResult.rows.map((row) =>
                queryResult.columns.map((col) => String(row[col])).join(","),
              ),
            ].join("\n")
          : JSON.stringify(queryResult.rows, null, 2);

      const blob = new Blob([content], {
        type: format === ExportFormat.CSV ? "text/csv" : "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `query-results.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [queryResult],
  );

  // Handle view data
  const handleViewData = useCallback((table: TableMetadata) => {
    setSelectedTable(table.name);
    setActiveTab(TabName.TABLES);
  }, []);

  // Handle add record
  const handleAddRecord = useCallback((table: TableMetadata) => {
    setFormData({});
    setSelectedTable(table.name);
    setModal({ type: "add", table: table.name });
  }, []);

  // Handle export data
  const handleExportData = useCallback((tableName: string, format: string) => {
    console.log(`Exporting ${tableName} as ${format}`);
    // Future: Implement actual export logic
  }, []);

  // Handle test connection
  const handleTestConnection = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      if (response.ok) {
        refetchHealth();
      }
    } catch (error) {
      console.error("Connection test failed:", error);
    }
  }, [refetchHealth]);

  // Handle copy name
  const handleCopyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  // Handle create backup
  const handleCreateBackup = useCallback((type: BackupType) => {
    console.log(`Creating ${type} backup`);
    setBackupType(type);
    setModal({ type: "backup", backupType: type });
  }, []);

  // Handle restore backup
  const handleRestoreBackup = useCallback(() => {
    console.log("Restoring backup");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Database Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Manage tables, execute queries, and monitor database health
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                connectionStatus === DatabaseConnectionStatus.CONNECTED
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            />
            <span className="text-sm font-medium text-gray-700 capitalize">
              {connectionStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabName)}
          className="mb-8"
        >
          <TabsList className="grid w-full grid-cols-5 bg-white border-0 shadow-md p-1 rounded-lg">
            <TabsTrigger value={TabName.DASHBOARD} className="gap-2">
              📊 Overview
            </TabsTrigger>
            <TabsTrigger value={TabName.TABLES} className="gap-2">
              📋 Tables
            </TabsTrigger>
            <TabsTrigger value={TabName.BUSINESSES} className="gap-2">
              🏢 Businesses
            </TabsTrigger>
            <TabsTrigger value={TabName.QUERY} className="gap-2">
              ⚡ Query
            </TabsTrigger>

            {/* More Options Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 h-10 justify-start"
                  aria-label={generateAriaLabel(
                    "Open additional database tools menu",
                  )}
                  aria-haspopup="true"
                  aria-expanded={false}
                >
                  <MoreVertical className="h-4 w-4" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Additional Tools</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab(TabName.BACKUPS)}>
                  💾 Backups
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setActiveTab(TabName.SETTINGS)}
                >
                  ⚙️ Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsList>

          {/* Dashboard Tab */}
          <ErrorBoundary level="section">
            <TabsContent value={TabName.DASHBOARD} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="text-sm font-medium text-gray-600">
                    Status
                  </div>
                  <div className="text-2xl font-bold text-green-600 mt-2">
                    {connectionStatus === DatabaseConnectionStatus.CONNECTED
                      ? "Connected"
                      : "Offline"}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="text-sm font-medium text-gray-600">
                    Tables
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mt-2">
                    {tablesData?.length || 0}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="text-sm font-medium text-gray-600">
                    Last Updated
                  </div>
                  <div className="text-sm text-gray-900 mt-2">
                    {lastFetchTime
                      ? lastFetchTime.toLocaleTimeString()
                      : "Never"}
                  </div>
                </div>
              </div>
            </TabsContent>
          </ErrorBoundary>

          {/* Tables Tab */}
          <ErrorBoundary level="section">
            <TabsContent value="tables">
              <TableBrowser
                tables={tablesData || []}
                filteredTables={filteredTables}
                selectedTable={selectedTable}
                searchQuery={searchQuery}
                viewMode={viewMode}
                isLoadingData={isLoadingData}
                onSearchChange={setSearchQuery}
                onSelectTable={setSelectedTable}
                onViewData={handleViewData}
                onAddRecord={handleAddRecord}
                onExportData={handleExportData}
                onCopyName={handleCopyToClipboard}
                onViewModeChange={setViewMode}
              />
            </TabsContent>
          </ErrorBoundary>

          {/* Businesses Tab */}
          <ErrorBoundary level="section">
            <TabsContent value="businesses">
              <BusinessManager
                businessCategories={businessCategories as any}
                selectedBusinessType={selectedBusinessType}
                isCategoriesLoading={isCategoriesLoading}
                onSelectCategory={setSelectedBusinessType}
                onManageCategory={() => {}}
                onSearchInCategory={() => {}}
              />
            </TabsContent>
          </ErrorBoundary>

          {/* Query Tab */}
          <ErrorBoundary level="section">
            <TabsContent value="query">
              <QueryConsole
                sqlQuery={sqlQuery}
                setSqlQuery={setSqlQuery}
                queryResult={queryResult}
                isExecutingQuery={isExecutingQuery}
                onExecuteQuery={handleExecuteQuery}
                onExportResults={(format) =>
                  handleExportResults(format as ExportFormat)
                }
              />
            </TabsContent>
          </ErrorBoundary>

          {/* Backups Tab */}
          <ErrorBoundary level="section">
            <TabsContent value="backups">
              <BackupManager
                backupType={backupType as "full" | "partial" | "schema"}
                onBackupTypeChange={(type) => setBackupType(type as BackupType)}
                onCreateBackup={(type) =>
                  handleCreateBackup(type as BackupType)
                }
                onRestoreBackup={handleRestoreBackup}
              />
            </TabsContent>
          </ErrorBoundary>

          {/* Settings Tab */}
          <ErrorBoundary level="section">
            <TabsContent value="settings">
              <SettingsPanel
                autoRefresh={autoRefresh}
                onAutoRefreshChange={setAutoRefresh}
                onRefresh={() => {
                  refetchHealth();
                  refetchTables();
                }}
              />
            </TabsContent>
          </ErrorBoundary>
        </Tabs>
      </div>
    </div>
  );
});

DatabaseDashboard.displayName = "DatabaseDashboard";
