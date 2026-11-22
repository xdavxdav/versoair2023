import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, Vote, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthContext } from "@/contexts/AuthContext";
import { formatMinor } from "@/lib/arcade-contest-format";
import { loadJson, submitJson } from "@/lib/submit-json";
import { localizedCountryName } from "@/utils/country-names";
import { BILLING_COUNTRIES, billingDetailsSchema } from "@shared/billing-details";

interface Contest {
  countryCode: string;
  currency: string;
  enabled: boolean;
  priceMinor: number;
  votesPerHour: number;
  maxVotesPerArtistPerDay: number;
  poolPercent: number;
  voteWeightPercent: number;
  streamWeightPercent: number;
  minPayoutMinor: number;
}

interface ContestList {
  seasonKey: string;
  paymentsOpen: boolean;
  contests: (Contest & { poolMinor: number })[];
}

interface Me {
  country: string | null;
  seasonKey: string;
  paymentsOpen: boolean;
  contest: Contest | null;
  votes: { granted: number; cast: number; remaining: number };
}

interface Standings {
  poolMinor: number;
  artists: { artistId: number; stageName: string; votes: number }[];
}

interface Earning {
  id: number;
  countryCode: string;
  seasonKey: string;
  stageName: string;
  currency: string;
  amountMinor: number;
  status: string;
  claimDeadline: string | null;
  needsVerification: boolean;
}

const KEY = "arcade-contest";
const HOURS = Array.from({ length: 24 }, (_, index) => index + 1);
const SELECT_CLASS =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const BILLING_FIELDS = [
  { name: "fullName", label: "Full name", autoComplete: "name" },
  { name: "phone", label: "Phone", autoComplete: "tel", type: "tel" },
  { name: "addressLine1", label: "Street address", autoComplete: "address-line1" },
  { name: "addressLine2", label: "Apartment or suite (optional)", autoComplete: "address-line2" },
  { name: "city", label: "City", autoComplete: "address-level2" },
  { name: "region", label: "Province or state", autoComplete: "address-level1" },
  { name: "postalCode", label: "Postal or ZIP code", autoComplete: "postal-code" },
] as const;
const EARNING_STATUS: Record<string, string> = {
  escrow: "Held in escrow",
  payable: "Ready to be paid",
  paid: "Paid",
  accrued: "Building up to the minimum payout",
};

const LOADING = (
  <div role="status">
    <span className="sr-only">Loading the contest…</span>
    <Skeleton className="h-40 w-full" />
  </div>
);

class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function getData<T>(url: string): Promise<T> {
  const result = await loadJson<{ data: T }>(url, { lang: "en" });
  if (!result.ok) throw new RequestError(result.message, result.status);
  return result.data.data;
}

