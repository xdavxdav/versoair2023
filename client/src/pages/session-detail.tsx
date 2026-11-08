import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  Headphones,
  Link2,
  LogOut,
  MessageCircle,
  Play,
  Send,
  User,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";
import { Link, useRoute } from "wouter";
import {
  formatSignedBadge,
  type SessionChatMessage,
  type SessionDetail,
  type SessionTrackView,
} from "@shared/listening-session";
import { useLanguage } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  postSessionMessage,
  useLiveSession,
  useSessionChat,
  type LiveSession,
} from "@/hooks/use-live-session";
import { useAudio } from "@/lib/audio-context";
import { getSessionCopy, type SessionCopy } from "@/lib/listening-session-copy";
import {
  SESSIONS_PATH,
  formatCountdown,
  formatDuration,
  formatSessionWhen,
  formatTotalLength,
  parseSessionId,
  sessionLang,
  sessionPath,
  type SessionLang,
} from "@/lib/listening-session-format";
import {
  CHAT_MAX_CHARS,
  authState,
  chatPanelState,
  checkChatDraft,
  composerFor,
  composerNotice,
  countdownSec,
  detailView,
  formatChatTime,
  listenMode,
  nowPlayingNote,
  nowPlayingView,
  replayTracks,
  showsOfflineBanner,
  signInPath,
  trackRowStates,
  type AuthState,
  type ChatPostFailure,
  type ComposerNotice,
  type DetailView,
  type ListenMode,
  type NowPlayingNote,
  type NowPlayingView,
  type TrackRowState,
} from "@/lib/listening-session-page-state";
import { planPlayback } from "@/lib/listening-session-sync";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/pages/sessions";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950";
const PRIMARY_BUTTON =
  "bg-amber-500 font-semibold text-gray-950 hover:bg-amber-400 focus-visible:ring-amber-400 focus-visible:ring-offset-gray-950";
const SECONDARY_BUTTON =
  "border-gray-600 bg-transparent text-gray-100 hover:bg-gray-800 hover:text-white focus-visible:ring-amber-400 focus-visible:ring-offset-gray-950";

interface TextProps {
  lang: SessionLang;
  copy: SessionCopy;
}

// ─── the page around a session ───────────────────────────────────────────

function PageShell({ copy, children }: { copy: SessionCopy; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black pb-28 text-white">
      <div className="mx-auto w-full max-w-5xl px-4 pt-6">
        <Link
          href={SESSIONS_PATH}
          className={cn("inline-flex items-center gap-1 rounded-md text-sm text-gray-300 hover:text-white", FOCUS_RING)}
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          <span>{copy.back}</span>
        </Link>
        {children}
      </div>
    </div>
  );
}

function NotFoundView({ copy }: { copy: SessionCopy }) {
  return (
    <PageShell copy={copy}>
      <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900/60 p-6">
        <h1 className="text-xl font-semibold text-white">{copy.notFoundTitle}</h1>
        <p className="mt-2 text-sm text-gray-300">{copy.notFoundBody}</p>
      </div>
    </PageShell>
  );
}

function LoadError({ copy, onRetry }: { copy: SessionCopy; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3"
    >
      <p className="text-sm text-red-100">{copy.sessionLoadError}</p>
      <Button type="button" size="sm" variant="outline" className={SECONDARY_BUTTON} onClick={onRetry}>
        {copy.retry}
      </Button>
    </div>
  );
}

function DetailSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="mt-6 space-y-4">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-4">
        <Skeleton className="h-6 w-24 rounded-full bg-gray-800 motion-reduce:animate-none" />
        <Skeleton className="h-9 w-3/4 bg-gray-800 motion-reduce:animate-none" />
        <Skeleton className="h-4 w-1/2 bg-gray-800 motion-reduce:animate-none" />
        <Skeleton className="h-44 w-full rounded-2xl bg-gray-800 motion-reduce:animate-none" />
      </div>
    </div>
  );
}

/** Always in the page, so a screen reader hears the message appear. */
function OfflineBanner({ show, copy }: { show: boolean; copy: SessionCopy }) {
  return (
    <div role="status">
      {show && (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          <WifiOff aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span>{copy.reconnecting}</span>
        </p>
      )}
    </div>
  );
}

