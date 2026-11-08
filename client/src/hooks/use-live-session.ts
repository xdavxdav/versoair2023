/**
 * Binds one live listening session to a page: a controller made for this mount, its state
 * read as external stores, and the actions behind the Join, Tap, Leave and Mute buttons.
 * Its chat is read and written here too.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { SessionChatMessage } from "@shared/listening-session";
import { useAuthContext } from "@/contexts/AuthContext";
import { useAudio } from "@/lib/audio-context";
import { authenticatedFetch } from "@/lib/auth";
import {
  createLiveSessionController,
  fetchSessionJson,
  type LiveSessionController,
  type LiveSessionSnapshot,
} from "@/lib/listening-session-live";
import {
  EMPTY_CHAT,
  applyChatPage,
  chatPollDelayMs,
  chatUrl,
  classifyChatPostFailure,
  earlierChatRequest,
  nextChatRequest,
  parseChatMessages,
  type ChatPostFailure,
  type ChatRequest,
  type ChatState,
} from "@/lib/listening-session-page-state";
import type { EngineState } from "@/lib/listening-session-player";

const INITIAL_SNAPSHOT: LiveSessionSnapshot = {
  phase: "loading",
  detail: null,
  status: null,
  offline: false,
};

const INITIAL_ENGINE: EngineState = {
  joined: false,
  needsTap: false,
  muted: false,
  failedTrackId: null,
};

const noop = () => {};

/** The id the global player already uses to group a listener's plays. */
function playSessionId(): string {
  try {
    const existing = localStorage.getItem("verso_session");
    if (existing) return existing;
    const created = `s_${Date.now()}`;
    localStorage.setItem("verso_session", created);
    return created;
  } catch {
    return `s_${Date.now()}`;
  }
}

/** The same call the global player makes after 30 s of a track; a failure must never reach the listener. */
function recordSessionPlay(trackId: number): void {
  authenticatedFetch("/api/streaming/record-play", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackId, duration: 30, sessionId: playSessionId() }),
  }).catch(() => {});
}

/** Re-renders once a second while the tab is visible, for countdowns and progress bars. */
export function useSecondTick(): void {
  const [, setTick] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const bump = () => setTick((value) => value + 1);
    const start = () => {
      if (timer === null) timer = setInterval(bump, 1000);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        bump();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, []);
}

interface ActiveController {
  sessionId: number;
  controller: LiveSessionController;
}

export interface LiveSession {
  snapshot: LiveSessionSnapshot;
  engine: EngineState;
  /** The listener started the global player, which ended their live listening. */
  leftForPlayer: boolean;
  /** The server clock now. The hook re-renders every second, so read it while rendering. */
  serverNow: () => number;
  /** Call from the click handler itself: the browser only allows sound inside a gesture. */
  join: () => void;
  /** Call from the click handler of the tap-to-listen button. */
  tap: () => void;
  leave: () => void;
  setMuted: (muted: boolean) => void;
  refresh: () => void;
}

export function useLiveSession(sessionId: number): LiveSession {
  const { user } = useAuthContext();
  const { pause: pauseGlobalPlayer, isPlaying: globalPlaying } = useAudio();
  const [active, setActive] = useState<ActiveController | null>(null);
  const [leftForPlayer, setLeftForPlayer] = useState(false);
  const signedInRef = useRef(false);
  const globalWasPlaying = useRef(globalPlaying);
  const controller = active !== null && active.sessionId === sessionId ? active.controller : null;

  useSecondTick();

  useEffect(() => {
    signedInRef.current = user !== null;
  }, [user]);

  // A stopped controller cannot restart and StrictMode runs this effect twice, so each run makes its own.
  useEffect(() => {
    const created = createLiveSessionController({
      sessionId,
      fetchJson: fetchSessionJson,
      createAudio: () => new Audio(),
      recordPlay: (trackId) => {
        if (signedInRef.current) recordSessionPlay(trackId);
      },
    });
    setActive({ sessionId, controller: created });
    created.start();
    return () => created.stop();
  }, [sessionId]);

  const subscribeSession = useCallback(
    (onChange: () => void) => (controller ? controller.subscribe(onChange) : noop),
    [controller],
  );
  const subscribeEngine = useCallback(
    (onChange: () => void) => (controller ? controller.engine.subscribe(onChange) : noop),
    [controller],
  );
  const snapshot = useSyncExternalStore(subscribeSession, () =>
    controller ? controller.getSnapshot() : INITIAL_SNAPSHOT,
  );
  const engine = useSyncExternalStore(subscribeEngine, () =>
    controller ? controller.engine.getState() : INITIAL_ENGINE,
  );

  useEffect(() => {
    if (!controller) return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") controller.refresh();
    };
    const onOnline = () => controller.refresh();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [controller]);

  // The engine keeps its own state when a session ends, so release the sound here.
  const { status } = snapshot;
  useEffect(() => {
    if (controller && engine.joined && (status === "ended" || status === "cancelled")) {
      controller.engine.leave();
    }
  }, [controller, engine.joined, status]);

  // Starting the global player while joined means the listener chose something else.
  useEffect(() => {
    const started = globalPlaying && !globalWasPlaying.current;
    globalWasPlaying.current = globalPlaying;
    if (started && controller && engine.joined) {
      controller.engine.leave();
      setLeftForPlayer(true);
    }
  }, [globalPlaying, controller, engine.joined]);

  const join = useCallback(() => {
    if (!controller) return;
    pauseGlobalPlayer();
    setLeftForPlayer(false);
    controller.engine.join();
  }, [controller, pauseGlobalPlayer]);

  const tap = useCallback(() => controller?.engine.tap(), [controller]);
  const leave = useCallback(() => controller?.engine.leave(), [controller]);
  const setMuted = useCallback((muted: boolean) => controller?.engine.setMuted(muted), [controller]);
  const refresh = useCallback(() => controller?.refresh(), [controller]);
  const serverNow = useCallback(() => (controller ? controller.serverNow() : Date.now()), [controller]);

  return { snapshot, engine, leftForPlayer, serverNow, join, tap, leave, setMuted, refresh };
}

