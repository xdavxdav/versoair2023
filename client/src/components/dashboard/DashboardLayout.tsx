import React, { useState } from "react";
import { RefreshCw, Menu } from "lucide-react";
import { DashboardSidebar, NavSection } from "./DashboardSidebar";
import { LogoutDropdown } from "@/components/ui/logout-dropdown";

export interface DashboardLayoutProps {
  children: React.ReactNode;
  sections: NavSection[];
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
}

export function DashboardLayout({
  children,
  sections,
  activeSection,
  onSelectSection,
  title = "Dashboard",
  subtitle,
  onRefresh,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="flex flex-1 bg-slate-950 text-white min-h-screen overflow-x-hidden">
      {/* Sidebar — fixed overlay on mobile/tablet, sticky on desktop */}
      <DashboardSidebar
        sections={sections}
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        isOpen={sidebarOpen}
        onToggle={setSidebarOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar — sticky: stays in flow, no scroll jump */}
        <header className="sticky top-0 bg-slate-900 border-b border-slate-700 px-3 sm:px-6 py-4 z-30 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            {/* Left Section */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold text-white truncate">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-slate-400 mt-1 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
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
              <LogoutDropdown variant="red-subtle" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-x-hidden">
          <div className="p-4 md:p-6 space-y-6 max-w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