function CopyLinkButton({ sessionId, copy }: { sessionId: number; copy: SessionCopy }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  if (!navigator.clipboard) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${sessionPath(sessionId)}`);
    } catch {
      return; // the browser refused, so the button stays as it was
    }
    setCopied(true);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Button type="button" size="sm" variant="outline" className={SECONDARY_BUTTON} onClick={copyLink}>
        {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
        <span>{copied ? copy.linkCopied : copy.copyLink}</span>
      </Button>
      <span role="status" className="sr-only">
        {copied ? copy.linkCopied : ""}
      </span>
    </>
  );
}

function SessionHeader({
  detail,
  status,
  nowMs,
  lang,
  copy,
}: TextProps & { detail: SessionDetail; status: SessionDetail["status"]; nowMs: number }) {
  return (
    <header className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={status} copy={copy} />
        <CopyLinkButton sessionId={detail.id} copy={copy} />
      </div>
      <h1 className="mt-3 break-words bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-2xl font-bold leading-tight text-transparent sm:text-3xl">
        {detail.title}
      </h1>
      <ul className="mt-3 space-y-1 text-sm text-gray-300">
        {detail.hostName && (
          <li className="flex items-center gap-1.5">
            <User aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="min-w-0 break-words">{copy.hostedBy(detail.hostName)}</span>
          </li>
        )}
        <li className="flex items-center gap-1.5">
          <CalendarClock aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span>{formatSessionWhen(detail.startsAt, lang, { nowMs })}</span>
        </li>
        {status === "scheduled" && <li className="ml-[1.375rem] text-xs text-gray-400">{copy.localTimeNote}</li>}
      </ul>
    </header>
  );
}

// ─── before the start, and after the end ────────────────────────────────

function LeaveButton({ onClick, copy }: { onClick: () => void; copy: SessionCopy }) {
  return (
    <Button type="button" variant="outline" className={SECONDARY_BUTTON} onClick={onClick}>
      <LogOut aria-hidden="true" />
      <span>{copy.leaveSession}</span>
    </Button>
  );
}

function Countdown({ seconds, lang, copy }: TextProps & { seconds: number }) {
  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
      <p role="timer" className="text-3xl font-bold tabular-nums text-amber-200 sm:text-4xl">
        {copy.startsIn(formatCountdown(seconds, lang))}
      </p>
    </section>
  );
}

function WaitingCard({ live, copy }: { live: LiveSession; copy: SessionCopy }) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
      <p className="text-sm text-gray-200">{copy.joinedWaiting}</p>
      <div className="mt-3">
        <LeaveButton onClick={live.leave} copy={copy} />
      </div>
    </section>
  );
}

function ReplayCard({ tracks, copy }: { tracks: readonly SessionTrackView[]; copy: SessionCopy }) {
  const { playTracks } = useAudio();
  const playable = replayTracks(tracks);
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 sm:p-6">
      <p className="text-sm text-gray-200">{copy.endedNote}</p>
      {playable.length > 0 && (
        <>
          <Button
            type="button"
            onClick={() => playTracks(playable, 0)}
            className={cn(PRIMARY_BUTTON, "mt-4 h-12 w-full text-base sm:w-auto [&_svg]:size-5")}
          >
            <Play aria-hidden="true" />
            <span>{copy.replayButton}</span>
          </Button>
          <p className="mt-2 text-xs text-gray-400">{copy.replayNote}</p>
        </>
      )}
    </section>
  );
}

// ─── live ────────────────────────────────────────────────────────────────

function noteText(note: NowPlayingNote, view: NowPlayingView, copy: SessionCopy): string {
  switch (note) {
    case "unavailable":
      return copy.trackUnavailableNow;
    case "break":
      return copy.shortBreak;
    case "breakThenNext":
      return copy.breakThenNext(view.next?.title ?? "");
    case "syncing":
      return copy.syncing;
  }
}

function ProgressBar({ view, track, copy }: { view: NowPlayingView; track: SessionTrackView; copy: SessionCopy }) {
  const total = track.durationSec;
  const elapsed = Math.min(Math.max(0, Math.floor(view.elapsedSec)), total);
  return (
    <div className="mt-4">
      <div
        role="progressbar"
        aria-label={copy.nowPlaying}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={elapsed}
        aria-valuetext={`${formatDuration(elapsed)} / ${formatDuration(total)}`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800"
      >
        <div className="h-full rounded-full bg-amber-400" style={{ width: `${view.progress * 100}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-xs tabular-nums text-gray-400">
        <span>{formatDuration(elapsed)}</span>
        <span>{formatDuration(total)}</span>
      </div>
    </div>
  );
}

