import React, { useState } from "react";
import { Search, RefreshCw, LogOut, Menu } from "lucide-react";
import { DashboardSidebar, NavSection } from "./DashboardSidebar";

export interface DashboardLayoutProps {
  children: React.ReactNode;
  sections: NavSection[];
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  onLogout?: () => void;
}

export function DashboardLayout({
  children,
  sections,
  activeSection,
  onSelectSection,
  title = "Dashboard",
  subtitle,
  onRefresh,
  onLogout,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="flex flex-1 bg-slate-950 text-white min-h-screen">
      {/* Sidebar — fixed overlay on mobile/tablet, sticky on desktop */}
      <DashboardSidebar
        sections={sections}
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        isOpen={sidebarOpen}
        onToggle={setSidebarOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-slate-900 border-b border-slate-700 px-6 py-4 lg:ml-0 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            {/* Left Section */}
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                {subtitle && (
                  <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
                )}
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="hidden md:flex items-center bg-slate-800 border border-slate-700 rounded-lg px-4 py-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ml-2 bg-transparent outline-none text-sm text-white placeholder-slate-500 w-48"
                />
              </div>

              {/* Refresh Button */}
              {onRefresh && (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh data"
                >
                  <RefreshCw
                    className={`w-5 h-5 text-slate-400 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                  />
                </button>
              )}

              {/* Logout Button */}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Logout</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden mt-4 flex items-center bg-slate-800 border border-slate-700 rounded-lg px-4 py-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ml-2 bg-transparent outline-none text-sm text-white placeholder-slate-500 w-full"
            />
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 md:p-6 space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