/** The server keeps a chat answer for about 2 s, so a message just sent can be missing from an answer given right away. */
const POST_FOLLOW_UP_MS = 2_200;

async function requestChat(
  sessionId: number,
  request: ChatRequest,
  signal: AbortSignal,
): Promise<SessionChatMessage[] | null> {
  const { status, body } = await fetchSessionJson(chatUrl(sessionId, request), signal);
  return status >= 200 && status < 300 ? parseChatMessages(body) : null;
}

export interface SessionChat {
  messages: readonly SessionChatMessage[];
  /** The first answer has come in, so an empty list really is an empty chat. */
  loaded: boolean;
  /** Messages older than the first one on screen may exist. */
  hasEarlier: boolean;
  loadingEarlier: boolean;
  /** The last request failed; the messages already on screen stay. */
  refreshFailed: boolean;
  loadEarlier: () => void;
  refreshNow: () => void;
  /** After the listener wrote a message: look now, and again once the server's cached answer has expired. */
  refreshAfterPost: () => void;
}

/**
 * The messages of one session's chat. `loads` fetches them once; `polls` keeps them current, about
 * every 4 s in a visible tab and every 15 s in a hidden one. Use it under a key of the session id.
 */
export function useSessionChat(sessionId: number, mode: { loads: boolean; polls: boolean }): SessionChat {
  const { loads, polls } = mode;
  const [chat, setChat] = useState<ChatState>(EMPTY_CHAT);
  const [loaded, setLoaded] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  // The poller reads the newest message from here, so a request never waits for a render.
  const chatRef = useRef<ChatState>(EMPTY_CHAT);
  const pollNowRef = useRef<() => void>(noop);
  const earlierAbortRef = useRef<AbortController | null>(null);
  const followUpRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = useCallback((request: ChatRequest, incoming: readonly SessionChatMessage[]) => {
    const next = applyChatPage(chatRef.current, request, incoming);
    if (next !== chatRef.current) {
      chatRef.current = next;
      setChat(next);
    }
  }, []);

  useEffect(() => {
    if (!loads) return;
    let stopped = false;
    let busy = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const abort = new AbortController();

    const schedule = () => {
      if (stopped || !polls) return;
      const tabVisible = document.visibilityState === "visible";
      timer = setTimeout(poll, chatPollDelayMs({ tabVisible, failures }));
    };

    async function poll() {
      if (stopped || busy) return;
      if (timer !== null) clearTimeout(timer);
      timer = null;
      busy = true;
      const request = nextChatRequest(chatRef.current.messages);
      try {
        const incoming = await requestChat(sessionId, request, abort.signal);
        if (stopped) return;
        if (incoming) {
          failures = 0;
          apply(request, incoming);
          setLoaded(true);
          setRefreshFailed(false);
        } else {
          failures += 1;
          setRefreshFailed(true);
        }
      } catch {
        if (stopped) return;
        failures += 1;
        setRefreshFailed(true);
      } finally {
        busy = false;
        schedule();
      }
    }

    const pollWhenPolling = () => {
      if (polls) void poll();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") pollWhenPolling();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", pollWhenPolling);
    pollNowRef.current = () => {
      void poll();
    };
    void poll();

    return () => {
      stopped = true;
      abort.abort();
      if (timer !== null) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", pollWhenPolling);
      pollNowRef.current = noop;
    };
  }, [sessionId, loads, polls, apply]);

  useEffect(
    () => () => {
      earlierAbortRef.current?.abort();
      if (followUpRef.current !== null) clearTimeout(followUpRef.current);
    },
    [],
  );

  const loadEarlier = useCallback(() => {
    const request = earlierChatRequest(chatRef.current.messages);
    if (request === null || earlierAbortRef.current !== null) return;
    const abort = new AbortController();
    earlierAbortRef.current = abort;
    setLoadingEarlier(true);
    requestChat(sessionId, request, abort.signal)
      .then((incoming) => {
        if (abort.signal.aborted) return;
        if (incoming) apply(request, incoming);
        else setRefreshFailed(true);
      })
      .catch(() => {
        if (!abort.signal.aborted) setRefreshFailed(true);
      })
      .finally(() => {
        earlierAbortRef.current = null;
        if (!abort.signal.aborted) setLoadingEarlier(false);
      });
  }, [sessionId, apply]);

  const refreshNow = useCallback(() => pollNowRef.current(), []);

  const refreshAfterPost = useCallback(() => {
    pollNowRef.current();
    if (followUpRef.current !== null) clearTimeout(followUpRef.current);
    followUpRef.current = setTimeout(() => pollNowRef.current(), POST_FOLLOW_UP_MS);
  }, []);

  return {
    messages: chat.messages,
    loaded,
    hasEarlier: chat.earlier,
    loadingEarlier,
    refreshFailed,
    loadEarlier,
    refreshNow,
    refreshAfterPost,
  };
}

/**
 * Writes a chat message the way the community page does: the chat reads the community wall. Nothing
 * from the answer is kept, since the wall's own post record can carry more than the chat may show.
 */
export async function postSessionMessage(content: string): Promise<"posted" | ChatPostFailure> {
  try {
    const response = await authenticatedFetch("/api/community/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (response.ok) return "posted";
    const body: unknown = await response.json().catch(() => null);
    return classifyChatPostFailure(response.status, body);
  } catch {
    return "failed";
  }
}
