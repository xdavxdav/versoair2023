import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, TriangleAlert, Vote } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  formatMinor,
  majorToMinor,
  minorToMajorText,
  percentToBps,
  previousSeasonKey,
} from "@/lib/arcade-contest-format";
import { loadJson, submitJson } from "@/lib/submit-json";
import { localizedCountryName } from "@/utils/country-names";

interface AdminContest {
  countryCode: string;
  currency: string;
  enabled: boolean;
  priceMinor: number;
  votesPerHour: number;
  maxVotesPerArtistPerDay: number;
  escrowDays: number;
  poolBps: number;
  voteWeightBps: number;
  minPayoutMinor: number;
  poolMinor: number;
}

interface Overview {
  seasonKey: string;
  paymentsOpen: boolean;
  contests: AdminContest[];
}

interface ClosePlanRow {
  artistId: number;
  stageName: string;
  amountMinor: number;
  carriedInMinor: number;
  totalMinor: number;
  releases: boolean;
  votes: number;
  streams: number;
  eligible: boolean;
}

interface ClosePlan {
  countryCode: string;
  currency: string;
  seasonKey: string;
  poolMinor: number;
  leftoverMinor: number;
  rows: ClosePlanRow[];
}

interface Payout {
  id: number;
  countryCode: string;
  seasonKey: string;
  stageName: string;
  currency: string;
  amountMinor: number;
  status: string;
  claimDeadline: string | null;
  overdue: boolean;
  eligible: boolean;
  paidReference: string | null;
  paidAt: string | null;
}

type Draft = Record<
  "currency" | "price" | "votesPerHour" | "maxVotes" | "poolPercent" | "votePercent" | "escrowDays" | "minPayout",
  string
>;

const KEY = ["arcade-contest-admin"] as const;
const API = "/api/arcade-contest/admin";
const MAX_MINOR = 99_999_999;
const SEASON_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const SELECT_CLASS =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const STATUS_LABEL: Record<string, string> = {
  escrow: "Escrow",
  payable: "Payable",
  paid: "Paid",
  accrued: "Accruing",
  merged: "Merged",
};

const countryName = (code: string) => localizedCountryName(code, "en", code);

function day(iso: string | null): string {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : "—";
}

async function getData<T>(url: string): Promise<T> {
  const result = await loadJson<{ data: T }>(url, { lang: "en" });
  if (!result.ok) throw new Error(result.message);
  return result.data.data;
}

const toDraft = (contest: AdminContest): Draft => ({
  currency: contest.currency,
  price: minorToMajorText(contest.priceMinor, contest.currency),
  votesPerHour: String(contest.votesPerHour),
  maxVotes: String(contest.maxVotesPerArtistPerDay),
  poolPercent: String(contest.poolBps / 100),
  votePercent: String(contest.voteWeightBps / 100),
  escrowDays: String(contest.escrowDays),
  minPayout: minorToMajorText(contest.minPayoutMinor, contest.currency),
});

const wholeNumber = (text: string) => (/^\d{1,6}$/.test(text.trim()) ? Number(text) : null);
const inRange = (value: number | null, min: number, max: number) =>
  value !== null && value >= min && value <= max ? value : null;

/** Only the fields that changed, in the units the server expects, or the first problem found. */
function buildPatch(contest: AdminContest, draft: Draft): Record<string, string | number> | string {
  const currency = draft.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return "Currency must be a 3-letter code such as CAD or XOF.";
  const example = minorToMajorText(1250, currency);
  const checks: [string, number | null, number, string][] = [
    [
      "priceMinor",
      inRange(majorToMinor(draft.price, currency), 1, MAX_MINOR),
      contest.priceMinor,
      `Price per hour must be an amount in ${currency} such as ${example}.`,
    ],
    [
      "votesPerHour",
      inRange(wholeNumber(draft.votesPerHour), 0, 1000),
      contest.votesPerHour,
      "Free votes per hour must be a whole number from 0 to 1000.",
    ],
    [
      "maxVotesPerArtistPerDay",
      inRange(wholeNumber(draft.maxVotes), 1, 1000),
      contest.maxVotesPerArtistPerDay,
      "Daily votes per artist must be a whole number from 1 to 1000.",
    ],
    [
      "poolBps",
      percentToBps(draft.poolPercent),
      contest.poolBps,
      "Artist pool must be a percentage from 0 to 100, with up to two decimals.",
    ],
    [
      "voteWeightBps",
      percentToBps(draft.votePercent),
      contest.voteWeightBps,
      "Vote weight must be a percentage from 0 to 100, with up to two decimals.",
    ],
    [
      "escrowDays",
      inRange(wholeNumber(draft.escrowDays), 0, 365),
      contest.escrowDays,
      "Escrow days must be a whole number from 0 to 365.",
    ],
    [
      "minPayoutMinor",
      inRange(majorToMinor(draft.minPayout, currency), 0, MAX_MINOR),
      contest.minPayoutMinor,
      `Minimum payout must be an amount in ${currency} such as ${example}.`,
    ],
  ];
  const currencyChanged = currency !== contest.currency;
  const patch: Record<string, string | number> = currencyChanged ? { currency } : {};
  for (const [key, value, current, message] of checks) {
    if (value === null) return message;
    // Minor units mean something different in another currency, so money is always re-sent.
    if (value !== current || (currencyChanged && key.endsWith("Minor"))) patch[key] = value;
  }
  return patch;
}

