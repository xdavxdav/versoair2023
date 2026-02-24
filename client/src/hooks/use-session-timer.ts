import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export function useSessionTimer(
  isAuthenticated: boolean,
  enableTimeout: boolean = false,
) {
  const SESSION_DURATION = 15 * 60; // 15 minutes in seconds (only used if enableTimeout is true)
  const WARNING_THRESHOLD = 60; // show warning at 1 minute remaining
  const { toast } = useToast();

  const [sessionTimeLeft, setSessionTimeLeft] = useState(SESSION_DURATION);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const sessionWarningShown = useRef(false);

  // Session countdown timer - only active if enableTimeout is true
  useEffect(() => {
    if (!isAuthenticated || !enableTimeout) {
      setSessionTimeLeft(SESSION_DURATION);
      sessionWarningShown.current = false;
      return;
    }

    const timer = setInterval(() => {
      setSessionTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-logout: token is stored in HttpOnly cookie (server handles cleanup)
          // Only clear localStorage display state
          localStorage.removeItem("adminAccessTime");
          localStorage.removeItem("auth_token"); // for backward compat, though cookie is source of truth
          localStorage.removeItem("authToken");
          toast({
            title: "Session Expired",
            description:
              "Your 15-minute session has ended. Please log in again.",
            variant: "destructive",
          });
          return 0;
        }
        // Show warning at 1 minute remaining
        if (prev - 1 <= WARNING_THRESHOLD && !sessionWarningShown.current) {
          sessionWarningShown.current = true;
          setShowSessionWarning(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuthenticated, enableTimeout, toast]);

  const handleExtendSession = useCallback(() => {
    setSessionTimeLeft(SESSION_DURATION);
    sessionWarningShown.current = false;
    setShowSessionWarning(false);
    toast({
      title: "Session Extended ✅",
      description: "Your session has been extended by 15 minutes.",
    });
  }, [toast]);

  const formatTimeLeft = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  const sessionProgress =
    ((SESSION_DURATION - sessionTimeLeft) / SESSION_DURATION) * 100;
  const isSessionCritical = sessionTimeLeft <= WARNING_THRESHOLD;
  const isSessionLow = sessionTimeLeft <= 5 * 60; // under 5 min

  return {
    sessionTimeLeft,
    showSessionWarning,
    setShowSessionWarning,
    handleExtendSession,
    formatTimeLeft,
    sessionProgress,
    isSessionCritical,
    isSessionLow,
    SESSION_DURATION,
    WARNING_THRESHOLD,
  };
}
