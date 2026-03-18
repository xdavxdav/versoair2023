import { useCallback } from "react";
import { useAuthContext } from "@/contexts/AuthContext";

interface VisitPayload {
  businessId?: number;
  businessName?: string;
  sector: string;
  pageUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * useRecordVisit — silently records a business/page visit for the logged-in user.
 * No-ops immediately if the user is not authenticated.
 *
 * Usage:
 *   const recordVisit = useRecordVisit();
 *   // inside a business card click:
 *   recordVisit({ businessId: biz.id, businessName: biz.name, sector: "batiment" });
 */
export function useRecordVisit() {
  const { user, token } = useAuthContext();

  const recordVisit = useCallback(
    async (payload: VisitPayload) => {
      if (!user) return; // not logged in — skip silently

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        const t =
          token ||
          localStorage.getItem("auth_token") ||
          localStorage.getItem("authToken");
        if (t) headers["Authorization"] = `Bearer ${t}`;

        await fetch("/api/user/history", {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify(payload),
        });
      } catch {
        // Fire-and-forget — never block the UI
      }
    },
    [user, token],
  );

  return recordVisit;
}
