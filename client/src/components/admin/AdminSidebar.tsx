import React from "react";
import { LayoutDashboard, Tags, Building2, Music2, Activity, Settings } from "lucide-react";

type AdminTab =
  | "dashboard"
  | "categories"
  | "businesses"
  | "artists"
  | "activity"
  | "settings";

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  collapsed?: boolean;
}

const ITEMS: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "categories", label: "Categories", icon: <Tags className="h-4 w-4" /> },
  { id: "businesses", label: "Businesses", icon: <Building2 className="h-4 w-4" /> },
  { id: "artists", label: "Artists", icon: <Music2 className="h-4 w-4" /> },
  { id: "activity", label: "Activity", icon: <Activity className="h-4 w-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  collapsed = false,
}: AdminSidebarProps) {
  return (
    <aside
      className={`${collapsed ? "w-20" : "w-64"} border-r border-slate-800 bg-[#0E1422] transition-all duration-200 hidden md:flex md:flex-col`}
    >
      <div className="h-16 px-4 flex items-center border-b border-slate-800">
        <span className="text-sky-300 font-semibold truncate">
          {collapsed ? "VA" : "Verso Air Admin"}
        </span>
      </div>
      <nav className="p-3 space-y-1">
        {ITEMS.map((item) => {
          const selected = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                selected
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  : "text-slate-300 hover:bg-slate-800/80"
              }`}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
