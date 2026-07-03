/**
 * Database Dashboard Type Definitions
 * Comprehensive type system for DatabaseDashboard component
 */

// ========================
// ENUMS
// ========================

export enum DatabaseConnectionStatus {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error",
}

export enum ViewMode {
  GRID = "grid",
  LIST = "list",
}

export enum BackupType {
  FULL = "full",
  PARTIAL = "partial",
  SCHEMA = "schema",
}

export enum TabName {
  DASHBOARD = "dashboard",
  TABLES = "tables",
  BUSINESSES = "businesses",
  QUERY = "query",
  BACKUPS = "backups",
  SETTINGS = "settings",
}

export enum ExportFormat {
  CSV = "csv",
  JSON = "json",
  SQL = "sql",
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  VIEW = "view",
}

// ========================
// DATABASE HEALTH & STATUS
// ========================

export interface DatabaseHealthMetrics {
  database: {
    connected: boolean;
    latency: number;
  };
  performance: {
    queryTime: number;
    uptime: number;
  };
}

export interface QueryExecutionResult {
  rowCount: number;
  duration: number;
  columns: string[];
  rows: Record<string, unknown>[];
  executedAt: Date;
}

export interface DatabaseStatistics {
  totalTables: number;
  totalRows: number;
  databaseSize: number;
  lastBackup?: Date;
  connectionStatus: DatabaseConnectionStatus;
}

// ========================
// TABLE METADATA
// ========================

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyTable?: string;
}

export interface TableMetadata {
  name: string;
  displayName: string;
  category?: DatabaseCategory;
  description: string;
  recordCount?: number;
  rowCount?: number;
  columns?: TableColumn[] | number;
  primaryKey?: string;
  createdAt?: Date;
  lastModified?: Date;
  size?: number;
  sizeMB?: number;
  indexes?: TableIndex[];
  tags?: string[];
  icon?: string;
  importance?: "low" | "medium" | "high" | "critical";
  hasFK?: boolean;
  is_view?: boolean;
  columnDetails?: any[];
}

export interface TableIndex {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

export interface TableRow {
  [key: string]: unknown;
}

// ========================
// BUSINESS CATEGORIES
// ========================

export enum DatabaseCategory {
  USERS = "users",
  BUSINESSES = "businesses",
  CATEGORIES = "categories",
  REVIEWS = "reviews",
  RESERVATIONS = "reservations",
  ANALYTICS = "analytics",
  ADVERTISING = "advertising",
  PAYMENTS = "payments",
  JOBS = "jobs",
  MUSIC = "music",
  CONTENT = "content",
  GEOGRAPHY = "geography",
  OTHER = "other",
}

export interface BusinessCategoryOption {
  id: number;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
}

// ========================
// MODAL STATE MANAGEMENT
// ========================

export type ModalState =
  | { type: "none" }
  | { type: "add"; table: string }
  | { type: "edit"; table: string; record: TableRow }
  | { type: "delete"; table: string; record: TableRow }
  | { type: "view"; table: string; record: TableRow }
  | { type: "export"; table: string; format: ExportFormat }
  | { type: "query-result"; result: QueryExecutionResult }
  | { type: "backup"; backupType: BackupType }
  | { type: "settings" };

// Helper type guards for modal states
export const isModalType = <T extends ModalState["type"]>(
  modal: ModalState,
  type: T,
): modal is ModalState & { type: T } => modal.type === type;

// ========================
// FORM & RECORD MANAGEMENT
// ========================

export interface FormFieldValue {
  [key: string]: unknown;
}

export interface RecordValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface RecordOperation {
  type: "create" | "update" | "delete";
  table: string;
  record: TableRow;
  timestamp: Date;
  success: boolean;
  error?: string;
}

// ========================
// QUERY EXECUTION
// ========================

export interface QueryRequest {
  query: string;
  timeout?: number;
  params?: unknown[];
}

export interface QueryResponse {
  success: boolean;
  data?: QueryExecutionResult;
  error?: string;
  executionTime: number;
}

export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  query: string;
  tags?: string[];
  createdAt: Date;
  lastExecuted?: Date;
  executionCount: number;
}

// ========================
// EXPORT & BACKUP
// ========================

export interface ExportOptions {
  format: ExportFormat;
  includeHeaders: boolean;
  includeMeta?: boolean;
  columns?: string[];
  rows?: number;
}

export interface ExportResult {
  format: ExportFormat;
  filename: string;
  size: number;
  recordCount: number;
  exportedAt: Date;
}

export interface BackupMetadata {
  id: string;
  name: string;
  type: BackupType;
  size: number;
  tableCount: number;
  recordCount: number;
  createdAt: Date;
  expiresAt?: Date;
  compressed: boolean;
  location: string;
}

export interface BackupRestoreOptions {
  backupId: string;
  includeData: boolean;
  includeSchema: boolean;
  preserveIds: boolean;
}

// ========================
// SEARCH & FILTERING
// ========================

export interface TableSearchParams {
  query: string;
  category?: DatabaseCategory;
  tableName?: string;
}

