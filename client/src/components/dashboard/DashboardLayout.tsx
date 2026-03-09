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
  navbarRef?: React.RefObject<HTMLElement>;
}

type ScrollState = "top" | "down" | "up";

export function DashboardLayout({
  children,
  sections,
  activeSection,
  onSelectSection,
  title = "Dashboard",
  subtitle,
  onRefresh,
  onLogout,
  navbarRef,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [scrollState, setScrollState] = useState<ScrollState>("top");

  const headerRef = useRef<HTMLDivElement>(null);

  const lastScrollY = useRef(0);
  const scrollAccumulator = useRef(0);
  const rafId = useRef<number | null>(null);

  const headerHeightRef = useRef(0);
  const headerOffsetRef = useRef(0);
  const navbarBottomRef = useRef(0);

  const [headerHeight, setHeaderHeight] = useState(0);

  const SCROLL_THRESHOLD = 10;

  /*
  ------------------------------------------------
  MEASURE HEADER + NAVBAR
  ------------------------------------------------
  */

  const measure = () => {
    if (headerRef.current) {
      headerHeightRef.current = headerRef.current.offsetHeight;
      headerOffsetRef.current = headerRef.current.offsetTop;
      setHeaderHeight(headerHeightRef.current);
    }

    if (navbarRef?.current) {
      const rect = navbarRef.current.getBoundingClientRect();
      navbarBottomRef.current = rect.bottom;
    }
  };

  /*
  ------------------------------------------------
  SCROLL HANDLER
  ------------------------------------------------
  */

  const updateScroll = () => {
    rafId.current = null;

    const currentY = window.scrollY;
    const delta = currentY - lastScrollY.current;

    if (navbarRef?.current) {
      const rect = navbarRef.current.getBoundingClientRect();
      navbarBottomRef.current = rect.bottom;
    }

    const pastHeader =
      currentY > headerOffsetRef.current + headerHeightRef.current;

    if (currentY < 5 || !pastHeader) {
      scrollAccumulator.current = 0;
      setScrollState("top");
    } else {
      scrollAccumulator.current += delta;

      if (scrollAccumulator.current > SCROLL_THRESHOLD) {
        scrollAccumulator.current = 0;
        setScrollState("down");
      }

      if (scrollAccumulator.current < -SCROLL_THRESHOLD) {
        scrollAccumulator.current = 0;
        setScrollState("up");
      }
    }

    if (headerRef.current && scrollState !== "top") {
      headerRef.current.style.top = `${navbarBottomRef.current}px`;
    }

    lastScrollY.current = currentY;
  };

  const handleScroll = () => {
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(updateScroll);
  };

  /*
  ------------------------------------------------
  EFFECTS
  ------------------------------------------------
  */

  useEffect(() => {
    measure();

    const resizeObserver = new ResizeObserver(measure);

    if (headerRef.current) {
      resizeObserver.observe(headerRef.current);
    }

    if (navbarRef?.current) {
      resizeObserver.observe(navbarRef.current);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", measure);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", measure);

      if (rafId.current !== null) cancelAnimationFrame(rafId.current);

      resizeObserver.disconnect();
    };
  }, []);

  /*
  ------------------------------------------------
  REFRESH HANDLER
  ------------------------------------------------
  */

  const handleRefresh = async () => {
    setIsRefreshing(true);

    if (onRefresh) {
      await onRefresh();
    }

    setTimeout(() => setIsRefreshing(false), 500);
  };

  /*
  ------------------------------------------------
  HEADER STYLE LOGIC
  ------------------------------------------------
  */

  const headerFixed = scrollState !== "top";

  const headerStyle: React.CSSProperties | undefined = headerFixed
    ? {
        top: `${navbarBottomRef.current}px`,
        transform: scrollState === "up" ? "translateY(0)" : "translateY(-100%)",
        opacity: scrollState === "up" ? 1 : 0,
        pointerEvents: scrollState === "up" ? "auto" : "none",
        willChange: "transform, opacity",
      }
    : undefined;

  /*
  ------------------------------------------------
  RENDER
  ------------------------------------------------
  */

  return (
    <div className="flex flex-1 bg-slate-950 text-white min-h-screen overflow-x-hidden">
      <DashboardSidebar
        sections={sections}
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        isOpen={sidebarOpen}
        onToggle={setSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER */}

        <header
          ref={headerRef}
          className={`px-3 sm:px-6 py-4 z-30 transition-[transform,opacity] duration-250
          ${
            headerFixed
              ? "fixed left-0 right-0 lg:left-64 bg-slate-900/90 backdrop-blur-md border-b border-slate-700/60 shadow-lg"
              : "bg-slate-900 border-b border-slate-700"
          }`}
          style={{
            ...headerStyle,
            transitionTimingFunction: "cubic-bezier(0.25,0.46,0.45,0.94)",
          }}
        >
          <div className="flex items-center justify-between gap-4">
            {/* LEFT */}

            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold truncate">
                  {title}
                </h2>

                {subtitle && (
                  <p className="text-xs sm:text-sm text-slate-400 mt-1 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT */}

            <div className="flex items-center gap-2 sm:gap-4">
              {onRefresh && (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-5 h-5 text-slate-400 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                  />
                </button>
              )}

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Logout</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* SPACER */}

        <div
          aria-hidden="true"
          style={{
            height: headerFixed ? headerHeight : 0,
            flexShrink: 0,
          }}
        />

        {/* CONTENT */}

        <main className="flex-1 overflow-x-hidden">
          <div className="p-4 md:p-6 space-y-6 max-w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
