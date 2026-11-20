import { type ReactNode } from "react";
import { MusicLayout } from "@/layouts/MusicLayout";
import { MusicShell } from "@/components/music/MusicShell";
import { cn } from "@/lib/utils";
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
  if (chrome === "site") {
    return (
      <div className={cn("dark tmu-surface", className)}>
        <MusicShell className="pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
          {children}
        </MusicShell>
      </div>
    );
  }

  return (
    <div className={cn("dark tmu-surface", className)}>
      <MusicLayout>{children}</MusicLayout>
    </div>
  );
}

export default TmuShell;
