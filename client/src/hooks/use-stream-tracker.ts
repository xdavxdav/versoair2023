/**
 * 🎵 StreamRoyale — Heartbeat Stream Tracker Hook
 *
 * Sends heartbeat pings every 10 seconds while audio is playing.
 * On unmount or track change, sends completion event.
 */
import { useRef, useCallback, useEffect } from "react";

interface StreamSession {
  sessionId: string;
  trackId: number;
  startTime: number;
  elapsed: number;
  isActive: boolean;
  boosted: boolean;
  superStream: boolean;
}

export function useStreamTracker() {
  const sessionRef = useRef<StreamSession | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate unique session ID
  const generateSessionId = () =>
    `sr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  // Send heartbeat ping
  const sendHeartbeat = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || !session.isActive) return;

    const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
    session.elapsed = elapsed;

    try {
      await fetch("/api/streamroyale/stream/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          trackId: session.trackId,
          sessionId: session.sessionId,
          elapsed,
          boosted: session.boosted,
          superStream: session.superStream,
        }),
      });
    } catch (e) {
      // Silent fail — heartbeat is fire-and-forget
    }
  }, []);

  // Start tracking a stream
  const startStream = useCallback(
    (
      trackId: number,
      options?: { boosted?: boolean; superStream?: boolean },
    ) => {
      // Complete any existing session first
      if (sessionRef.current?.isActive) {
        completeStream();
      }

      const session: StreamSession = {
        sessionId: generateSessionId(),
        trackId,
        startTime: Date.now(),
        elapsed: 0,
        isActive: true,
        boosted: options?.boosted || false,
        superStream: options?.superStream || false,
      };

      sessionRef.current = session;

      // Send initial heartbeat
      sendHeartbeat();

      // Start heartbeat interval (every 10 seconds)
      intervalRef.current = setInterval(sendHeartbeat, 10_000);

      return session.sessionId;
    },
    [sendHeartbeat],
  );

  // Complete (end) a stream
  const completeStream = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return null;

    session.isActive = false;

    // Clear heartbeat interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const duration = Math.floor((Date.now() - session.startTime) / 1000);

    try {
      const res = await fetch("/api/streamroyale/stream/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sessionId: session.sessionId,
          duration,
        }),
      });
      const data = await res.json();
      sessionRef.current = null;
      return data;
    } catch (e) {
      sessionRef.current = null;
      return null;
    }
  }, []);

  // Pause stream tracking (e.g., audio paused)
  const pauseStream = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.isActive = false;
    }
  }, []);

  // Resume stream tracking
  const resumeStream = useCallback(() => {
    if (sessionRef.current && !sessionRef.current.isActive) {
      sessionRef.current.isActive = true;
      sendHeartbeat();
      intervalRef.current = setInterval(sendHeartbeat, 10_000);
    }
  }, [sendHeartbeat]);

  // Apply boost to current session
  const applyBoost = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.boosted = true;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Fire-and-forget completion on unmount
      if (sessionRef.current?.isActive) {
        const session = sessionRef.current;
        const duration = Math.floor((Date.now() - session.startTime) / 1000);
        navigator.sendBeacon?.(
          "/api/streamroyale/stream/complete",
          new Blob(
            [
              JSON.stringify({
                sessionId: session.sessionId,
                duration,
              }),
            ],
            { type: "application/json" },
          ),
        );
      }
    };
  }, []);

  return {
    startStream,
    completeStream,
    pauseStream,
    resumeStream,
    applyBoost,
    isTracking: !!sessionRef.current?.isActive,
    currentSession: sessionRef.current,
  };
}