const countryName = (code: string) => localizedCountryName(code, "en", code);
const plural = (count: number, word: string) =>
  `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;

function readReturnNotice(): "success" | "cancelled" | null {
  const value = new URLSearchParams(window.location.search).get("contest");
  return value === "success" || value === "cancelled" ? value : null;
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Alert role="status">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Could not load the contest</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{message}</p>
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function ContestPanel({ onSignIn }: { onSignIn: () => void }) {
  const { user, loading: authLoading } = useAuthContext();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState(readReturnNotice);
  const [editingBilling, setEditingBilling] = useState(false);
  const isAuthenticated = !!user;
  const me = useQuery({
    queryKey: [KEY, "me"],
    queryFn: () => getData<Me>("/api/arcade-contest/me"),
    enabled: isAuthenticated,
  });
  const sessionLost = me.error instanceof RequestError && me.error.status === 401;

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("contest")) return;
    url.searchParams.delete("contest");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);

  // The payment webhook can land a few seconds after Stripe sends the player back.
  useEffect(() => {
    if (notice !== "success") return;
    let runs = 0;
    const timer = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: [KEY, "me"] });
      if (++runs >= 10) window.clearInterval(timer);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [notice, queryClient]);

  let body: ReactNode;
  if (authLoading) body = LOADING;
  else if (!isAuthenticated || sessionLost) body = <OpenContests onSignIn={onSignIn} />;
  else if (me.isPending) body = LOADING;
  else if (me.isError) body = <LoadError message={me.error.message} onRetry={() => void me.refetch()} />;
  else if (!me.data.country || editingBilling) {
    body = (
      <BillingForm
        onSaved={() => {
          setEditingBilling(false);
          void queryClient.invalidateQueries({ queryKey: [KEY] });
        }}
        onCancel={me.data.country ? () => setEditingBilling(false) : undefined}
      />
    );
  } else if (!me.data.contest) {
    body = (
      <Notice title={`No contest in ${countryName(me.data.country)} yet`}>
        Each country runs its own contest. We will open one for your billing country soon.
      </Notice>
    );
  } else {
    body = (
      <CountryContest
        me={me.data}
        contest={me.data.contest}
        onBillingRequired={() => setEditingBilling(true)}
      />
    );
  }

  return (
    <section aria-labelledby="arcade-contest-title" className="mb-6" data-testid="contest-panel">
      <Card className="space-y-4 p-4 sm:p-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Vote className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="arcade-contest-title" className="text-xl font-semibold">
              Country artist contest
            </h2>
            {me.data?.country && (
              <Badge variant="outline">
                {countryName(me.data.country)} · Season {me.data.seasonKey}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Each country runs its own contest. Buy play time in your country&apos;s currency and
            get free votes with every hour, then back artists from your country. At season end
            your country&apos;s artist pool, a share of play fees, is split between its artists by
            votes and streams. Votes are free allowances, not wagers, and players never win money.
          </p>
        </div>
        {notice && (
          <Alert role="status" className="flex items-start justify-between gap-3">
            <p className="text-sm">
              {notice === "success"
                ? "Payment received — your votes appear within a minute."
                : "Checkout cancelled — no payment was taken."}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-m-2 h-8 w-8 shrink-0"
              aria-label="Dismiss notice"
              onClick={() => setNotice(null)}
            >
              <X />
            </Button>
          </Alert>
        )}
        {body}
        {isAuthenticated && !sessionLost && <Earnings />}
      </Card>
    </section>
  );
}

function OpenContests({ onSignIn }: { onSignIn: () => void }) {
  const list = useQuery({
    queryKey: [KEY, "contests"],
    queryFn: () => getData<ContestList>("/api/arcade-contest/contests"),
  });

  let content: ReactNode;
  if (list.isPending) content = LOADING;
  else if (list.isError) content = <LoadError message={list.error.message} onRetry={() => void list.refetch()} />;
  else {
    const open = list.data.contests.filter((contest) => contest.enabled);
    content =
      open.length === 0 ? (
        <Notice title="Contests open soon">
          No country contest is open yet. Check back soon.
        </Notice>
      ) : (
        <>
          {!list.data.paymentsOpen && (
            <Notice title="Play time opens soon">
              Online payments are not open yet, so nobody can buy play time or vote for now.
            </Notice>
          )}
          <ul className="grid gap-3 sm:grid-cols-2">
            {open.map((contest) => (
              <li key={contest.countryCode} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-semibold">{countryName(contest.countryCode)}</p>
                <p className="text-muted-foreground">
                  {formatMinor(contest.priceMinor, contest.currency)} per hour of play time ·{" "}
                  {plural(contest.votesPerHour, "free vote")} per hour
                </p>
                <p className="text-muted-foreground">
                  Artist pool so far: {formatMinor(contest.poolMinor, contest.currency)}
                </p>
              </li>
            ))}
          </ul>
        </>
      );
  }

  return (
    <div className="space-y-3">
      {content}
      <Button type="button" onClick={onSignIn}>
        Sign in to join your country&apos;s contest
      </Button>
    </div>
  );
}

function BillingForm({ onSaved, onCancel }: { onSaved: () => void; onCancel?: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({ country: "" });
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    const parsed = billingDetailsSchema.safeParse({ ...values, acceptedTerms: accepted });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await submitJson("/api/v1/payments/billing-profile", {
      method: "PUT",
      body: parsed.data,
      lang: "en",
      fallbackMessage: "Your billing details could not be saved. Please try again.",
    });
    setBusy(false);
    if (result.ok) onSaved();
    else setError(result.message);
  }

  return (
    <form onSubmit={save} noValidate className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <h3 className="font-semibold">Add your billing details</h3>
        <p className="text-sm text-muted-foreground">
          Your contest is the one of your billing country. Save your billing details once to buy
          play time and vote in it.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="billing-country">Country</Label>
          <select
            id="billing-country"
            name="country"
            autoComplete="country"
            className={SELECT_CLASS}
            value={values.country}
            disabled={busy}
            onChange={(event) => setValues({ ...values, country: event.target.value })}
          >
            <option value="">Select your country</option>
            {BILLING_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
        {BILLING_FIELDS.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <Label htmlFor={`billing-${field.name}`}>{field.label}</Label>
            <Input
              id={`billing-${field.name}`}
              name={field.name}
              type={"type" in field ? field.type : "text"}
              autoComplete={field.autoComplete}
              value={values[field.name] ?? ""}
              disabled={busy}
              onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
            />
          </div>
        ))}
      </div>
      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          checked={accepted}
          disabled={busy}
          onChange={(event) => setAccepted(event.target.checked)}
        />
        <span>
          I confirm these billing details and agree to the{" "}
          <Link href="/terms" target="_blank" className="underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="underline">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          Save billing details
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function CountryContest({
  me,
  contest,
  onBillingRequired,
}: {
  me: Me;
  contest: Contest;
  onBillingRequired: () => void;
}) {
  const open = contest.enabled && me.paymentsOpen;
  const country = countryName(contest.countryCode);
  return (
    <div className="space-y-4">
      {!contest.enabled && (
        <Notice title="Your country's contest opens soon">
          The {country} contest is not open yet. Play time and votes will be available here as soon
          as it starts.
        </Notice>
      )}
      {contest.enabled && !me.paymentsOpen && (
        <Notice title="Play time and voting open soon">
          Online payments are not open yet, so buying play time and voting are paused for now.
        </Notice>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <BuyPlayTime contest={contest} open={open} onBillingRequired={onBillingRequired} />
        <div className="space-y-3 rounded-lg border border-border p-4">
          <h3 className="font-semibold">Your votes</h3>
          <p className="text-3xl font-bold tabular-nums">{me.votes.remaining.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">
            {plural(me.votes.granted, "vote")} earned this season · {me.votes.cast.toLocaleString()}{" "}
            given.
            {me.votes.remaining === 0 && " Buy play time to earn more."}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              {contest.poolPercent}% of play fees in {country} goes into the {country} artist pool.
            </li>
            <li>
              At season end the pool is split between {country} artists: {contest.voteWeightPercent}%
              by votes and {contest.streamWeightPercent}% by streams.
            </li>
            <li>Only verified artists with an approved contract are paid; other shares wait in escrow.</li>
            <li>
              You can give one artist up to {plural(contest.maxVotesPerArtistPerDay, "vote")} a day.
            </li>
          </ul>
        </div>
      </div>
      {contest.enabled ? (
        <Leaderboard contest={contest} canVote={open} remaining={me.votes.remaining} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Artists and voting appear here once the contest opens.
        </p>
      )}
    </div>
  );
}

function BuyPlayTime({
  contest,
  open,
  onBillingRequired,
}: {
  contest: Contest;
  open: boolean;
  onBillingRequired: () => void;
}) {
  const [hours, setHours] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = formatMinor(contest.priceMinor * hours, contest.currency);

  async function buy(event: FormEvent) {
    event.preventDefault();
    if (!open || busy) return;
    setBusy(true);
    setError(null);
    const result = await submitJson<{ data?: { url?: string } }>(
      "/api/v1/payments/create-arcade-checkout",
      {
        body: { hours },
        lang: "en",
        fallbackMessage: "Checkout could not start. Please try again.",
      },
    );
    setBusy(false);
    if (result.ok && result.data.data?.url) {
      window.location.href = result.data.data.url;
    } else if (!result.ok && result.code === "BILLING_COUNTRY_REQUIRED") {
      onBillingRequired();
    } else if (!result.ok && result.status === 503) {
      setError("Online payments are not open yet. Please check back soon.");
    } else {
      setError(result.ok ? "Checkout could not start. Please try again." : result.message);
    }
  }

  return (
    <form onSubmit={buy} className="space-y-3 rounded-lg border border-border p-4">
      <h3 className="font-semibold">Buy play time</h3>
      <p className="text-sm text-muted-foreground">
        {formatMinor(contest.priceMinor, contest.currency)} per hour, with{" "}
        {plural(contest.votesPerHour, "free vote")} for every hour.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="contest-hours">Hours of play time</Label>
        <select
          id="contest-hours"
          className={SELECT_CLASS}
          value={hours}
          disabled={!open || busy}
          onChange={(event) => setHours(Number(event.target.value))}
        >
          {HOURS.map((option) => (
            <option key={option} value={option}>
              {plural(option, "hour")}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm">
        Total <strong>{total}</strong> · includes {plural(contest.votesPerHour * hours, "free vote")}
      </p>
      <Button type="submit" className="w-full sm:w-auto" disabled={!open || busy} data-testid="contest-buy">
        {busy && <Loader2 className="animate-spin" />}
        Buy {plural(hours, "hour")} · {total}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Card payment in {contest.currency}. Your votes appear within a minute of payment.
      </p>
    </form>
  );
}

function Leaderboard({
  contest,
  canVote,
  remaining,
}: {
  contest: Contest;
  canVote: boolean;
  remaining: number;
}) {
  const queryClient = useQueryClient();
  const standings = useQuery({
    queryKey: [KEY, "leaderboard", contest.countryCode],
    queryFn: () => getData<Standings>(`/api/arcade-contest/${contest.countryCode}/leaderboard`),
  });
  const [count, setCount] = useState(1);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const maxCount = Math.max(1, Math.min(contest.maxVotesPerArtistPerDay, remaining));
  const perTap = Math.min(Math.max(1, count), maxCount);
  const country = countryName(contest.countryCode);
  const canTap = canVote && remaining > 0 && pendingId === null;

  async function vote(artist: Standings["artists"][number]) {
    setPendingId(artist.artistId);
    setFeedback(null);
    const result = await submitJson("/api/arcade-contest/vote", {
      body: { artistId: artist.artistId, count: perTap },
      lang: "en",
      fallbackMessage: "Your vote could not be sent. Please try again.",
    });
    setPendingId(null);
    setFeedback(
      result.ok ? `You gave ${plural(perTap, "vote")} to ${artist.stageName}.` : result.message,
    );
    void queryClient.invalidateQueries({ queryKey: [KEY] });
  }

  if (standings.isPending) return LOADING;
  if (standings.isError) {
    return <LoadError message={standings.error.message} onRetry={() => void standings.refetch()} />;
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-semibold">Artists from {country}</h3>
          <p className="text-sm text-muted-foreground">
            Artist pool so far this season:{" "}
            <strong className="text-foreground">
              {formatMinor(standings.data.poolMinor, contest.currency)}
            </strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="contest-vote-count" className="whitespace-nowrap">
            Votes per tap
          </Label>
          <Input
            id="contest-vote-count"
            type="number"
            min={1}
            max={maxCount}
            className="w-24"
            value={perTap}
            disabled={!canTap}
            onChange={(event) =>
              setCount(Math.min(Math.max(1, Math.floor(Number(event.target.value)) || 1), maxCount))
            }
          />
        </div>
      </div>
      <p aria-live="polite" className="min-h-5 text-sm text-muted-foreground">
        {feedback}
      </p>
      {standings.data.artists.length === 0 ? (
        <p className="text-sm text-muted-foreground">No artists from {country} have joined yet.</p>
      ) : (
        <ol className="divide-y divide-border rounded-lg border border-border">
          {standings.data.artists.map((artist, index) => (
            <li key={artist.artistId} className="flex items-center gap-3 px-3 py-2">
              <span className="w-6 shrink-0 text-sm tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{artist.stageName}</span>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {plural(artist.votes, "vote")}
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!canTap}
                aria-label={`Give ${plural(perTap, "vote")} to ${artist.stageName}`}
                onClick={() => void vote(artist)}
              >
                {pendingId === artist.artistId ? <Loader2 className="animate-spin" /> : "Vote"}
              </Button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Earnings() {
  const earnings = useQuery({
    queryKey: [KEY, "payouts"],
    queryFn: () => getData<Earning[]>("/api/arcade-contest/me/payouts"),
  });
  if (!earnings.data?.length) return null;
  return (
    <div className="space-y-2 border-t border-border pt-4">
      <h3 className="font-semibold">Your contest earnings</h3>
      <ul className="space-y-2">
        {earnings.data.map((row) => (
          <li key={row.id} className="rounded-lg border border-border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                {row.stageName} · {countryName(row.countryCode)} · {row.seasonKey}
              </span>
              <span className="tabular-nums">{formatMinor(row.amountMinor, row.currency)}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
              <Badge variant="outline">{EARNING_STATUS[row.status] ?? row.status}</Badge>
              {row.needsVerification && (
                <span>
                  Finish payout verification and sign your artist contract to be paid.{" "}
                  <Link href="/artist-portal" className="underline">
                    Open the artist portal
                  </Link>
                </span>
              )}
              {row.claimDeadline && (
                <span>Claim by {new Date(row.claimDeadline).toLocaleDateString()}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