function NowPlaying({ view, copy }: { view: NowPlayingView; copy: SessionCopy }) {
  const note = nowPlayingNote(view);
  const { track, next } = view;
  const heard = track !== null && track.available ? track : null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{copy.nowPlaying}</p>
      <div aria-live="polite" aria-atomic="true" className="mt-1 min-h-[3.5rem]">
        {heard && (
          <>
            <p className="break-words text-xl font-semibold leading-snug text-white sm:text-2xl">{heard.title}</p>
            {heard.artistName && <p className="break-words text-sm text-gray-300">{heard.artistName}</p>}
          </>
        )}
        {note && (
          <p className={cn("text-sm", heard ? "mt-1 text-amber-200" : "text-gray-200")}>
            {noteText(note, view, copy)}
          </p>
        )}
      </div>
      {track && <ProgressBar view={view} track={track} copy={copy} />}
      {next && view.kind !== "break" && (
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{copy.upNext}</span>
          <span className="min-w-0 break-words text-gray-200">{next.available ? next.title : copy.trackUnavailable}</span>
        </div>
      )}
    </div>
  );
}

function ListenControls({
  live,
  mode,
  signedIn,
  copy,
}: {
  live: LiveSession;
  mode: ListenMode;
  signedIn: boolean;
  copy: SessionCopy;
}) {
  if (mode === "none" || mode === "waiting") return null;
  const hint = mode === "join" ? copy.liveInvite : mode === "tap" ? copy.tapHint : copy.listeningLive;
  const { muted } = live.engine;
  const bigButton = cn(PRIMARY_BUTTON, "h-12 text-base [&_svg]:size-5");
  return (
    <div>
      <p className="text-sm text-gray-300">{hint}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* One button slot for all three states, so keyboard focus stays on it after a tap. */}
        {mode === "join" ? (
          <Button type="button" onClick={live.join} className={cn(bigButton, "w-full sm:w-auto sm:min-w-[16rem]")}>
            <Headphones aria-hidden="true" />
            <span>{copy.joinSession}</span>
          </Button>
        ) : mode === "tap" ? (
          <Button type="button" onClick={live.tap} className={cn(bigButton, "flex-1 sm:flex-none")}>
            <Headphones aria-hidden="true" />
            <span>{copy.tapToListen}</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className={SECONDARY_BUTTON}
            onClick={() => live.setMuted(!muted)}
          >
            {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
            <span>{muted ? copy.unmute : copy.mute}</span>
          </Button>
        )}
        {mode !== "join" && <LeaveButton onClick={live.leave} copy={copy} />}
      </div>
      {mode === "listening" && signedIn && <p className="mt-3 text-xs text-gray-400">{copy.streamNote}</p>}
    </div>
  );
}

function LiveCard({
  live,
  mode,
  playing,
  signedIn,
  copy,
}: {
  live: LiveSession;
  mode: ListenMode;
  playing: NowPlayingView;
  signedIn: boolean;
  copy: SessionCopy;
}) {
  return (
    <section className="rounded-2xl border border-red-500/40 bg-gradient-to-br from-red-500/10 via-gray-900/60 to-amber-500/5 p-4 sm:p-6">
      <NowPlaying view={playing} copy={copy} />
      <div role="status">
        {live.leftForPlayer && mode === "join" && (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {copy.leftForPlayer}
          </p>
        )}
      </div>
      <div className="mt-5">
        <ListenControls live={live} mode={mode} signedIn={signedIn} copy={copy} />
      </div>
    </section>
  );
}

// ─── the description and the tracklist ───────────────────────────────────

function About({ description, copy }: { description: string; copy: SessionCopy }) {
  return (
    <section aria-labelledby="session-about">
      <h2 id="session-about" className="text-lg font-semibold text-white">
        {copy.aboutTitle}
      </h2>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-300">{description}</p>
    </section>
  );
}

