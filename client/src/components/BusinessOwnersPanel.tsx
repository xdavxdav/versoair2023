import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BusinessOwner {
  user_id: number;
  email: string;
  display_name: string | null;
  status: "active" | "invited";
}

interface OwnershipInvitation {
  id: number;
  business_id: number;
  business_name: string;
}

async function requestData<T>(method: string, url: string, body?: unknown): Promise<T> {
  const response = await apiRequest(method, url, body);
  return response.json();
}

export function BusinessOwnersPanel({
  businessId,
  currentUserId,
  isOwner,
}: {
  businessId: number | string;
  currentUserId?: number | string | null;
  isOwner: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: ownersResponse } = useQuery<{ data: BusinessOwner[] }>({
    queryKey: ["business-owners", businessId],
    enabled: isOwner,
    queryFn: () => requestData("GET", `/api/businesses/${businessId}/owners`),
  });
  const { data: invitationResponse } = useQuery<{ data: OwnershipInvitation[] }>({
    queryKey: ["business-owner-invitations", currentUserId],
    enabled: currentUserId != null,
    queryFn: () => requestData("GET", "/api/businesses/owner-invitations/mine"),
  });
  const invitation = invitationResponse?.data.find(
    (item) => String(item.business_id) === String(businessId),
  );
  const isRelevant = isOwner || Boolean(invitation);
  if (!isRelevant) return null;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["business-owners", businessId] }),
      queryClient.invalidateQueries({
        queryKey: ["business-owner-invitations", currentUserId],
      }),
      queryClient.invalidateQueries({ queryKey: ["business-fiche-access"] }),
      queryClient.invalidateQueries({ queryKey: ["business", businessId] }),
    ]);
  };

  const run = async (
    method: string,
    url: string,
    body: unknown,
    successTitle: string,
  ): Promise<boolean> => {
    setBusy(true);
    try {
      await requestData(method, url, body);
      toast({ title: successTitle });
      await refresh();
      return true;
    } catch (error) {
      toast({
        title: "Ownership update failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const invite = (event: FormEvent) => {
    event.preventDefault();
    const invitedEmail = email.trim();
    if (!invitedEmail) return;
    void run(
      "POST",
      `/api/businesses/${businessId}/owners/invitations`,
      { email: invitedEmail },
      "Invitation sent",
    ).then((succeeded) => {
      if (succeeded) setEmail("");
    });
  };

  return (
    <Card className="border-fiche-border bg-white text-[#1E2A32] shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Business owners</CardTitle>
        <CardDescription>
          Owners share access to manage this business. An invited person must accept before getting access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitation && !isOwner && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm">
              You were invited to co-own <strong>{invitation.business_name}</strong>.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  void run(
                    "POST",
                    `/api/businesses/owner-invitations/${invitation.id}/accept`,
                    {},
                    "Ownership invitation accepted",
                  )
                }
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(
                    "DELETE",
                    `/api/businesses/owner-invitations/${invitation.id}`,
                    undefined,
                    "Invitation declined",
                  )
                }
              >
                Decline
              </Button>
            </div>
          </div>
        )}

        {isOwner && (
          <>
            <ul className="space-y-2">
              {ownersResponse?.data.map((owner) => (
                <li
                  key={owner.user_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {owner.display_name || owner.email}
                    </p>
                    <p className="truncate text-xs text-slate-500">{owner.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs capitalize text-slate-500">{owner.status}</span>
                    {owner.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            "DELETE",
                            `/api/businesses/${businessId}/owners/${owner.user_id}`,
                            undefined,
                            String(owner.user_id) === String(currentUserId)
                              ? "You left the ownership team"
                              : "Owner removed",
                          )
                        }
                      >
                        {String(owner.user_id) === String(currentUserId) ? "Leave" : "Remove"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            "DELETE",
                            `/api/businesses/${businessId}/owners/invitations/${owner.user_id}`,
                            undefined,
                            "Invitation revoked",
                          )
                        }
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <form onSubmit={invite} className="flex flex-wrap gap-2">
              <label className="sr-only" htmlFor={`owner-email-${businessId}`}>
                Co-owner email
              </label>
              <input
                id={`owner-email-${businessId}`}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Co-owner account email"
                className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm"
              />
              <Button type="submit" disabled={busy}>
                Invite co-owner
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
