/**
 * Database Dashboard Constants
 * Centralized constants for database operations and UI configuration
 */

// ========================
// DATABASE CONFIGURATION
// ========================

export const DB_CONFIG = {
  API_BASE_URL: process.env.REACT_APP_API_URL || "",
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RECONNECT_INTERVAL: 5000,
} as const;

// ========================
// PAGINATION & DISPLAY
// ========================

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MIN_PAGE_SIZE: 5,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [5, 10, 20, 50, 100],
} as const;

// ========================
// QUERY EXECUTION
// ========================

export const QUERY_CONFIG = {
  DEFAULT_QUERY: "SELECT * FROM users LIMIT 10",
  MAX_RESULT_ROWS: 10000,
  QUERY_TIMEOUT: 30000,
  EDITOR_MIN_HEIGHT: 200,
  EDITOR_MAX_HEIGHT: 600,
} as const;

// ========================
// AUTO-REFRESH & TIMING
// ========================

export const TIMING_CONFIG = {
  AUTO_REFRESH_INTERVAL: 30000, // 30 seconds
  HEALTH_CHECK_INTERVAL: 30000,
  STALE_TIME_HEALTH: 30000,
  STALE_TIME_TABLES: 60000,
  STALE_TIME_CATEGORIES: 300000,
  GC_TIME: 600000, // 10 minutes
} as const;

// ========================
// BACKUP SETTINGS
// ========================

export const BACKUP_CONFIG = {
  RETENTION_DAYS: 30,
  MAX_BACKUPS: 10,
  AUTO_BACKUP_ENABLED: false,
  AUTO_BACKUP_INTERVAL: 86400000, // 24 hours
} as const;

// ========================
// EXPERT CATEGORIES
// ========================

export const EXPERT_CATEGORIES = [
  { id: "users", label: "Users", color: "bg-blue-100", icon: "👥" },
  { id: "businesses", label: "Businesses", color: "bg-green-100", icon: "🏢" },
  { id: "categories", label: "Categories", color: "bg-purple-100", icon: "📁" },
  { id: "reviews", label: "Reviews", color: "bg-yellow-100", icon: "⭐" },
  {
    id: "reservations",
    label: "Reservations",
    color: "bg-pink-100",
    icon: "📅",
  },
  { id: "analytics", label: "Analytics", color: "bg-indigo-100", icon: "📊" },
  {
    id: "advertising",
    label: "Advertising",
    color: "bg-orange-100",
    icon: "📢",
  },
  { id: "payments", label: "Payments", color: "bg-green-100", icon: "💳" },
  { id: "jobs", label: "Jobs", color: "bg-red-100", icon: "💼" },
  { id: "music", label: "Music", color: "bg-pink-100", icon: "🎵" },
  { id: "content", label: "Content", color: "bg-blue-100", icon: "📝" },
  { id: "geography", label: "Geography", color: "bg-teal-100", icon: "🗺️" },
  { id: "other", label: "Other", color: "bg-gray-100", icon: "📦" },
] as const;

// ========================
// VIEW MODE & DISPLAY
// ========================

export const VIEW_CONFIG = {
  DEFAULT_VIEW: "list" as const,
  GRID_COLUMNS: {
    mobile: 1,
    tablet: 2,
    desktop: 3,
  },
  TABLE_ROW_HEIGHT: 48,
} as const;

// ========================
// EXPORT FORMATS
// ========================

export const EXPORT_CONFIG = {
  FORMATS: ["csv", "json", "sql"] as const,
  MAX_EXPORT_ROWS: 50000,
  DEFAULT_FORMAT: "csv" as const,
  MIME_TYPES: {
    csv: "text/csv",
    json: "application/json",
    sql: "application/sql",
  },
  FILENAME_PREFIX: "export",
  TIMESTAMP_FORMAT: "YYYY-MM-DD_HH-mm-ss",
} as const;

// ========================
// ERROR HANDLING
// ========================

export const ERROR_CONFIG = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  TIMEOUT_ERROR_MESSAGE: "Query execution timed out",
  CONNECTION_ERROR_MESSAGE: "Failed to connect to database",
  UNKNOWN_ERROR_MESSAGE: "An unexpected error occurred",
} as const;

// ========================
// UI CONFIGURATION
// ========================

export const UI_CONFIG = {
  TOAST_DURATION: 3000,
  MODAL_ANIMATION_DURATION: 200,
  DEBOUNCE_DELAY: 300,
  ANIMATION_TRANSITIONS: {
    fast: "150ms",
    normal: "200ms",
    slow: "300ms",
  },
  Z_INDEX: {
    dropdown: 100,
    modal: 1000,
    popover: 50,
    tooltip: 500,
  },
} as const;

// ========================
// ACCESSIBILITY
// ========================

export const A11Y_CONFIG = {
  FOCUS_VISIBLE_OUTLINE: "2px solid #4F46E5",
  FOCUS_VISIBLE_OFFSET: "2px",
  KEYBOARD_DEBOUNCE: 150,
  SKIP_LINK_ID: "skip-to-main",
  MAIN_CONTENT_ID: "main-content",
} as const;

// ========================
// STATUS INDICATORS
// ========================

