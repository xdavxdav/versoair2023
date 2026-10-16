import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { getDashboardDestination } from "@/lib/dashboard-routes";

/**
 * Sends someone who is already signed in away from an auth page (e.g. when
 * they press the browser Back button). Only the session found when the page
 * opens counts; a login completed on the page keeps its own redirect logic.
 */
export function useSkipAuthPageWhenSignedIn() {
  const { user, loading } = useAuthContext();
  const [, navigate] = useLocation();
  const checked = useRef(false);

  useEffect(() => {
    if (loading || checked.current) return;
    checked.current = true;
    if (!user) return;

    const requested = new URLSearchParams(window.location.search).get(
      "redirect",
    );
    const safe =
      requested &&
      requested.startsWith("/") &&
      !requested.startsWith("//") &&
      !requested.includes("\\") &&
      !requested.startsWith("/auth/");
    navigate(safe ? requested : getDashboardDestination(user).path, {
      replace: true,
    });
  }, [user, loading, navigate]);
}