function TrackRow({
  track,
  row,
  number,
  copy,
}: {
  track: SessionTrackView;
  row: TrackRowState;
  number: number;
  copy: SessionCopy;
}) {
  const { grade } = track;
  return (
    <li
      aria-current={row.current ? "true" : undefined}
      className={cn(
        "flex items-start gap-3 px-3 py-3 sm:px-4",
        row.current && "bg-amber-500/10 ring-1 ring-inset ring-amber-400/60",
        row.past && "opacity-75",
      )}
    >
      <span aria-hidden="true" className="w-6 shrink-0 pt-0.5 text-right text-sm tabular-nums text-gray-400">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("break-words text-sm font-medium", row.unavailable ? "italic text-gray-400" : "text-white")}>
          {track.available ? track.title : copy.trackUnavailable}
        </p>
        {track.artistName && <p className="break-words text-xs text-gray-400">{track.artistName}</p>}
        {(row.current || row.next || grade) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {row.current && (
              <Badge variant="outline" className="gap-1 border-red-500/40 bg-red-500/15 text-red-200">
                <Play aria-hidden="true" className="h-3 w-3" />
                <span>{copy.trackPlaying}</span>
              </Badge>
            )}
            {row.next && (
              <Badge variant="outline" className="border-gray-600 bg-gray-800/60 text-gray-200">
                {copy.upNext}
              </Badge>
            )}
            {grade && (
              <Badge variant="outline" className="border-amber-400/40 bg-amber-400/10 text-amber-200">
                <span aria-hidden="true">{formatSignedBadge(grade)}</span>
                <span className="sr-only">{copy.signedBadgeLabel(grade)}</span>
              </Badge>
            )}
          </div>
        )}
      </div>
      <span className="shrink-0 pt-0.5 text-xs tabular-nums text-gray-400">{formatDuration(track.durationSec)}</span>
    </li>
  );
}

function Tracklist({
  tracks,
  rows,
  totalSec,
  copy,
}: {
  tracks: readonly SessionTrackView[];
  rows: readonly TrackRowState[];
  totalSec: number;
  copy: SessionCopy;
}) {
  if (tracks.length === 0) return null;
  return (
    <section aria-labelledby="session-tracklist">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="session-tracklist" className="text-lg font-semibold text-white">
          {copy.tracklistTitle}
        </h2>
        <p className="text-sm text-gray-400">{copy.tracklistMeta(tracks.length, formatTotalLength(totalSec))}</p>
      </div>
      <ol
        role="list"
        className="mt-3 divide-y divide-gray-800 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/60"
      >
        {tracks.map((track, index) => (
          <TrackRow key={track.position} track={track} row={rows[index]} number={index + 1} copy={copy} />
        ))}
      </ol>
    </section>
  );
}

// ─── the chat ────────────────────────────────────────────────────────────

function noticeText(notice: ComposerNotice, copy: SessionCopy): string {
  switch (notice) {
    case "tooLong":
      return copy.chatTooLong(CHAT_MAX_CHARS);
    case "slowMode":
      return copy.chatSlowMode;
    case "failed":
      return copy.chatFailed;
  }
}