export const STATUS_COLORS = {
  success: "text-green-600",
  error: "text-red-600",
  warning: "text-yellow-600",
  info: "text-blue-600",
  loading: "text-gray-600",
} as const;

export const STATUS_ICONS = {
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
  loading: "⏳",
} as const;

// ========================
// LOCAL STORAGE KEYS
// ========================

export const STORAGE_KEYS = {
  USER_PREFERENCES: "db_dashboard_preferences",
  SAVED_QUERIES: "db_dashboard_queries",
  LAYOUT_STATE: "db_dashboard_layout",
  THEME: "db_dashboard_theme",
  SIDEBAR_COLLAPSED: "db_dashboard_sidebar_collapsed",
} as const;

// ========================
// REGEX PATTERNS
// ========================

export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  TABLE_NAME: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
  COLUMN_NAME: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
  SQL_IDENTIFIER: /^[a-zA-Z_"][a-zA-Z0-9_"]*$/,
} as const;

// ========================
// PLACEHOLDER TEXTS
// ========================

export const PLACEHOLDERS = {
  SEARCH_TABLES: "Search tables by name or description...",
  SEARCH_QUERY: "Enter SQL query or select from saved queries...",
  QUERY_EDITOR:
    "-- Write your SQL query here\nSELECT * FROM table_name LIMIT 10;",
  FILTER_BY_CATEGORY: "Filter by category...",
  BACKUP_NAME: "Enter backup name (optional)",
} as const;

// ========================
// HELP TEXT & TOOLTIPS
// ========================

export const HELP_TEXT = {
  TEST_CONNECTION: "Test the connection to the database",
  EXECUTE_QUERY: "Execute the SQL query (Ctrl+Enter)",
  EXPORT_RESULTS: "Export query results to CSV or JSON",
  REFRESH_DATA: "Refresh table data",
  ADD_RECORD: "Add a new record to this table",
  EDIT_RECORD: "Edit the selected record",
  DELETE_RECORD: "Delete the selected record",
  CREATE_BACKUP: "Create a backup of the database",
  RESTORE_BACKUP: "Restore from a backup",
  VIEW_SETTINGS: "Open dashboard settings",
} as const;

// ========================
// KEYBOARD SHORTCUTS
// ========================

export const KEYBOARD_SHORTCUTS = {
  EXECUTE_QUERY: {
    key: "Enter",
    ctrl: true,
    shift: false,
    description: "Execute Query",
  },
  CLOSE_MODAL: {
    key: "Escape",
    ctrl: false,
    shift: false,
    description: "Close Modal",
  },
  SAVE: { key: "s", ctrl: true, shift: false, description: "Save" },
  FOCUS_SEARCH: {
    key: "k",
    ctrl: true,
    shift: false,
    description: "Focus Search",
  },
  REFRESH: { key: "r", ctrl: true, shift: false, description: "Refresh" },
  TOGGLE_SIDEBAR: {
    key: "b",
    ctrl: true,
    shift: false,
    description: "Toggle Sidebar",
  },
  CLEAR: { key: "l", ctrl: true, shift: false, description: "Clear" },
} as const;

// ========================
// VALIDATORS
// ========================

export const VALIDATION = {
  MIN_QUERY_LENGTH: 5,
  MAX_QUERY_LENGTH: 50000,
  MIN_TABLE_NAME_LENGTH: 1,
  MAX_TABLE_NAME_LENGTH: 255,
  MIN_COLUMN_NAME_LENGTH: 1,
  MAX_COLUMN_NAME_LENGTH: 255,
} as const;

// ========================
// TYPE EXPORTS FOR STRICT TYPING
// ========================

export type DBConfig = typeof DB_CONFIG;
export type PaginationConfig = typeof PAGINATION_CONFIG;
export type QueryConfig = typeof QUERY_CONFIG;
export type TimingConfig = typeof TIMING_CONFIG;
export type BackupConfig = typeof BACKUP_CONFIG;
export type ViewConfig = typeof VIEW_CONFIG;
export type ExportConfig = typeof EXPORT_CONFIG;
export type ErrorConfig = typeof ERROR_CONFIG;
export type UIConfig = typeof UI_CONFIG;
export type A11yConfig = typeof A11Y_CONFIG;
export type StorageKeys = typeof STORAGE_KEYS;
export type Patterns = typeof PATTERNS;
export type Placeholders = typeof PLACEHOLDERS;
export type HelpText = typeof HELP_TEXT;
export type KeyboardShortcuts = typeof KEYBOARD_SHORTCUTS;
export type Validation = typeof VALIDATION;

// ========================
// EXPORT ALL CONSTANTS
// ========================

export const DATABASE_CONSTANTS = {
  DB_CONFIG,
  PAGINATION_CONFIG,
  QUERY_CONFIG,
  TIMING_CONFIG,
  BACKUP_CONFIG,
  EXPERT_CATEGORIES,
  VIEW_CONFIG,
  EXPORT_CONFIG,
  ERROR_CONFIG,
  UI_CONFIG,
  A11Y_CONFIG,
  STATUS_COLORS,
  STATUS_ICONS,
  STORAGE_KEYS,
  PATTERNS,
  PLACEHOLDERS,
  HELP_TEXT,
  KEYBOARD_SHORTCUTS,
  VALIDATION,
} as const;
