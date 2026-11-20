import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarClock, ChevronRight, Clock, Headphones, ListMusic, Radio, User } from "lucide-react";
import { Link } from "wouter";
import type { SessionStatus, SessionSummary } from "@shared/listening-session";
import { useLanguage } from "@/components/LanguageSwitcher";
import { TmuHubNav } from "@/components/music/TmuHubNav";
import { TmuShell } from "@/components/music/TmuShell";
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
  live: "border-rose-500/45 bg-rose-500/15 text-rose-200",
  scheduled: "border-amber-400/35 bg-amber-500/15 text-amber-200",
  ended: "border-purple-500/25 bg-[#180d34]/80 text-slate-300",
  cancelled: "border-purple-500/15 bg-[#0f0822]/70 text-slate-400",
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
    <Badge variant="outline" className={cn("gap-1.5 font-semibold", PILL_CLASSES[status])}>
      {status === "live" && (
        <span aria-hidden="true" className="relative flex h-2 w-2">
          <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
        </span>
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
  index,
}: {
  session: SessionSummary;
  status: SessionStatus;
  lang: SessionLang;
  copy: SessionCopy;
  serverNowMs: number;
  index: number;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.li
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.22, delay: Math.min(index * 0.04, 0.24) }}
    >
      <Link
        href={sessionPath(session.id)}
        className={cn(
          "tmu-interactive-card group block h-full rounded-2xl border p-4 sm:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06020f]",
          status === "live"
            ? "border-rose-500/40 bg-gradient-to-br from-rose-500/12 via-[#120929]/90 to-fuchsia-500/10 hover:border-rose-400/60"
            : "tmu-glass hover:bg-[#180d34]/85",
        )}
      >
        <StatusPill status={status} copy={copy} />
        <h3 className="mt-3 break-words text-base font-semibold leading-snug text-slate-50 group-hover:text-white">
          {session.title}
        </h3>
        <ul className="mt-2.5 space-y-1.5 text-sm text-slate-300">
          {session.hostName && (
            <li className="flex items-center gap-1.5">
              <User aria-hidden="true" className="h-4 w-4 shrink-0 text-purple-300" />
              <span className="min-w-0 break-words">{copy.hostedBy(session.hostName)}</span>
            </li>
          )}
          <li className="flex items-center gap-1.5 tabular-nums">
            <CalendarClock aria-hidden="true" className="h-4 w-4 shrink-0 text-purple-300" />
            <span>{formatSessionWhen(session.startsAt, lang, { nowMs: serverNowMs })}</span>
          </li>
          <li className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums text-slate-400">
            <span className="flex items-center gap-1.5">
              <ListMusic aria-hidden="true" className="h-4 w-4 shrink-0 text-purple-300" />
              <span>{copy.trackCount(session.trackCount)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-purple-300" />
              <span>{formatTotalLength(session.totalDurationSec)}</span>
            </span>
          </li>
        </ul>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-fuchsia-300 group-hover:text-fuchsia-200">
          <span>{copy[cardActionKey(status)]}</span>
          <ChevronRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </motion.li>
  );
}

function ListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="grid gap-4 sm:grid-cols-2">
      <span className="sr-only">{label}</span>
      {[0, 1, 2, 3].map((index) => (
        <div key={index} aria-hidden="true" className="tmu-glass rounded-2xl p-5">
          <Skeleton className="h-5 w-20 rounded-full bg-purple-950/80 motion-reduce:animate-none" />
          <Skeleton className="mt-3 h-5 w-3/4 bg-purple-950/80 motion-reduce:animate-none" />
          <Skeleton className="mt-3 h-4 w-1/2 bg-purple-950/80 motion-reduce:animate-none" />
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
    <TmuShell chrome="site">
      <div className="mx-auto w-full max-w-5xl px-4 pt-6">
        <TmuHubNav currentSurface="sessions" className="mb-6" />

        <header className="tmu-glass-elevated mb-8 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                <Headphones aria-hidden="true" className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="tmu-hero-title text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {copy.listTitle}
                </h1>
                <p className="mt-1 text-sm text-slate-300">{copy.listIntro}</p>
              </div>
            </div>
            <Link
              href="/my-live-sessions"
              className="inline-flex items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-500/15 px-3.5 py-2 text-xs font-semibold text-purple-200 hover:bg-purple-500/25 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
            >
              <Radio aria-hidden="true" className="h-4 w-4 text-fuchsia-300" />
              <span>{lang === "fr" ? "Gérer mes sessions" : "My Sessions"}</span>
            </Link>
          </div>
        </header>

        {isError && (
          <div
            role="alert"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-3"
          >
            <p className="text-sm text-rose-100">{copy.loadError}</p>
            <Button
              size="sm"
              variant="outline"
              className="border-purple-400/30 bg-[#180d34]/70 text-slate-100 hover:bg-purple-500/20 hover:text-white focus-visible:ring-fuchsia-400"
              disabled={isFetching}
              onClick={() => refetch()}
            >
              {copy.retry}
            </Button>
          </div>
        )}

        {isPending && <ListSkeleton label={copy.loadingList} />}

        {isEmpty && (
          <div className="tmu-glass rounded-2xl p-6 text-center">
            <Headphones aria-hidden="true" className="mx-auto mb-2.5 h-8 w-8 text-purple-300/60" />
            <p className="text-sm text-slate-300">{copy.emptyList}</p>
          </div>
        )}

        {groups &&
          SECTIONS.filter(({ key }) => groups[key].length > 0).map(({ key, status, title }) => (
            <section key={key} aria-labelledby={`sessions-${key}`} className="mb-8">
              <div className="mb-3.5 flex items-center justify-between gap-2">
                <h2 id={`sessions-${key}`} className="text-lg font-bold tracking-tight text-slate-50">
                  {copy[title]}
                </h2>
                <span className="tabular-nums rounded-full border border-purple-500/20 bg-[#180d34]/70 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                  {groups[key].length}
                </span>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {groups[key].map((session, index) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    status={status}
                    lang={lang}
                    copy={copy}
                    serverNowMs={serverNowMs}
                    index={index}
                  />
                ))}
              </ul>
            </section>
          ))}
      </div>
    </TmuShell>
  );
}
