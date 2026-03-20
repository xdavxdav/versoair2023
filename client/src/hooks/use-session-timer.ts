import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "geoadmin_session_start";

export function useSessionTimer(
  isAuthenticated: boolean,
  enableTimeout: boolean = false,
  onSessionExpired?: () => void,
) {
  const SESSION_DURATION = 15 * 60; // 15 minutes in seconds
  const WARNING_THRESHOLD = 60; // show warning at 1 minute remaining
  const { toast } = useToast();

  // Compute initial time left from persisted start time
  const getInitialTimeLeft = useCallback(() => {
    if (!enableTimeout) return SESSION_DURATION;
    const startStr = localStorage.getItem(STORAGE_KEY);
    if (!startStr) return SESSION_DURATION;
    const elapsed = Math.floor((Date.now() - parseInt(startStr, 10)) / 1000);
    const remaining = SESSION_DURATION - elapsed;
    return remaining > 0 ? remaining : 0;
  }, [enableTimeout, SESSION_DURATION]);

  const [sessionTimeLeft, setSessionTimeLeft] = useState(getInitialTimeLeft);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const sessionWarningShown = useRef(false);
  const expiredCallbackFired = useRef(false);

  // Persist start time when session begins
  useEffect(() => {
    if (
      isAuthenticated &&
      enableTimeout &&
      !localStorage.getItem(STORAGE_KEY)
    ) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
    if (!isAuthenticated) {
      // Session ended — clean up
      localStorage.removeItem(STORAGE_KEY);
      sessionWarningShown.current = false;
      expiredCallbackFired.current = false;
    }
  }, [isAuthenticated, enableTimeout]);

  // Session countdown timer - only active if enableTimeout is true
  useEffect(() => {
    if (!isAuthenticated || !enableTimeout) {
      setSessionTimeLeft(SESSION_DURATION);
      sessionWarningShown.current = false;
      expiredCallbackFired.current = false;
      return;
    }

    // Sync with persisted start time on mount
    const remaining = getInitialTimeLeft();
    setSessionTimeLeft(remaining);

    if (remaining <= 0) {
      // Already expired
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("adminAccessTime");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("authToken");
      if (onSessionExpired && !expiredCallbackFired.current) {
        expiredCallbackFired.current = true;
        setTimeout(() => onSessionExpired(), 500);
      }
      return;
    }

    const timer = setInterval(() => {
      setSessionTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem("adminAccessTime");
          localStorage.removeItem("auth_token");
          localStorage.removeItem("authToken");
          toast({
            title: "Session Expired",
            description:
              "Your 15-minute session has ended. Please log in again.",
            variant: "destructive",
          });
          if (onSessionExpired && !expiredCallbackFired.current) {
            expiredCallbackFired.current = true;
            setTimeout(() => onSessionExpired(), 500);
          }
          return 0;
        }
        if (prev - 1 <= WARNING_THRESHOLD && !sessionWarningShown.current) {
          sessionWarningShown.current = true;
          setShowSessionWarning(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    isAuthenticated,
    enableTimeout,
    onSessionExpired,
    toast,
    getInitialTimeLeft,
  ]);

  const handleExtendSession = useCallback(() => {
    // Reset persisted start time to now
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setSessionTimeLeft(SESSION_DURATION);
    sessionWarningShown.current = false;
    expiredCallbackFired.current = false;
    setShowSessionWarning(false);
    toast({
      title: "Session Extended ✅",
      description: "Your session has been extended by 15 minutes.",
    });
  }, [toast, SESSION_DURATION]);

  const formatTimeLeft = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  const sessionProgress =
    ((SESSION_DURATION - sessionTimeLeft) / SESSION_DURATION) * 100;
  const isSessionCritical = sessionTimeLeft <= WARNING_THRESHOLD;
  const isSessionLow = sessionTimeLeft <= 5 * 60;

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
