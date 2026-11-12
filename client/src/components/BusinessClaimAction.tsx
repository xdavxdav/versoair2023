import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth";

interface BusinessClaim {
  id: number;
  business_id: number;
  business_name: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  review_note?: string | null;
  created_at: string;
}

interface ClaimStatusResponse {
  accountType: "general" | "business_owner";
  businessName: string | null;
  emailVerified: boolean;
  data: BusinessClaim[];
}

const CLAIMS_QUERY_KEY = ["business-claims", "mine"];

async function loadMyClaims(): Promise<ClaimStatusResponse> {
  const response = await authenticatedFetch("/api/businesses/claims/mine");
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || "Could not load your business claims.");
  }
  return data;
}

async function sendJson(url: string, method: "POST" | "DELETE", body?: unknown) {
  const response = await authenticatedFetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || "The request could not be completed.");
  }
  return data;
}

export function BusinessClaimAction({
  businessId,
  businessName,
  claimable,
}: {
  businessId: number | string;
  businessName: string;
  claimable: boolean;
}) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [businessNameForAccount, setBusinessNameForAccount] = useState("");
  const [claimantRole, setClaimantRole] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [workPhone, setWorkPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const statusQuery = useQuery({
    queryKey: CLAIMS_QUERY_KEY,
    queryFn: loadMyClaims,
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (statusQuery.data?.businessName) {
      setBusinessNameForAccount(statusQuery.data.businessName);
    }
  }, [statusQuery.data?.businessName]);

  if (!claimable) return null;

  const latestClaim = statusQuery.data?.data
    .filter((claim) => String(claim.business_id) === String(businessId))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];

  const switchToBusinessOwner = async () => {
    setSaving(true);
    setError("");
    try {
      await sendJson("/api/account/account-type", "POST", {
        accountType: "business_owner",
        businessName: businessNameForAccount.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: CLAIMS_QUERY_KEY });
      await statusQuery.refetch();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not switch account type.",
      );
    } finally {
      setSaving(false);
    }
  };

  const submitClaim = async () => {
    setSaving(true);
    setError("");
    try {
      await sendJson(`/api/businesses/${businessId}/claim`, "POST", {
        claimantRole: claimantRole.trim(),
        workEmail: workEmail.trim() || undefined,
        workPhone: workPhone.trim() || undefined,
        message: message.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: CLAIMS_QUERY_KEY });
      setOpen(false);
      setClaimantRole("");
      setWorkEmail("");
      setWorkPhone("");
      setMessage("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not submit your claim.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (latestClaim?.status === "pending") {
    return (
      <p className="text-sm font-medium text-amber-900" role="status">
        A claim for {businessName} is under review.
      </p>
    );
  }

  if (latestClaim?.status === "approved") return null;

  const redirect = encodeURIComponent(`/business/${businessId}`);
  return (
    <>
      {user ? (
        <Button
          type="button"
          variant="outline"
          className="gap-2 border-[#CDA65F] text-[#76551F]"
          onClick={() => {
            setError("");
            setOpen(true);
          }}
          disabled={statusQuery.isLoading}
        >
          <Building2 className="h-4 w-4" />
          {statusQuery.isLoading ? "Checking claim status…" : "Claim this business"}
        </Button>
      ) : (
        <Button
          asChild
          type="button"
          variant="outline"
          className="gap-2 border-[#CDA65F] text-[#76551F]"
        >
          <Link href={`/auth/signin?redirect=${redirect}`}>
            <Building2 className="h-4 w-4" /> Is this your business? Claim it
          </Link>
        </Button>
      )}

      {latestClaim?.status === "rejected" && (
        <p className="mt-2 text-sm text-slate-600">
          Previous claim: not approved{latestClaim.review_note ? ` — ${latestClaim.review_note}` : ""}.
        </p>
      )}

      {user && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Claim {businessName}</DialogTitle>
              <DialogDescription>
                Claims are reviewed by Verso Air staff. Submitting a claim does
                not grant access or change the listing.
              </DialogDescription>
            </DialogHeader>

            {statusQuery.isError && (
              <p className="text-sm text-red-700" role="alert">
                {statusQuery.error instanceof Error
                  ? statusQuery.error.message
                  : "Could not load account status."}
              </p>
            )}

            {statusQuery.isLoading ? (
              <p className="text-sm text-slate-600">Loading account status…</p>
            ) : !statusQuery.data ? null : statusQuery.data.accountType !== "business_owner" ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-700">
                  Claiming requires a Business Owner account. This changes only
                  your declared account type; it does not grant business access.
                </p>
                <label className="block space-y-1 text-sm font-medium">
                  Business name (optional)
                  <Input
                    value={businessNameForAccount}
                    onChange={(event) => setBusinessNameForAccount(event.target.value)}
                    maxLength={200}
                  />
                </label>
                <Button type="button" onClick={switchToBusinessOwner} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Switch to Business Owner
                </Button>
              </div>
            ) : !statusQuery.data.emailVerified ? (
              <p className="text-sm text-amber-900" role="status">
                Verify your email before submitting a claim.
              </p>
            ) : (
              <div className="space-y-4">
                <label className="block space-y-1 text-sm font-medium">
                  Your role at this business
                  <Input
                    value={claimantRole}
                    onChange={(event) => setClaimantRole(event.target.value)}
                    maxLength={100}
                    required
                    placeholder="Owner, director, authorized representative…"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1 text-sm font-medium">
                    Work email
                    <Input
                      type="email"
                      value={workEmail}
                      onChange={(event) => setWorkEmail(event.target.value)}
                      maxLength={254}
                    />
                  </label>
                  <label className="block space-y-1 text-sm font-medium">
                    Work phone
                    <Input
                      type="tel"
                      value={workPhone}
                      onChange={(event) => setWorkPhone(event.target.value)}
                      maxLength={30}
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-600">
                  Enter at least one work contact. A matching contact can help
                  staff review the claim but never auto-approves it.
                </p>
                <label className="block space-y-1 text-sm font-medium">
                  Message
                  <Textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="Tell us why you are authorized to manage this listing."
                  />
                </label>
                <Button
                  type="button"
                  onClick={submitClaim}
                  disabled={
                    saving ||
                    claimantRole.trim().length < 2 ||
                    (!workEmail.trim() && !workPhone.trim())
                  }
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit for review
                </Button>
              </div>
            )}
            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function MyBusinessClaimsCard() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);
  const statusQuery = useQuery({
    queryKey: CLAIMS_QUERY_KEY,
    queryFn: loadMyClaims,
    enabled: Boolean(user),
  });
  const claims = statusQuery.data?.data || [];

  const withdrawClaim = async (claimId: number) => {
    setWithdrawingId(claimId);
    setError("");
    try {
      await sendJson(`/api/businesses/claims/${claimId}`, "DELETE");
      await queryClient.invalidateQueries({ queryKey: CLAIMS_QUERY_KEY });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not withdraw the claim.",
      );
    } finally {
      setWithdrawingId(null);
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-900">Business claims</h3>
          <p className="mt-1 text-sm text-slate-600">
            Track claims you have submitted. Access is granted only after staff approval.
          </p>
        </div>
        <Link href="/businesses-directory" className="text-sm font-medium text-blue-700 hover:underline">
          Browse listings
        </Link>
      </div>
      {statusQuery.isLoading && <p className="mt-4 text-sm text-slate-600">Loading claims…</p>}
      {statusQuery.isError && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {statusQuery.error instanceof Error ? statusQuery.error.message : "Could not load your claims."}
        </p>
      )}
      {!statusQuery.isLoading && !statusQuery.isError && claims.length === 0 && (
        <p className="mt-4 text-sm text-slate-600">You have not submitted a business claim.</p>
      )}
      <div className="mt-4 space-y-3">
        {claims.map((claim) => (
          <div key={claim.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
            <div>
              <Link href={`/business/${claim.business_id}`} className="font-medium text-slate-900 hover:underline">
                {claim.business_name}
              </Link>
              <p className="text-xs text-slate-600">
                {claim.status[0].toUpperCase() + claim.status.slice(1)} ·{" "}
                {new Date(claim.created_at).toLocaleDateString()}
              </p>
              {claim.review_note && (
                <p className="mt-1 text-sm text-slate-700">{claim.review_note}</p>
              )}
            </div>
            {claim.status === "pending" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={withdrawingId === claim.id}
                onClick={() => void withdrawClaim(claim.id)}
              >
                {withdrawingId === claim.id ? "Withdrawing…" : "Withdraw"}
              </Button>
            )}
          </div>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
    </section>
  );
}
