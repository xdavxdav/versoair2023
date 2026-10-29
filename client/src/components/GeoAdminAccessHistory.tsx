import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { GeoAdminHistoryResponse } from "@shared/geoadmin-access-history";
import { authErrorMessage } from "@/lib/auth-error";
import { Button } from "@/components/ui/button";

const ACTION_LABELS: Record<string, string> = {
  GEOADMIN_INVITATION_CREATED: "Invitation sent",
  GEOADMIN_INVITATION_DELIVERY_FAILED: "Invitation delivery failed - no access granted",
  GEOADMIN_INVITATION_ACCEPTED: "Invitation accepted",
  GEOADMIN_INVITATION_EXPIRED: "Invitation expired",
  GEOADMIN_INVITATION_REVOKED: "Invitation cancelled",
  GEOADMIN_ACCESS_REVOKED: "Staff access revoked",
  GEOADMIN_OWNER_CREDENTIAL_DRAFT_GENERATED: "Owner credential draft generated - not activated",
};

export default function GeoAdminAccessHistory() {
  const [offset, setOffset] = useState(0);
  const history = useQuery<GeoAdminHistoryResponse>({
    queryKey: ["/auth/geoadmin-access/history", `?offset=${offset}`],
    queryFn: async () => {
      const response = await fetch(`/auth/geoadmin-access/history?offset=${offset}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
      return response.json();
    },
  });
  return (
    <section className="mt-6 border-t border-slate-200 pt-4" aria-labelledby="geo-access-history-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="geo-access-history-heading" className="text-lg font-semibold">Access history</h3>
        <Button type="button" variant="outline" disabled={history.isFetching}
          onClick={() => { setOffset(0); void history.refetch(); }}>Refresh history</Button>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Recorded invitations, delivery failures, acceptance, code issuance and revocations.
        Codes, hashes, invitation tokens and authenticator secrets are never displayed in this history.
      </p>
      {history.isFetching && <p role="status" className="mt-3 text-sm">Loading access history...</p>}
      {history.isError && <p role="alert" className="mt-3 text-sm text-red-700">{authErrorMessage(history.error)}</p>}
      {history.data && (
        <>
          <ul className="mt-3 divide-y" data-testid="geoadmin-access-history">
            {history.data.events.length === 0 && <li className="py-3 text-sm">No recorded access events on this page.</li>}
            {history.data.events.map((event) => (
              <li key={event.id} className="space-y-1 py-3 text-sm">
                <p className="font-medium">{ACTION_LABELS[event.action] ?? event.action}</p>
                <p>{event.accountEmail ?? "Owner account"}{event.role ? ` - ${event.role}` : ""}{event.gateUsername ? ` - ${event.gateUsername}` : ""}</p>
                <p className="text-slate-600">
                  {event.createdAt ? new Date(event.createdAt).toLocaleString() : "Time unavailable"}
                  {" | "}{event.actorEmail ?? "System / actor unavailable"}
                </p>
                {event.codeIssued && <p>Personal access code issued once to the recipient.</p>}
                {event.credentialKind && <p>Draft type: {event.credentialKind === "access-code" ? "owner access code" : "authenticator setup"}.</p>}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-3">
            <Button type="button" variant="outline" disabled={offset === 0 || history.isFetching}
              onClick={() => setOffset((value) => Math.max(0, value - 50))}>Newer</Button>
            <span className="text-sm">Page {offset / 50 + 1}</span>
            <Button type="button" variant="outline" disabled={!history.data.hasMore || history.isFetching}
              onClick={() => setOffset((value) => value + 50)}>Older</Button>
          </div>
        </>
      )}
    </section>
  );
}