export interface TableFilterOptions {
  searchQuery: string;
  selectedCategory: DatabaseCategory | "all";
  selectedBusinessType?: string | null;
  sortBy?: "name" | "createdAt" | "size";
  sortOrder?: "asc" | "desc";
}

export interface FilteredTableResult {
  tables: TableMetadata[];
  total: number;
  filtered: number;
}

// ========================
// PAGINATION
// ========================

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

// ========================
// DASHBOARD SETTINGS
// ========================

export interface DashboardSettings {
  autoRefreshInterval: number;
  enableAutoRefresh: boolean;
  defaultViewMode: ViewMode;
  recordsPerPage: number;
  showSystemTables: boolean;
  enableDetailedLogging: boolean;
  theme: "light" | "dark";
  compactMode: boolean;
}

export interface ConnectionSettings {
  host: string;
  port: number;
  database: string;
  user: string;
  ssl: boolean;
  timeout: number;
  maxConnections: number;
}

// ========================
// ERROR HANDLING
// ========================

export interface DatabaseError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  query?: string;
}

export interface OperationError extends DatabaseError {
  operation: string;
  table?: string;
  record?: TableRow;
}

// ========================
// PERFORMANCE MONITORING
// ========================

export interface PerformanceMetrics {
  queryExecutionTime: number;
  dataLoadingTime: number;
  renderTime: number;
  memoryUsage: number;
  timestamp: Date;
}

export interface DashboardPerformance {
  averageQueryTime: number;
  averageLoadTime: number;
  slowestQueries: QueryMetrics[];
  cacheHitRate: number;
}

export interface QueryMetrics {
  query: string;
  executionTime: number;
  rowsAffected: number;
  executedAt: Date;
  status: "success" | "error";
}

// ========================
// API RESPONSES
// ========================

export interface ApiHealthResponse {
  status: "ok" | "degraded" | "down";
  health: DatabaseHealthMetrics;
  timestamp: Date;
}

export interface ApiTablesResponse {
  tables: TableMetadata[];
  total: number;
  timestamp: Date;
}

export interface ApiCategoriesResponse {
  categories: BusinessCategoryOption[];
  total: number;
}

export interface ApiQueryResponse {
  success: boolean;
  result?: QueryExecutionResult;
  error?: DatabaseError;
  executionTime: number;
}

// ========================
// EVENT HANDLERS
// ========================

export type TableHandler = (table: TableMetadata) => void;
export type RecordHandler = (table: string, record: TableRow) => void;
export type QueryHandler = (query: string) => Promise<void>;
export type ExportHandler = (format: ExportFormat) => void;
export type ModalHandler = (modal: ModalState) => void;

// ========================
// COMPONENT PROPS
// ========================

export interface QueryConsoleProps {
  query: string;
  onQueryChange: (query: string) => void;
  onExecute: () => void;
  isExecuting: boolean;
  result?: QueryExecutionResult | null;
  onExport: (format: ExportFormat) => void;
  savedQueries?: SavedQuery[];
  onLoadQuery?: (query: SavedQuery) => void;
}

export interface TableBrowserProps {
  tables: TableMetadata[];
  selectedTable: string | null;
  onSelectTable: (table: TableMetadata) => void;
  onViewData: (table: TableMetadata) => void;
  onAddRecord: (table: TableMetadata) => void;
  onExportData: (table: string, format: ExportFormat) => void;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  category?: DatabaseCategory | "all";
  onCategoryChange?: (category: DatabaseCategory | "all") => void;
}

export interface BusinessManagerProps {
  categories: BusinessCategoryOption[];
  isLoading: boolean;
  onCategorySelect: (category: BusinessCategoryOption) => void;
}

export interface BackupManagerProps {
  backups: BackupMetadata[];
  isLoading: boolean;
  onCreateBackup: (type: BackupType) => void;
  onRestoreBackup: (backup: BackupMetadata) => void;
  onDeleteBackup: (backupId: string) => void;
}

export interface SettingsPanelProps {
  settings: DashboardSettings;
  onSettingsChange: (settings: Partial<DashboardSettings>) => void;
  connectionSettings?: ConnectionSettings;
  onConnectionSettingsChange?: (settings: Partial<ConnectionSettings>) => void;
}

// ========================
// STATE MANAGEMENT TYPES
// ========================

export interface DashboardState {
  // Connection & Health
  connectionStatus: DatabaseConnectionStatus;
  databaseHealth: DatabaseHealthMetrics | null;
  lastFetchTime: Date | null;

  // Tables & Data
  tables: TableMetadata[];
  selectedTable: string | null;
  currentTableData: TableRow[];
  totalRecords: number;
  isLoadingData: boolean;

  // Search & Filter
  searchQuery: string;
  selectedCategory: DatabaseCategory | "all";
  selectedBusinessType: string | null;

  // Pagination
  currentPage: number;
  recordsPerPage: number;

  // Query Execution
  sqlQuery: string;
  queryResult: QueryExecutionResult | null;
  isExecutingQuery: boolean;

  // UI State
  activeTab: TabName;
  viewMode: ViewMode;
  showMobileMenu: boolean;
  modal: ModalState;

