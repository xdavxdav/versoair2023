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
    <div className="min-h-screen bg-[#f3efe9] flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
        <p className="text-slate-600">Redirecting to Stream...</p>
      </div>
    </div>
  );
}
