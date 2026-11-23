/**
 * My Live Sessions Page — User's personal dashboard for managing live sessions
 * Shows all sessions, allows creation and management
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { UserSessionDashboard } from "@/components/UserSessionDashboard";
import { TmuHubNav } from "@/components/music/TmuHubNav";
import { TmuShell } from "@/components/music/TmuShell";
import { Button } from "@/components/ui/button";
import { GoLiveForm } from "@/components/GoLiveForm";
import { useAuthContext } from "@/contexts/AuthContext";
import { ChevronLeft, Radio } from "lucide-react";

export function MyLiveSessionsPage() {
  const { user } = useAuthContext();
  const [showGoLiveForm, setShowGoLiveForm] = useState(false);

  useEffect(() => {
    document.title = "My Live Sessions - VersoAir";
  }, []);

  if (!user) {
    return (
      <TmuShell chrome="site">
        <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center p-4 text-center">
          <div className="tmu-glass-elevated w-full rounded-2xl p-6">
            <Radio className="mx-auto mb-3 h-8 w-8 text-fuchsia-300" />
            <h1 className="text-2xl font-bold text-white mb-2">Sign In Required</h1>
            <p className="text-slate-300 text-sm mb-6">
              You need to be signed in to view your live sessions
            </p>
            <Link href="/auth/signin">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-semibold">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </TmuShell>
    );
  }

  return (
    <TmuShell chrome="site">
      <div className="mx-auto w-full max-w-6xl px-4 pt-6">
        <TmuHubNav currentSurface="my-live-sessions" className="mb-6" />

        {/* Header */}
        <header className="tmu-glass-elevated rounded-2xl p-5 sm:p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <Link href="/music">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Back to Musical Universe"
                  className="border-purple-500/30 bg-[#180d34]/75 text-slate-200 hover:bg-purple-500/20 hover:text-white shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
                  <Radio className="w-7 h-7 text-fuchsia-400 shrink-0" />
                  <span className="tmu-hero-title truncate">My Live Sessions</span>
                </h1>
                <p className="text-slate-300 text-sm mt-1">
                  Manage and create your listening sessions
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowGoLiveForm(true)}
              className="bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-semibold shadow-[0_0_20px_rgba(147,51,234,0.35)]"
            >
              <Radio className="w-4 h-4 mr-2" />
              Create Session
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <UserSessionDashboard />
      </div>

      {/* Go Live Form Modal */}
      <GoLiveForm
        isOpen={showGoLiveForm}
        onClose={() => setShowGoLiveForm(false)}
        onSuccess={() => {
          // Optionally redirect or show success message
        }}
      />
    </TmuShell>
  );
}

export default MyLiveSessionsPage;
