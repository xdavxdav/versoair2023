import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronRight, Clock, ListMusic, User } from "lucide-react";
import { Link } from "wouter";
import type { SessionStatus, SessionSummary } from "@shared/listening-session";
import { useLanguage } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSecondTick } from "@/hooks/use-live-session";
import { getSessionCopy, type SessionCopy } from "@/lib/listening-session-copy";
import {
  formatSessionWhen,
  formatTotalLength,
  groupSessions,
  sessionLang,
  sessionPath,
  type SessionLang,
} from "@/lib/listening-session-format";
import { fetchSessionJson } from "@/lib/listening-session-live";
import { cardActionKey, parseSessionList, statusLabelKey } from "@/lib/listening-session-page-state";
import { measureClockSample } from "@/lib/listening-session-sync";
import { cn } from "@/lib/utils";

const LIST_URL = "/api/listening-sessions";
const POLL_MS = 30_000;

const PILL_CLASSES: Record<SessionStatus, string> = {
  live: "border-red-500/40 bg-red-500/15 text-red-200",
  scheduled: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  ended: "border-gray-700 bg-gray-800/60 text-gray-300",
  cancelled: "border-gray-700 bg-gray-800/60 text-gray-400",
};

const SECTIONS = [
  { key: "live", status: "live", title: "sectionLive" },
  { key: "upcoming", status: "scheduled", title: "sectionUpcoming" },
  { key: "replays", status: "ended", title: "sectionReplays" },
] as const;

interface SessionList {
  sessions: SessionSummary[];
  /** Server clock minus device clock: statuses follow the server even when the device clock is off. */
  offsetMs: number;
}

async function fetchSessionList(signal: AbortSignal): Promise<SessionList> {
  const sentAtMs = Date.now();
  const { status, body } = await fetchSessionJson(LIST_URL, signal);
  const receivedAtMs = Date.now();
  const list = status >= 200 && status < 300 ? parseSessionList(body) : null;
  if (!list) throw new Error("The session list is unavailable");
  const sample = measureClockSample({ serverTime: list.serverTime, sentAtMs, receivedAtMs });
  return { sessions: list.sessions, offsetMs: sample?.offsetMs ?? 0 };
}

export function StatusPill({ status, copy }: { status: SessionStatus; copy: SessionCopy }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5", PILL_CLASSES[status])}>
      {status === "live" && (
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-red-400 motion-safe:animate-pulse" />
      )}
      <span>{copy[statusLabelKey(status)]}</span>
    </Badge>
  );
}

function SessionCard({
  session,
  status,
  lang,
  copy,
  serverNowMs,
}: {
  session: SessionSummary;
  status: SessionStatus;
  lang: SessionLang;
  copy: SessionCopy;
  serverNowMs: number;
}) {
  return (
    <li>
      <Link
        href={sessionPath(session.id)}
        className={cn(
          "block h-full rounded-xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950",
          status === "live"
            ? "border-red-500/40 bg-red-500/5 hover:bg-red-500/10"
            : "border-gray-800 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-900",
        )}
      >
        <StatusPill status={status} copy={copy} />
        <h3 className="mt-3 break-words text-base font-semibold leading-snug text-white">{session.title}</h3>
        <ul className="mt-2 space-y-1 text-sm text-gray-400">
          {session.hostName && (
            <li className="flex items-center gap-1.5">
              <User aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{copy.hostedBy(session.hostName)}</span>
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <CalendarClock aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>{formatSessionWhen(session.startsAt, lang, { nowMs: serverNowMs })}</span>
          </li>
          <li className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5">
              <ListMusic aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>{copy.trackCount(session.trackCount)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>{formatTotalLength(session.totalDurationSec)}</span>
            </span>
          </li>
        </ul>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-300">
          <span>{copy[cardActionKey(status)]}</span>
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </span>
      </Link>
    </li>
  );
}

function ListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="grid gap-3 sm:grid-cols-2">
      <span className="sr-only">{label}</span>
      {[0, 1, 2, 3].map((index) => (
        <div key={index} aria-hidden="true" className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <Skeleton className="h-5 w-20 rounded-full bg-gray-800 motion-reduce:animate-none" />
          <Skeleton className="mt-3 h-5 w-3/4 bg-gray-800 motion-reduce:animate-none" />
          <Skeleton className="mt-3 h-4 w-1/2 bg-gray-800 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

export default function SessionsPage() {
  const { currentLang } = useLanguage();
  const lang = sessionLang(currentLang);
  const copy = getSessionCopy(lang);
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: [LIST_URL],
    queryFn: ({ signal }) => fetchSessionList(signal),
    refetchInterval: POLL_MS,
    staleTime: 10_000,
  });
  useSecondTick();

  const serverNowMs = Date.now() + (data?.offsetMs ?? 0);
  const groups = data ? groupSessions(data.sessions, serverNowMs) : null;
  const isEmpty = groups !== null && !groups.live.length && !groups.upcoming.length && !groups.replays.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black pb-28 text-white">
      <div className="mx-auto w-full max-w-4xl px-4 pt-6">
        <header className="mb-6">
          <h1 className="bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-2xl font-bold text-transparent">
            {copy.listTitle}
          </h1>
          <p className="mt-1 text-sm text-gray-400">{copy.listIntro}</p>
        </header>

        {isError && (
          <div
            role="alert"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3"
          >
            <p className="text-sm text-red-100">{copy.loadError}</p>
            <Button
              size="sm"
              variant="outline"
              className="border-gray-600 bg-transparent text-gray-100 hover:bg-gray-800 hover:text-white focus-visible:ring-amber-400 focus-visible:ring-offset-gray-950"
              disabled={isFetching}
              onClick={() => refetch()}
            >
              {copy.retry}
            </Button>
          </div>
        )}

        {isPending && <ListSkeleton label={copy.loadingList} />}

        {isEmpty && (
          <p className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-300">
            {copy.emptyList}
          </p>
        )}

        {groups &&
          SECTIONS.filter(({ key }) => groups[key].length > 0).map(({ key, status, title }) => (
            <section key={key} aria-labelledby={`sessions-${key}`} className="mb-8">
              <h2 id={`sessions-${key}`} className="mb-3 text-lg font-semibold text-white">
                {copy[title]}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {groups[key].map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    status={status}
                    lang={lang}
                    copy={copy}
                    serverNowMs={serverNowMs}
                  />
                ))}
              </ul>
            </section>
          ))}
      </div>
    </div>
  );
}