/** Author and body are text nodes, never markup: whatever a visitor wrote is shown as written. */
const ChatMessageRow = memo(function ChatMessageRow({
  message,
  lang,
  copy,
}: TextProps & { message: SessionChatMessage }) {
  const time = formatChatTime(message.createdAt, lang);
  return (
    <li
      className={cn(
        "rounded-lg border px-3 py-2",
        message.isHost ? "border-amber-400/50 bg-amber-400/10" : "border-transparent bg-gray-800/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="break-words text-sm font-semibold text-white">{message.author}</span>
        {message.isHost && (
          <Badge variant="outline" className="border-amber-400/50 bg-amber-400/20 px-2 py-0 text-[11px] text-amber-100">
            {copy.chatHost}
          </Badge>
        )}
        {time && (
          <time dateTime={message.createdAt} className="text-xs text-gray-400">
            {time}
          </time>
        )}
      </div>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-100">{message.body}</p>
    </li>
  );
});

interface ChatPanelProps extends TextProps {
  sessionId: number;
  view: DetailView;
  auth: AuthState;
}

// Only primitives and the shared copy object come in, so the once-a-second redraw of the page skips it.
const ChatPanel = memo(function ChatPanel({ sessionId, view, auth, lang, copy }: ChatPanelProps) {
  const panel = chatPanelState(view, auth);
  const chat = useSessionChat(sessionId, panel);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [lastFailure, setLastFailure] = useState<ChatPostFailure | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const anchorRef = useRef<{ height: number; top: number } | null>(null);

  const checked = checkChatDraft(draft);
  const composer = composerFor(panel, lastFailure);
  const notice = composerNotice(checked, lastFailure);
  const { messages } = chat;
  const newestId = messages.length > 0 ? messages[messages.length - 1].id : null;
  const oldestId = messages.length > 0 ? messages[0].id : null;

  // New messages scroll into view only for a reader who is already at the bottom.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list && stickRef.current) list.scrollTop = list.scrollHeight;
  }, [newestId, chat.loaded]);

  // Older messages arrive above the reader, so the scroll position moves down by what was added.
  useLayoutEffect(() => {
    const list = listRef.current;
    const anchor = anchorRef.current;
    if (list && anchor && !chat.loadingEarlier) {
      list.scrollTop = anchor.top + (list.scrollHeight - anchor.height);
      anchorRef.current = null;
    }
  }, [oldestId, chat.loadingEarlier]);

  const onScroll = () => {
    const list = listRef.current;
    if (list) stickRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
  };

  const showEarlier = () => {
    const list = listRef.current;
    if (list) anchorRef.current = { height: list.scrollHeight, top: list.scrollTop };
    chat.loadEarlier();
  };

  const onDraftChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
    setLastFailure((failure) => (failure === "signIn" ? failure : null));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!checked.ok || sending) return;
    setSending(true);
    setLastFailure(null);
    const result = await postSessionMessage(checked.content);
    setSending(false);
    if (result === "posted") {
      setDraft("");
      stickRef.current = true;
      inputRef.current?.focus();
      chat.refreshAfterPost();
    } else {
      setLastFailure(result);
    }
  };

  const firstLoadFailed = panel.loads && !chat.loaded && chat.refreshFailed;

  return (
    <section aria-labelledby="session-chat" className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
      <h2 id="session-chat" className="flex items-center gap-2 text-lg font-semibold text-white">
        <MessageCircle aria-hidden="true" className="h-5 w-5 text-amber-300" />
        <span>{copy.chatTitle}</span>
      </h2>

      {panel.note && (
        <p className="mt-2 text-sm text-gray-300">
          {panel.note === "beforeStart" ? copy.chatBeforeStart : copy.chatEnded}
        </p>
      )}

      <div role="status" className="text-sm text-gray-300">
        {panel.loads && !chat.loaded && !chat.refreshFailed && <p className="mt-3">{copy.chatLoading}</p>}
        {chat.refreshFailed && <p className="mt-3 text-amber-200">{copy.chatRefreshFailed}</p>}
      </div>
      {firstLoadFailed && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(SECONDARY_BUTTON, "mt-2")}
          onClick={chat.refreshNow}
        >
          {copy.retry}
        </Button>
      )}

      {chat.loaded && (messages.length > 0 || panel.note !== "ended") && (
        <>
          {chat.hasEarlier && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(SECONDARY_BUTTON, "mt-3")}
              disabled={chat.loadingEarlier}
              onClick={showEarlier}
            >
              {copy.chatLoadEarlier}
            </Button>
          )}
          {/* Not a live region: the session's own sound is what a listener follows, so messages are not read out. */}
          <div
            ref={listRef}
            onScroll={onScroll}
            tabIndex={0}
            role="group"
            aria-label={copy.chatTitle}
            className={cn(
              "mt-3 max-h-80 min-h-[8rem] overflow-y-auto rounded-lg border border-gray-800 bg-gray-950/60 sm:max-h-96 lg:max-h-[28rem]",
              FOCUS_RING,
            )}
          >
            {messages.length === 0 ? (
              <p className="p-3 text-sm text-gray-400">{copy.chatEmpty}</p>
            ) : (
              <ul className="space-y-2 p-2">
                {messages.map((message) => (
                  <ChatMessageRow key={message.id} message={message} lang={lang} copy={copy} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {composer === "compose" && (
        <form onSubmit={submit} noValidate className="mt-3">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={draft}
              onChange={onDraftChange}
              aria-label={copy.chatPlaceholder}
              aria-describedby="session-chat-notice"
              aria-invalid={notice === "tooLong" ? true : undefined}
              placeholder={copy.chatPlaceholder}
              autoComplete="off"
              enterKeyHint="send"
              className="border-gray-700 bg-gray-900 text-white placeholder:text-gray-500 focus-visible:ring-amber-400 focus-visible:ring-offset-gray-950"
            />
            <Button type="submit" disabled={sending || !checked.ok} className={cn(PRIMARY_BUTTON, "shrink-0")}>
              <Send aria-hidden="true" />
              <span>{sending ? copy.chatSending : copy.chatSend}</span>
            </Button>
          </div>
          <div id="session-chat-notice" role="status" className="text-sm text-amber-200">
            {notice && <p className="mt-2">{noticeText(notice, copy)}</p>}
          </div>
          <p className="mt-2 text-xs text-gray-400">{copy.chatPublicNote}</p>
        </form>
      )}
      {composer === "signIn" && (
        <Button asChild className={cn(PRIMARY_BUTTON, "mt-3 w-full")}>
          <Link href={signInPath(sessionPath(sessionId))}>{copy.chatSignIn}</Link>
        </Button>
      )}
      {composer === "checking" && <Skeleton className="mt-3 h-10 bg-gray-800 motion-reduce:animate-none" />}
    </section>
  );
});

// ─── the page ────────────────────────────────────────────────────────────

function SessionView({ sessionId, lang, copy }: TextProps & { sessionId: number }) {
  const live = useLiveSession(sessionId);
  const { user, loading: checkingAccount } = useAuthContext();
  const { snapshot, engine } = live;
  const { detail, status } = snapshot;
  const view = detailView(snapshot);

  if (view === "notfound") return <NotFoundView copy={copy} />;
  if (view === "error") {
    return (
      <PageShell copy={copy}>
        <LoadError copy={copy} onRetry={live.refresh} />
      </PageShell>
    );
  }
  if (detail === null || status === null) {
    return (
      <PageShell copy={copy}>
        <DetailSkeleton label={copy.loadingSession} />
      </PageShell>
    );
  }

  const nowMs = live.serverNow();
  const auth = authState({ signedIn: user !== null, checking: checkingAccount });
  const plan = planPlayback({ status, schedule: detail, serverNowMs: nowMs });
  const mode = listenMode({ view, joined: engine.joined, needsTap: engine.needsTap });
  const panel = chatPanelState(view, auth);

  return (
    <PageShell copy={copy}>
      <SessionHeader detail={detail} status={status} nowMs={nowMs} lang={lang} copy={copy} />
      <OfflineBanner show={showsOfflineBanner(view, snapshot.offline)} copy={copy} />

      {status === "cancelled" ? (
        <p className="mt-6 rounded-xl border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-300">
          {copy.cancelledNote}
        </p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
          <div className="space-y-6 lg:col-start-1">
            {status === "scheduled" && <Countdown seconds={countdownSec(plan) ?? 0} lang={lang} copy={copy} />}
            {mode === "waiting" && <WaitingCard live={live} copy={copy} />}
            {status === "live" && (
              <LiveCard
                live={live}
                mode={mode}
                playing={nowPlayingView(plan, detail.tracks, engine.failedTrackId)}
                signedIn={user !== null}
                copy={copy}
              />
            )}
            {status === "ended" && <ReplayCard tracks={detail.tracks} copy={copy} />}
          </div>

          {panel.visible && (
            <div
              className={cn(
                "lg:col-start-2 lg:row-span-2 lg:row-start-1",
                status !== "live" && "order-last lg:order-none",
              )}
            >
              <ChatPanel sessionId={sessionId} view={view} auth={auth} lang={lang} copy={copy} />
            </div>
          )}

          <div className="space-y-6 lg:col-start-1">
            {detail.description && <About description={detail.description} copy={copy} />}
            <Tracklist
              tracks={detail.tracks}
              rows={trackRowStates(plan, detail.tracks)}
              totalSec={detail.totalDurationSec}
              copy={copy}
            />
          </div>
        </div>
      )}
    </PageShell>
  );
}

export default function SessionDetailPage() {
  const [, params] = useRoute("/sessions/:id");
  const { currentLang } = useLanguage();
  const lang = sessionLang(currentLang);
  const copy = getSessionCopy(lang);
  const sessionId = parseSessionId(params?.id);

  if (sessionId === null) return <NotFoundView copy={copy} />;
  return <SessionView key={sessionId} sessionId={sessionId} lang={lang} copy={copy} />;
}
