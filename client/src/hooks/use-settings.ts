import { useState, useEffect } from "react";

export interface UserSettings {
  // Performance Settings
  autoRefresh: boolean;
  autoVacuumFrequency: "Never" | "Daily" | "Weekly" | "Monthly";
  queryTimeout: number;
  autoIndexOptimization: boolean;
  connectionPooling: boolean;
  maxConnections: number;
  backupSchedule: "Hourly" | "Daily" | "Weekly" | "Manual";
  monitoringAlerts: boolean;

  // Table View Preferences
  visibleColumns: string[];
  sortBy: "Name" | "Size" | "Rows" | "Importance";
  rowsPerPage: 10 | 25 | 50 | 100;
  refreshInterval: number;
  highlightImportant: boolean;
  resizableColumns: boolean;
  compactView: boolean;

  // Security Settings
  userRole: "Admin" | "Editor" | "Viewer" | "Guest";
  apiKeyManagement: boolean;
  ipWhitelist: string[];
  dataEncryption: boolean;
  auditTrail: boolean;
  passwordPolicy: {
    minLength: boolean;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSpecial: boolean;
  };

  // System Settings
  theme: "Light" | "Dark" | "Auto";
  language: string;
  timezone: string;
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  exportFormat: "CSV" | "JSON" | "Excel" | "XML";
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationFrequency: "Realtime" | "Hourly" | "Daily" | "Weekly";
}

const DEFAULT_SETTINGS: UserSettings = {
  // Performance Settings
  autoRefresh: true,
  autoVacuumFrequency: "Daily",
  queryTimeout: 60,
  autoIndexOptimization: true,
  connectionPooling: true,
  maxConnections: 20,
  backupSchedule: "Daily",
  monitoringAlerts: true,

  // Table View Preferences
  visibleColumns: ["Name", "Type", "Columns", "Size", "Rows", "Indexes"],
  sortBy: "Name",
  rowsPerPage: 25,
  refreshInterval: 30,
  highlightImportant: true,
  resizableColumns: true,
  compactView: false,

  // Security Settings
  userRole: "Admin",
  apiKeyManagement: true,
  ipWhitelist: ["127.0.0.1"],
  dataEncryption: true,
  auditTrail: true,
  passwordPolicy: {
    minLength: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecial: true,
  },

  // System Settings
  theme: "Auto",
  language: "English",
  timezone: "UTC",
  dateFormat: "MM/DD/YYYY",
  exportFormat: "CSV",
  emailNotifications: true,
  pushNotifications: true,
  notificationFrequency: "Daily",
};

const SETTINGS_KEY = "app_user_settings";

export const useSettings = () => {
  const [settings, setSettingsState] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettingsState({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage whenever they change
  const updateSettings = (newSettings: Partial<UserSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettingsState(updated);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to save settings to localStorage:", error);
    }
  };

  // Reset settings to defaults
  const resetSettings = () => {
    setSettingsState(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem(SETTINGS_KEY);
    } catch (error) {
      console.error("Failed to reset settings:", error);
    }
  };

  // Export settings as JSON
  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `user-settings-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import settings from JSON file
  const importSettings = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        updateSettings(imported);
      } catch (error) {
        console.error("Failed to import settings:", error);
      }
    };
    reader.readAsText(file);
  };

  return {
    settings,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
    isLoaded,
  };
};
