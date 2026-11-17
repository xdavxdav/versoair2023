/**
 * My Live Sessions Page — User's personal dashboard for managing live sessions
 * Shows all sessions, allows creation and management
 */

import { useEffect } from "react";
import { Link } from "wouter";
import { UserSessionDashboard } from "@/components/UserSessionDashboard";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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
      <div className="min-h-screen bg-gradient-to-br from-verso-navy via-verso-purple to-verso-navy flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Sign In Required</h1>
          <p className="text-white/60 mb-6">
            You need to be signed in to view your live sessions
          </p>
          <Link href="/auth/signin">
            <Button className="bg-amber-500 hover:bg-amber-600 text-verso-navy font-semibold">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-verso-navy via-verso-purple to-verso-navy">
      {/* Header */}
      <div className="border-b border-verso-navy/50 bg-verso-navy/30 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/music">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/60 hover:text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Radio className="w-8 h-8 text-amber-500" />
                My Live Sessions
              </h1>
              <p className="text-white/60 text-sm mt-1">
                Manage and create your listening sessions
              </p>
            </div>
          </div>

          <Button
            onClick={() => setShowGoLiveForm(true)}
            className="bg-amber-500 hover:bg-amber-600 text-verso-navy font-semibold"
          >
            <Radio className="w-4 h-4 mr-2" />
            Create Session
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
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
    </div>
  );
}

export default MyLiveSessionsPage;
