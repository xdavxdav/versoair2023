import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import DashboardTab from "@/components/admin/DashboardTab";
import CategoriesTab from "@/components/admin/CategoriesTab";
import BusinessesTab from "@/components/admin/BusinessesTab";
import ArtistsTab from "@/components/admin/ArtistsTab";
import ActivityTab from "@/components/admin/ActivityTab";
import SettingsTab from "@/components/admin/SettingsTab";

const API_BASE_URL = "";

type AdminTab =
  | "dashboard"
  | "categories"
  | "businesses"
  | "artists"
  | "activity"
  | "settings";

export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    categories: "0",
    businesses: "0",
    artists: "0",
    active: "0",
  });

  const loadDashboardData = async () => {
    try {
      const [statusRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/status`),
        fetch(`${API_BASE_URL}/api/public/dashboard-stats`),
      ]);
      setDbConnected(statusRes.ok);

      if (statsRes.ok) {
        const json = await statsRes.json();
        setStats({
          categories: Number(json.categoriesCount || 0).toLocaleString(),
          businesses: Number(json.totalBusinesses || 0).toLocaleString(),
          artists: Number(json.artistCount || 0).toLocaleString(),
          active: Number(json.activeBusinesses || json.totalBusinesses || 0).toLocaleString(),
        });
      }
    } catch {
      setDbConnected(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setTimeout(() => setIsRefreshing(false), 300);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardTab
            stats={stats}
            setActiveTab={setActiveTab}
            dbConnected={dbConnected}
          />
        );
      case "categories":
        return <CategoriesTab />;
      case "businesses":
        return <BusinessesTab />;
      case "artists":
        return <ArtistsTab />;
      case "activity":
        return <ActivityTab />;
      case "settings":
        return <SettingsTab dbConnected={dbConnected} />;
      default:
        return (
          <DashboardTab
            stats={stats}
            setActiveTab={setActiveTab}
            dbConnected={dbConnected}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex">
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          dbConnected={dbConnected}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 overflow-auto p-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto"
          >
            {renderContent()}
          </motion.div>
        </main>

        <footer className="border-t border-slate-800 px-6 py-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-slate-500">
            <span>Verso Air Admin Console</span>
            <span>•</span>
            <span>© 2024 Verso Air</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span>Last sync:</span>
            <span className="text-slate-400">{new Date().toLocaleTimeString()}</span>
          </div>
        </footer>
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />
      </div>
    </div>
  );
}
