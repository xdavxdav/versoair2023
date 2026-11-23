import { type ReactNode } from "react";
import { MusicLayout } from "@/layouts/MusicLayout";
import { MusicShell } from "@/components/music/MusicShell";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import "@/styles/tmu-theme.css";

interface TmuShellProps {
  children: ReactNode;
  /**
   * "music" mounts MusicLayout (MusicSidebar + MusicMobileDock) for pages in MUSIC_ROUTE_PREFIXES.
   * "site" mounts MusicShell with bottom dock clearance for pages that keep global site chrome.
   */
  chrome?: "music" | "site";
  className?: string;
}

export function TmuShell({
  children,
  chrome = "music",
  className,
}: TmuShellProps) {
  const { resolvedTheme } = useTheme();
  const surfaceClass = resolvedTheme === "dark" ? "dark tmu-surface" : "tmu-surface tmu-light";

  if (chrome === "site") {
    return (
      <div className={cn(surfaceClass, className)}>
        <MusicShell className="pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
          {children}
        </MusicShell>
      </div>
    );
  }

  return (
    <div className={cn(surfaceClass, className)}>
      <MusicLayout>{children}</MusicLayout>
    </div>
  );
}

export default TmuShell;