  // Form & Records
  formData: FormFieldValue;
  recordToDelete: TableRow | null;

  // Backup
  backupType: BackupType;
  autoRefresh: boolean;

  // Settings
  settings: DashboardSettings;
}

export interface DashboardActions {
  setConnectionStatus: (status: DatabaseConnectionStatus) => void;
  setSelectedTable: (table: string | null) => void;
  setCurrentTableData: (data: TableRow[]) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: DatabaseCategory | "all") => void;
  setSqlQuery: (query: string) => void;
  setQueryResult: (result: QueryExecutionResult | null) => void;
  setActiveTab: (tab: TabName) => void;
  setViewMode: (mode: ViewMode) => void;
  setModal: (modal: ModalState) => void;
  setFormData: (data: FormFieldValue) => void;
  resetState: () => void;
}

// ========================
// UTILITY TYPES
// ========================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncFunction<T> = () => Promise<T>;
export type EventCallback<T> = (data: T) => void;

// Type-safe record access
export type SafeRecord<T extends TableRow> = {
  [K in keyof T]: T[K];
};

// Partial updates for records
export type RecordUpdate<T extends TableRow> = Partial<T> & {
  id: T extends { id: infer I } ? I : never;
};

// ========================
// CONSTANTS
// ========================

export const DEFAULT_RECORDS_PER_PAGE = 20;
export const DEFAULT_AUTO_REFRESH_INTERVAL = 30000; // 30 seconds
export const DEFAULT_QUERY_TIMEOUT = 30000; // 30 seconds
export const MAX_QUERY_RESULTS = 10000;
export const BACKUP_RETENTION_DAYS = 30;

export const TAB_NAMES: Record<string, TabName> = {
  dashboard: TabName.DASHBOARD,
  tables: TabName.TABLES,
  businesses: TabName.BUSINESSES,
  query: TabName.QUERY,
  backups: TabName.BACKUPS,
  settings: TabName.SETTINGS,
};

export const BACKUP_TYPES: Record<string, BackupType> = {
  full: BackupType.FULL,
  partial: BackupType.PARTIAL,
  schema: BackupType.SCHEMA,
};

export const EXPORT_FORMATS: Record<string, ExportFormat> = {
  csv: ExportFormat.CSV,
  json: ExportFormat.JSON,
  sql: ExportFormat.SQL,
};

export const DATABASE_CATEGORIES: Record<string, DatabaseCategory> = {
  users: DatabaseCategory.USERS,
  businesses: DatabaseCategory.BUSINESSES,
  categories: DatabaseCategory.CATEGORIES,
  reviews: DatabaseCategory.REVIEWS,
  reservations: DatabaseCategory.RESERVATIONS,
  analytics: DatabaseCategory.ANALYTICS,
  advertising: DatabaseCategory.ADVERTISING,
  payments: DatabaseCategory.PAYMENTS,
  jobs: DatabaseCategory.JOBS,
  music: DatabaseCategory.MUSIC,
  content: DatabaseCategory.CONTENT,
  geography: DatabaseCategory.GEOGRAPHY,
  other: DatabaseCategory.OTHER,
};

// ========================
// TYPE GUARDS
// ========================

export const typeGuards = {
  isQueryExecutionResult: (obj: unknown): obj is QueryExecutionResult => {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "rowCount" in obj &&
      "duration" in obj &&
      "columns" in obj &&
      "rows" in obj
    );
  },

  isTableMetadata: (obj: unknown): obj is TableMetadata => {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "name" in obj &&
      "displayName" in obj &&
      "columns" in obj
    );
  },

  isDatabaseError: (obj: unknown): obj is DatabaseError => {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "code" in obj &&
      "message" in obj &&
      "timestamp" in obj
    );
  },

  isModalStateType: <T extends ModalState["type"]>(
    modal: ModalState,
    type: T,
  ): modal is ModalState & { type: T } => {
    return modal.type === type;
  },
};

// ========================
// FACTORY FUNCTIONS
// ========================

export const factories = {
  createDefaultTableMetadata: (name: string): TableMetadata => ({
    name,
    displayName: name,
    category: DatabaseCategory.OTHER,
    description: "",
    recordCount: 0,
    columns: [],
    primaryKey: "id",
    createdAt: new Date(),
    lastModified: new Date(),
    size: 0,
    indexes: [],
  }),

  createDefaultModalState: (): ModalState => ({
    type: "none",
  }),

  createDefaultDashboardSettings: (): DashboardSettings => ({
    autoRefreshInterval: DEFAULT_AUTO_REFRESH_INTERVAL,
    enableAutoRefresh: true,
    defaultViewMode: ViewMode.LIST,
    recordsPerPage: DEFAULT_RECORDS_PER_PAGE,
    showSystemTables: false,
    enableDetailedLogging: false,
    theme: "light",
    compactMode: false,
  }),

  createDefaultPaginationState: (total: number = 0): PaginationState => ({
    currentPage: 1,
    pageSize: DEFAULT_RECORDS_PER_PAGE,
    totalRecords: total,
    totalPages: Math.ceil(total / DEFAULT_RECORDS_PER_PAGE),
  }),
};