function Loading({ label }: { label: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </p>
  );
}

function LoadError({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{message}</p>
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function ContestCard({
  contest,
  paymentsOpen,
  seasonKey,
  onChanged,
}: {
  contest: AdminContest;
  paymentsOpen: boolean;
  seasonKey: string;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const name = countryName(contest.countryCode);
  const initial = toDraft(contest);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = (Object.keys(initial) as (keyof Draft)[]).some((key) => draft[key] !== initial[key]);
  const currency = draft.currency.trim().toUpperCase();
  const voteBps = percentToBps(draft.votePercent);
  const live = contest.enabled && paymentsOpen;
  const fieldId = (key: string) => `contest-${contest.countryCode}-${key}`;

  const fields: { key: keyof Draft; label: string; hint: string; mode?: "text" | "decimal" }[] = [
    {
      key: "currency",
      label: "Currency",
      hint: "Three-letter code. It cannot change once this country has money in its books.",
      mode: "text",
    },
    { key: "price", label: `Price per hour (${currency})`, hint: "What a player pays for one hour of play time.", mode: "decimal" },
    { key: "votesPerHour", label: "Free votes per hour", hint: "Votes bundled with each paid hour. An allowance, not a wager." },
    { key: "maxVotes", label: "Daily votes per artist", hint: "Most votes one player can give the same artist in a day." },
    {
      key: "poolPercent",
      label: "Artist pool (% of play fees)",
      hint: "Share of play fees set aside for this country's artists.",
      mode: "decimal",
    },
    {
      key: "votePercent",
      label: "Vote weight (%)",
      hint:
        voteBps === null
          ? "Enter a percentage from 0 to 100."
          : `Streams count for the remaining ${(10_000 - voteBps) / 100}%.`,
      mode: "decimal",
    },
    {
      key: "escrowDays",
      label: "Escrow days",
      hint: "Days an unverified artist has to finish payout verification and sign a contract before a held payout is flagged overdue.",
    },
    { key: "minPayout", label: `Minimum payout (${currency})`, hint: "Smaller balances carry into the next season.", mode: "decimal" },
  ];

  const toggle = async (next: boolean) => {
    if (
      next &&
      !window.confirm(
        `Open the ${name} contest to players?\n\nLegal review for ${name} must be complete before play time is sold there. Only continue if it is.`,
      )
    ) {
      return;
    }
    setToggling(true);
    const result = await submitJson(`${API}/contests/${contest.countryCode}`, {
      method: "PUT",
      body: { enabled: next },
      lang: "en",
    });
    setToggling(false);
    if (!result.ok) {
      toast({ title: `Could not update the ${name} contest`, description: result.message, variant: "destructive" });
      return;
    }
    toast({ title: `${name} contest ${next ? "enabled" : "disabled"}` });
    onChanged();
  };

  const save = async () => {
    const patch = buildPatch(contest, draft);
    if (typeof patch === "string") {
      setError(patch);
      return;
    }
    setError(null);
    if (Object.keys(patch).length === 0) {
      setDraft(initial);
      return;
    }
    setSaving(true);
    const result = await submitJson(`${API}/contests/${contest.countryCode}`, {
      method: "PUT",
      body: patch,
      lang: "en",
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    toast({ title: `${name} settings saved` });
    onChanged();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {name} ({contest.countryCode})
              <Badge variant={live ? "default" : "secondary"}>
                {live ? "Live" : contest.enabled ? "Enabled, waiting for payments" : "Disabled"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Current pool for {seasonKey}: <strong>{formatMinor(contest.poolMinor, contest.currency)}</strong>
            </CardDescription>
          </div>
          <Switch
            checked={contest.enabled}
            disabled={toggling}
            onCheckedChange={toggle}
            aria-label={`Open the ${name} contest to players`}
          />
        </div>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={fieldId(field.key)}>{field.label}</Label>
                <Input
                  id={fieldId(field.key)}
                  value={draft[field.key]}
                  inputMode={field.mode ?? "numeric"}
                  maxLength={field.key === "currency" ? 3 : undefined}
                  autoComplete="off"
                  aria-describedby={`${fieldId(field.key)}-hint`}
                  onChange={(event) => {
                    const value = field.key === "currency" ? event.target.value.toUpperCase() : event.target.value;
                    setDraft((current) => ({ ...current, [field.key]: value }));
                  }}
                />
                <p id={`${fieldId(field.key)}-hint`} className="text-xs text-muted-foreground">
                  {field.hint}
                </p>
              </div>
            ))}
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {dirty && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDraft(initial);
                  setError(null);
                }}
              >
                Reset
              </Button>
            )}
            <Button type="submit" disabled={!dirty || saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
              Save {name} settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function outcome(row: ClosePlanRow): { label: string; variant: "default" | "secondary" | "outline" } {
  if (!row.releases) return { label: "Below minimum, carried forward", variant: "outline" };
  return row.eligible
    ? { label: "Payable", variant: "default" }
    : { label: "Escrow: needs verification and contract", variant: "secondary" };
}

function SeasonClose({ overview, onChanged }: { overview: Overview; onChanged: () => void }) {
  const [country, setCountry] = useState(overview.contests[0]?.countryCode ?? "");
  const [season, setSeason] = useState(() => previousSeasonKey(overview.seasonKey));
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [plan, setPlan] = useState<ClosePlan | null>(null);
  // Closing is only offered for the exact country and season that was previewed.
  const shown = plan && plan.countryCode === country && plan.seasonKey === season ? plan : null;

  const run = async (commit: boolean) => {
    if (!SEASON_KEY.test(season)) {
      setError("Season must look like 2026-05.");
      return;
    }
    if (commit && shown) {
      const releasing = shown.rows.filter((row) => row.releases);
      const total = releasing.reduce((sum, row) => sum + row.totalMinor, 0);
      const confirmed = window.confirm(
        `Close ${season} for ${countryName(country)}?\n\nThis creates ${releasing.length} payout(s) worth ${formatMinor(total, shown.currency)} and cannot be undone.`,
      );
      if (!confirmed) return;
    }
    setBusy(commit ? "commit" : "preview");
    setError(null);
    setDone(null);
    const result = await submitJson<{ data: { plan: ClosePlan } }>(`${API}/contests/${country}/close`, {
      body: commit ? { seasonKey: season, commit: true } : { seasonKey: season },
      lang: "en",
    });
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const closed = result.data.data.plan;
    if (commit) {
      setPlan(null);
      const created = closed.rows.filter((row) => row.releases).length;
      setDone(`Season ${closed.seasonKey} is closed for ${countryName(closed.countryCode)}: ${created} payout(s) created.`);
      onChanged();
    } else {
      setPlan(closed);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Close a season</CardTitle>
        <CardDescription>
          Splits one country's artist pool by votes and streams and creates its payouts. Preview first: nothing is written
          until you close the season for real, and a closed season cannot be reopened.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="close-country">Country</Label>
            <select
              id="close-country"
              className={SELECT_CLASS}
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            >
              {overview.contests.map((contest) => (
                <option key={contest.countryCode} value={contest.countryCode}>
                  {countryName(contest.countryCode)} ({contest.currency})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="close-season">Season (YYYY-MM)</Label>
            <Input
              id="close-season"
              value={season}
              maxLength={7}
              inputMode="numeric"
              autoComplete="off"
              placeholder="2026-05"
              aria-describedby="close-season-hint"
              onChange={(event) => setSeason(event.target.value.trim())}
            />
            <p id="close-season-hint" className="text-xs text-muted-foreground">
              Defaults to the month before {overview.seasonKey}. A season can only be closed once it has ended.
            </p>
          </div>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {done && (
          <Alert role="status">
            <AlertDescription>{done}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" disabled={busy !== null || !country} onClick={() => run(false)}>
            {busy === "preview" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
            Preview close
          </Button>
          <Button type="button" variant="destructive" disabled={busy !== null || !shown} onClick={() => run(true)}>
            {busy === "commit" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
            Close season &amp; create payouts
          </Button>
          {!shown && <span className="text-xs text-muted-foreground">Preview this country and season to unlock closing.</span>}
        </div>
        {shown && (
          <div className="space-y-3" aria-live="polite">
            <p className="text-sm">
              <Badge variant="outline" className="mr-2">
                Preview only
              </Badge>
              {countryName(shown.countryCode)}, season {shown.seasonKey}: pool{" "}
              <strong>{formatMinor(shown.poolMinor, shown.currency)}</strong>,{" "}
              <strong>{formatMinor(shown.leftoverMinor, shown.currency)}</strong> stays in the pool for the next season.
            </p>
            {shown.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No artist earned a share in this season.</p>
            ) : (
              <Table aria-label="Season close preview">
                <TableHeader>
                  <TableRow>
                    <TableHead>Artist</TableHead>
                    <TableHead className="text-right">Votes</TableHead>
                    <TableHead className="text-right">Streams</TableHead>
                    <TableHead className="text-right">This season</TableHead>
                    <TableHead className="text-right">Carried in</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.rows.map((row) => {
                    const result = outcome(row);
                    return (
                      <TableRow key={row.artistId}>
                        <TableCell className="font-medium">{row.stageName}</TableCell>
                        <TableCell className="text-right">{row.votes.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{row.streams.toLocaleString()}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">{formatMinor(row.amountMinor, shown.currency)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">{formatMinor(row.carriedInMinor, shown.currency)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right font-medium">
                          {formatMinor(row.totalMinor, shown.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={result.variant}>{result.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function payoutDetail(row: Payout): ReactNode {
  if (row.status === "paid") {
    return `Paid ${day(row.paidAt)}${row.paidReference ? `, ref. ${row.paidReference}` : ""}`;
  }
  if (row.status === "escrow") {
    return `Claim by ${day(row.claimDeadline)}. ${
      row.eligible ? "Verified: use Release escrow." : "Needs payout verification and a contract."
    }`;
  }
  return "—";
}

function Payouts({ contests, onChanged }: { contests: AdminContest[]; onChanged: () => void }) {
  const { toast } = useToast();
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<number | "release" | null>(null);
  const params = new URLSearchParams();
  if (country) params.set("country", country);
  if (status) params.set("status", status);
  const query = params.toString();
  const payoutsQuery = useQuery({
    queryKey: [...KEY, "payouts", country, status],
    queryFn: () => getData<Payout[]>(`${API}/payouts${query ? `?${query}` : ""}`),
  });
  const rows = payoutsQuery.data;

  const releaseEscrow = async () => {
    setBusy("release");
    const result = await submitJson<{ data: { released: number } }>(`${API}/payouts/release-escrow`, {
      body: country ? { countryCode: country } : {},
      lang: "en",
    });
    setBusy(null);
    if (!result.ok) {
      toast({ title: "Could not release escrow", description: result.message, variant: "destructive" });
      return;
    }
    const released = result.data.data.released;
    toast({
      title: released > 0 ? `${released} payout(s) are now payable` : "Nothing to release",
      description:
        released > 0 ? undefined : "No held payout belongs to an artist who has finished verification and signed a contract.",
    });
    onChanged();
  };

  const markPaid = async (row: Payout) => {
    const answer = window.prompt(
      `Reference for the ${formatMinor(row.amountMinor, row.currency)} payment sent to ${row.stageName}\n(bank, mobile-money or transfer reference, 3 to 200 characters):`,
    );
    if (answer === null) return;
    const reference = answer.trim();
    if (reference.length < 3 || reference.length > 200) {
      toast({ title: "The reference needs 3 to 200 characters", variant: "destructive" });
      return;
    }
    setBusy(row.id);
    const result = await submitJson(`${API}/payouts/${row.id}/paid`, { body: { reference }, lang: "en" });
    setBusy(null);
    if (!result.ok) {
      toast({ title: "Could not record the payment", description: result.message, variant: "destructive" });
      return;
    }
    toast({ title: `Payment to ${row.stageName} recorded` });
    onChanged();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Artist payouts</CardTitle>
        <CardDescription>
          Payouts are sent by hand, outside the app (bank transfer, mobile money or similar). Marking one as paid only records
          the reference. Release escrow makes held payouts payable for artists who have since finished verification and signed
          a contract, in the selected country or in every country when none is selected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-40 flex-1 space-y-1.5 sm:flex-none">
            <Label htmlFor="payout-country">Country</Label>
            <select
              id="payout-country"
              className={SELECT_CLASS}
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            >
              <option value="">All countries</option>
              {contests.map((contest) => (
                <option key={contest.countryCode} value={contest.countryCode}>
                  {countryName(contest.countryCode)}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-40 flex-1 space-y-1.5 sm:flex-none">
            <Label htmlFor="payout-status">Status</Label>
            <select
              id="payout-status"
              className={SELECT_CLASS}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="accrued">Accruing</option>
              <option value="escrow">Escrow</option>
              <option value="payable">Payable</option>
              <option value="paid">Paid</option>
              <option value="merged">Merged</option>
            </select>
          </div>
          <Button type="button" variant="outline" disabled={busy !== null} onClick={releaseEscrow}>
            {busy === "release" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
            Release escrow
          </Button>
        </div>
        {!rows ? (
          payoutsQuery.isError ? (
            <LoadError
              title="Could not load payouts"
              message={payoutsQuery.error.message}
              onRetry={() => payoutsQuery.refetch()}
            />
          ) : (
            <Loading label="Loading payouts…" />
          )
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payouts match these filters yet.</p>
        ) : (
          <>
            <Table aria-label="Artist payouts">
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.countryCode}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.seasonKey}</TableCell>
                    <TableCell className="font-medium">{row.stageName}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">{formatMinor(row.amountMinor, row.currency)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={row.status === "payable" ? "default" : row.status === "escrow" ? "secondary" : "outline"}>
                          {STATUS_LABEL[row.status] ?? row.status}
                        </Badge>
                        {row.overdue && <Badge variant="destructive">Overdue</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-48 text-xs text-muted-foreground">{payoutDetail(row)}</TableCell>
                    <TableCell className="text-right">
                      {row.status === "payable" && (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy !== null}
                          aria-label={`Mark the payout to ${row.stageName} as paid`}
                          onClick={() => markPaid(row)}
                        >
                          {busy === row.id && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
                          Mark paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground">
              Accruing means the balance is still under the minimum payout and carries into the next season. Merged means it was
              folded into a later payout.
              {rows.length >= 200 && " Showing the 200 newest payouts; narrow the filters to see others."}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const cardKey = (contest: AdminContest) =>
  [
    contest.countryCode,
    contest.currency,
    contest.priceMinor,
    contest.votesPerHour,
    contest.maxVotesPerArtistPerDay,
    contest.poolBps,
    contest.voteWeightBps,
    contest.escrowDays,
    contest.minPayoutMinor,
  ].join(":");

export function ArcadeContestAdmin() {
  const queryClient = useQueryClient();
  const overviewQuery = useQuery({
    queryKey: [...KEY, "contests"],
    queryFn: () => getData<Overview>(`${API}/contests`),
  });
  const overview = overviewQuery.data;
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });

  if (!overview) {
    return overviewQuery.isError ? (
      <LoadError
        title="Could not load country contests"
        message={overviewQuery.error.message}
        onRetry={() => overviewQuery.refetch()}
      />
    ) : (
      <Loading label="Loading country contests…" />
    );
  }

  return (
    <section className="space-y-4" aria-labelledby="country-contests-title">
      <div className="space-y-1">
        <h3 id="country-contests-title" className="flex items-center gap-2 text-xl font-bold">
          <Vote className="h-5 w-5" aria-hidden="true" />
          Country contests
        </h3>
        <p className="text-sm text-muted-foreground">
          Every country runs its own contest with its own currency, pool and payout rules. Players buy play time in their billing
          country's currency and get free votes with it; they never win money. At season end the artist pool is split by votes
          and streams, and only verified artists with an approved contract are paid, the rest is held in escrow. Current
          season: {overview.seasonKey}.
        </p>
      </div>
      {!overview.paymentsOpen && (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Online payments are switched off platform-wide</AlertTitle>
          <AlertDescription>
            Online payments are switched off platform-wide, so nobody can buy play time yet. Enabled contests show an "opens
            soon" notice until payments are switched on.
          </AlertDescription>
        </Alert>
      )}
      {overview.contests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No country contests are configured yet.</p>
      ) : (
        <>
          {overview.contests.map((contest) => (
            <ContestCard
              key={cardKey(contest)}
              contest={contest}
              paymentsOpen={overview.paymentsOpen}
              seasonKey={overview.seasonKey}
              onChanged={refresh}
            />
          ))}
          <SeasonClose overview={overview} onChanged={refresh} />
          <Payouts contests={overview.contests} onChanged={refresh} />
        </>
      )}
    </section>
  );
}
