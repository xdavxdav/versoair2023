import React from "react";
import {
  Menu,
  X,
  Store,
  Tag,
  Megaphone,
  Briefcase,
  Users,
  Globe,
  BarChart3,
  Settings,
  ChevronRight,
} from "lucide-react";

export interface NavSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subsections?: NavSubsection[];
}

export interface NavSubsection {
  id: string;
  label: string;
  action: () => void;
}

export interface DashboardSidebarProps {
  sections: NavSection[];
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export function DashboardSidebar({
  sections,
  activeSection,
  onSelectSection,
  isOpen,
  onToggle,
}: DashboardSidebarProps) {
  const [expandedSection, setExpandedSection] = React.useState<string | null>(
    null,
  );

  // Lock body scroll when sidebar overlay is open (mobile)
  React.useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const activeSection_ = sections.find((s) => s.id === activeSection);
  const hasSubsections = activeSection_ && activeSection_.subsections;

  return (
    <>
      {/* Sidebar Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-[99999] overscroll-contain"
          onClick={() => onToggle(false)}
          onTouchMove={(e) => e.preventDefault()}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-700 transition-all duration-300 z-[100000] lg:z-40 overflow-y-auto overscroll-contain ${
          isOpen
            ? "translate-x-0 visible"
            : "-translate-x-full lg:translate-x-0 invisible lg:visible"
        }`}
      >
        <div className="p-6 space-y-8">
          {/* Logo + Close */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">A</span>
              </div>
              <h1 className="text-xl font-bold text-white">Dashboard</h1>
            </div>
            <button
              onClick={() => onToggle(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Sections */}
          <nav className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              const isExpanded = expandedSection === section.id;

              return (
                <div key={section.id}>
                  <button
                    onClick={() => {
                      onSelectSection(section.id);
                      if (section.subsections) {
                        setExpandedSection(isExpanded ? null : section.id);
                      }
                      onToggle(false); // Close mobile sidebar
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1 text-left font-medium">
                      {section.label}
                    </span>
                    {section.subsections && (
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    )}
                  </button>

                  {/* Subsections */}
                  {section.subsections && isExpanded && (
                    <div className="mt-2 ml-4 space-y-1 border-l border-slate-700 pl-4">
                      {section.subsections.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={sub.action}
                          className="w-full text-left px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="border-t border-slate-700" />

          {/* System Sections */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4">
              System
            </p>
            {[
              { id: "analytics", label: "Analytics", icon: BarChart3 },
              { id: "settings", label: "Settings", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectSection(item.id);
                    onToggle(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
