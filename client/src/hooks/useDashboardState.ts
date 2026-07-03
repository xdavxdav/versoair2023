import { useState } from "react";

// Modal states hook
export const useModalStates = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewDataModal, setShowViewDataModal] = useState(false);
  const [showQueryEditor, setShowQueryEditor] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const closeAllModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowViewDataModal(false);
    setShowQueryEditor(false);
    setShowBackupModal(false);
    setShowSettingsModal(false);
    setShowTicketModal(false);
    setShowPreviewDialog(false);
  };

  return {
    showAddModal,
    setShowAddModal,
    showEditModal,
    setShowEditModal,
    showDeleteModal,
    setShowDeleteModal,
    showViewDataModal,
    setShowViewDataModal,
    showQueryEditor,
    setShowQueryEditor,
    showBackupModal,
    setShowBackupModal,
    showSettingsModal,
    setShowSettingsModal,
    showTicketModal,
    setShowTicketModal,
    showPreviewDialog,
    setShowPreviewDialog,
    closeAllModals,
  };
};

// UI state hook (navigation, menu visibility)
export const useUIState = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  return {
    activeTab,
    setActiveTab,
    showNotifications,
    setShowNotifications,
    showUserMenu,
    setShowUserMenu,
    showMobileMenu,
    setShowMobileMenu,
    viewMode,
    setViewMode,
  };
};

// Table management hook
export const useTableManagement = () => {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [currentTableData, setCurrentTableData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(false);

  return {
    selectedTable,
    setSelectedTable,
    currentTableData,
    setCurrentTableData,
    currentPage,
    setCurrentPage,
    totalRecords,
    setTotalRecords,
    isLoadingData,
    setIsLoadingData,
  };
};

// Form data hook
export const useFormData = () => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [recordToDelete, setRecordToDelete] = useState<any>(null);

  const resetFormData = () => setFormData({});

  return {
    formData,
    setFormData,
    recordToDelete,
    setRecordToDelete,
    resetFormData,
  };
};

// Search and filter hook
export const useSearchAndFilter = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBusinessType, setSelectedBusinessType] = useState<
    string | null
  >(null);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedBusinessType(null);
  };

  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedBusinessType,
    setSelectedBusinessType,
    clearFilters,
  };
};

// Query execution hook
export const useQueryExecution = () => {
  const [sqlQuery, setSqlQuery] = useState<string>(
    "SELECT * FROM users LIMIT 10",
  );
  const [queryResult, setQueryResult] = useState<any | null>(null);
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);

  const resetQuery = () => {
    setSqlQuery("SELECT * FROM users LIMIT 10");
    setQueryResult(null);
  };

  return {
    sqlQuery,
    setSqlQuery,
    queryResult,
    setQueryResult,
    isExecutingQuery,
    setIsExecutingQuery,
    resetQuery,
  };
};

// Database state hook
export const useDatabaseState = () => {
  const [databaseHealth, setDatabaseHealth] = useState<any | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  return {
    databaseHealth,
    setDatabaseHealth,
    connectionStatus,
    setConnectionStatus,
    lastFetchTime,
    setLastFetchTime,
    autoRefresh,
    setAutoRefresh,
  };
};

// Ticket management hook
export const useTicketManagement = () => {
  const [ticketFormData, setTicketFormData] = useState<any>({
    title: "",
    description: "",
    status: "open",
    reporter: "",
  });
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<any>(null);

  const resetTicketForm = () => {
    setTicketFormData({
      title: "",
      description: "",
      status: "open",
      reporter: "",
    });
    setEditingTicketId(null);
  };

  return {
    ticketFormData,
    setTicketFormData,
    editingTicketId,
    setEditingTicketId,
    ticketToDelete,
    setTicketToDelete,
    resetTicketForm,
  };
};

// Notifications hook
export const useNotifications = () => {
  const [notifications, setNotifications] = useState([
    {
      id: "1",
      title: "Database Backup",
      description: "Daily backup completed successfully",
      time: "5 min ago",
      read: false,
      type: "success",
    },
    {
      id: "2",
      title: "High CPU Usage",
      description: "Database CPU usage at 85%",
      time: "15 min ago",
      read: false,
      type: "warning",
    },
    {
      id: "3",
      title: "New Table Added",
      description: "Table 'audit_logs' created",
      time: "1 hour ago",
      read: true,
      type: "info",
    },
    {
      id: "4",
      title: "Connection Issue",
      description: "Connection lost for 30 seconds",
      time: "2 hours ago",
      read: true,
      type: "error",
    },
  ]);

  const addNotification = (notification: any) => {
    setNotifications((prev) => [notification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return {
    notifications,
    setNotifications,
    addNotification,
    markAsRead,
    removeNotification,
  };
};

// Backup management hook
export const useBackupManagement = () => {
  const [backupType, setBackupType] = useState<"full" | "partial" | "schema">(
    "full",
  );

  return {
    backupType,
    setBackupType,
  };
};
