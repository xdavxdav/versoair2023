/**
 * MusicLayout — Layout wrapper for Musical Universe pages
 * Desktop: Left sidebar + main content area (Zentrr Records style)
 * Mobile: Bottom dock navigation
 */
import { ReactNode } from "react";
import { MusicShell } from "@/components/music/MusicShell";
import { MusicSidebar } from "@/components/music/MusicSidebar";
import { MusicMobileDock } from "@/components/music/MusicMobileDock";

interface MusicLayoutProps {
  children: ReactNode;
}

export function MusicLayout({ children }: MusicLayoutProps) {
  return (
    <MusicShell>
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <MusicSidebar />

        {/* Mobile dock */}
        <div className="md:hidden">
          <MusicMobileDock />
        </div>

        {/* Page content — fills remaining width, offset from sidebar on desktop */}
        <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-0 md:ml-16">
          {children}
        </main>
      </div>
    </MusicShell>
  );
}

export default MusicLayout;
