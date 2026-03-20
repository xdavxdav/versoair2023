import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, LogOut, Menu } from "lucide-react";
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Elevator (ascenseur) scroll reveal:
  // - Normal: header in document flow under navbar
  // - Scroll down: slides up and disappears
  // - Scroll back up: slides back down from under the navbar
  const [scrollDir, setScrollDir] = useState<"up" | "down" | "top">("top");
  // Use ref for navbarBottom so DOM updates don't trigger React re-renders on every scroll
  const navbarBottomRef = useRef(124);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const headerNaturalOffset = useRef(0);
  const tickerRef = useRef<Element | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    // Cache ticker element once — avoid querySelector on every scroll
    tickerRef.current = document.querySelector(".bg-primary.text-white.overflow-hidden");

    const measure = () => {
      if (headerRef.current) {
        headerNaturalOffset.current = headerRef.current.offsetTop;
      }
      if (tickerRef.current) {
        const rect = tickerRef.current.getBoundingClientRect();
        navbarBottomRef.current = Math.max(0, rect.bottom);
      }
    };
    measure();

    const handleScroll = () => {
      // Cancel any pending frame to avoid stacking
      if (rafId.current !== null) return;
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        const currentY = window.scrollY;

        // Only re-measure ticker when near top (header visible region)
        if (tickerRef.current && currentY < 200) {
          const rect = tickerRef.current.getBoundingClientRect();
          navbarBottomRef.current = Math.max(0, rect.bottom);
        }

        const pastHeader = currentY > headerNaturalOffset.current + 60;

        if (!pastHeader) {
          setScrollDir("top");
        } else if (currentY < lastScrollY.current) {
          setScrollDir("up");
        } else {
          setScrollDir("down");
        }
        lastScrollY.current = currentY;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", measure);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, []);

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
        {/* Top Bar — ascenseur: slides down from under navbar on scroll up */}
        <header
          ref={headerRef}
          className={`bg-slate-900 border-b border-slate-700 px-3 sm:px-6 py-4 z-30 transition-[transform,opacity] duration-300 ease-out ${
            scrollDir === "top"
              ? ""
              : "fixed left-0 right-0 lg:left-64 shadow-lg"
          }`}
          style={
            scrollDir === "top"
              ? undefined
              : {
                  top: `${navbarBottomRef.current}px`,
                  transform: scrollDir === "up" ? "translateY(0)" : "translateY(-100%)",
                  opacity: scrollDir === "up" ? 1 : 0,
                  pointerEvents: scrollDir === "up" ? "auto" : "none",
                  willChange: "transform, opacity",
                }
          }
        >
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
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-x-hidden">
          <div className="p-4 md:p-6 space-y-6 max-w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
