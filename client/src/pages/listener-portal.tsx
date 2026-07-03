/**
 * Listener Portal — Redirects to /stream (all listener features now in stream page)
 */

import { useEffect } from "react";
import { useLocation } from "wouter";

export default function ListenerPortal() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/stream", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Redirecting to Stream...</p>
      </div>
    </div>
  );
}
