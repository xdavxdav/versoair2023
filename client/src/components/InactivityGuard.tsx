/**
 * InactivityGuard — Session Security Component
 *
 * Behaviour:
 *  • Tracks user activity (mouse, keyboard, scroll, touch, click, focus).
 *  • After IDLE_TIMEOUT_MS of *zero* activity → auto-logout.
 *  • After CHALLENGE_INTERVAL_MS of continuous activity → show a
 *    lightweight "still you?" captcha-like challenge instead of logging out.
 *  • A 30-second countdown warning is displayed before either action so the
 *    user can dismiss it instantly by clicking.
 *  • Challenge: pick the matching emoji from a small grid (quick, accessible).
 *  • Failed challenge or ignored countdown → logout.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, LogOut, Timer, CheckCircle, XCircle } from "lucide-react";

// ─── Timing ──────────────────────────────────────────
/** Time of *zero* interaction before auto-logout (15 min) */
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

/** How long before timeout we show the warning dialog (30 s) */
const WARNING_BEFORE_MS = 30 * 1000;

/** Continuous-activity interval that triggers the captcha challenge (45 min) */
const CHALLENGE_INTERVAL_MS = 45 * 60 * 1000;

/** How long the user has to solve the captcha before forced logout (60 s) */
const CHALLENGE_DEADLINE_MS = 60 * 1000;

// ─── Emoji Challenge Pool ────────────────────────────
const EMOJI_GROUPS = [
  ["🍎", "🍊", "🍋", "🍇", "🍓", "🫐", "🥝", "🍑"],
  ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼"],
  ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🛻"],
  ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🎱", "🏓"],
  ["🌸", "🌹", "🌻", "🌺", "🌷", "💐", "🌼", "🪻"],
  ["🎸", "🎹", "🥁", "🎺", "🎷", "🪗", "🎻", "🪕"],
];

function pickChallenge() {
  const group = EMOJI_GROUPS[Math.floor(Math.random() * EMOJI_GROUPS.length)];
  // Pick 6 unique emojis from the group
  const shuffled = [...group].sort(() => Math.random() - 0.5);
  const options = shuffled.slice(0, 6);
  const target = options[Math.floor(Math.random() * options.length)];
  // Re-shuffle so target isn't always in the same spot
  return {
    target,
    options: options.sort(() => Math.random() - 0.5),
  };
}

// ─── Component ───────────────────────────────────────
export default function InactivityGuard() {
  const { user, logout } = useAuthContext();

  // Refs for timers so we can clear/reset without re-renders
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const challengeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityAccum = useRef<number>(0); // ms of accumulated activity
  const lastActivityTs = useRef<number>(Date.now());
  const tickInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Use a ref for mode to avoid stale-closure issues in timers/listeners
  const modeRef = useRef<"idle" | "warning" | "challenge" | "success" | "none">(
    "none",
  );

  // UI state
  const [mode, setModeState] = useState<
    "idle" | "warning" | "challenge" | "success" | "none"
  >("none");
  const [countdown, setCountdown] = useState(30);
  const [challenge, setChallenge] = useState(() => pickChallenge());
  const [challengeCountdown, setChallengeCountdown] = useState(60);
  const [wrongPick, setWrongPick] = useState(false);

  // Sync setter: always update both the ref and the state
  const setMode = useCallback(
    (m: "idle" | "warning" | "challenge" | "success" | "none") => {
      modeRef.current = m;
      setModeState(m);
    },
    [],
  );

  // ── Timer cleanup ─────────────────────────────────
  const clearAllTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (challengeTimer.current) clearTimeout(challengeTimer.current);
    if (tickInterval.current) clearInterval(tickInterval.current);
    idleTimer.current = null;
    warningTimer.current = null;
    challengeTimer.current = null;
    tickInterval.current = null;
  }, []);

  // ── Logout helper ─────────────────────────────────
  const doLogout = useCallback(() => {
    clearAllTimers();
    setMode("none");
    logout();
  }, [logout, clearAllTimers, setMode]);

  // ── Start the idle countdown (from scratch) ───────
  const resetIdleTimer = useCallback(() => {
    // Read from ref (always current) instead of stale state closure
    const currentMode = modeRef.current;
    if (currentMode === "challenge" || currentMode === "warning") return;

    clearAllTimers();
    lastActivityTs.current = Date.now();

    // 1) Set a timer for the WARNING (fires 30s before logout)
    warningTimer.current = setTimeout(() => {
      setMode("warning");
      setCountdown(WARNING_BEFORE_MS / 1000);

      // Tick every second for the countdown
      tickInterval.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Time's up → logout
            doLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
  }, [clearAllTimers, doLogout, setMode]);

  // ── Show captcha challenge ────────────────────────
  const showCaptchaChallenge = useCallback(() => {
    clearAllTimers();
    setChallenge(pickChallenge());
    setChallengeCountdown(CHALLENGE_DEADLINE_MS / 1000);
    setWrongPick(false);
    setMode("challenge");

    // Countdown for solving
    tickInterval.current = setInterval(() => {
      setChallengeCountdown((prev) => {
        if (prev <= 1) {
          doLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Hard deadline
    challengeTimer.current = setTimeout(() => {
      doLogout();
    }, CHALLENGE_DEADLINE_MS);
  }, [clearAllTimers, doLogout, setMode]);

  // ── Track accumulated activity for the captcha trigger ──
  // Use a ref-based callback so the event listeners always call
  // the latest version without needing to re-attach.
  const trackActivityRef = useRef<() => void>(() => {});
  trackActivityRef.current = () => {
    const now = Date.now();
    const delta = now - lastActivityTs.current;
    lastActivityTs.current = now;

    // Only count small deltas (< 2s gap = still active)
    if (delta < 2000) {
      activityAccum.current += delta;
    }

    // If continuous activity exceeds threshold → challenge
    if (
      activityAccum.current >= CHALLENGE_INTERVAL_MS &&
      modeRef.current === "none"
    ) {
      activityAccum.current = 0;
      showCaptchaChallenge();
      return;
    }

    // Reset idle timer on any activity
    resetIdleTimer();
  };

  // ── Handle captcha pick ───────────────────────────
  const handlePick = (emoji: string) => {
    if (emoji === challenge.target) {
      // Correct! Dismiss and reset everything
      clearAllTimers();
      setMode("success");
      activityAccum.current = 0;
      setTimeout(() => {
        setMode("none");
        // Directly start a fresh idle timer after success flash
        clearAllTimers();
        lastActivityTs.current = Date.now();
        warningTimer.current = setTimeout(() => {
          setMode("warning");
          setCountdown(WARNING_BEFORE_MS / 1000);
          tickInterval.current = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                doLogout();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
      }, 1200);
    } else {
      // Wrong pick — show feedback, then logout
      setWrongPick(true);
      setTimeout(() => {
        doLogout();
      }, 1500);
    }
  };

  // ── Dismiss the idle warning (user clicked "I'm here") ─
  const dismissWarning = useCallback(() => {
    // 1. Stop all running timers (countdown interval, etc.)
    clearAllTimers();

    // 2. Mark mode as "none" via ref FIRST so resetIdleTimer won't bail out
    modeRef.current = "none";
    setModeState("none");

    // 3. Reset activity accumulator
    activityAccum.current = 0;

    // 4. Restart idle monitoring — ref is already "none" so this will proceed
    lastActivityTs.current = Date.now();
    warningTimer.current = setTimeout(() => {
      setMode("warning");
      setCountdown(WARNING_BEFORE_MS / 1000);
      tickInterval.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            doLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
  }, [clearAllTimers, doLogout, setMode]);

  // ── Attach global activity listeners ──────────────
  useEffect(() => {
    if (!user) return;

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "focus",
    ];

    // Throttle: fire at most once per 2 s to avoid performance cost
    let lastFired = 0;
    const handler = () => {
      const now = Date.now();
      if (now - lastFired < 2000) return;
      lastFired = now;
      // Call through ref so we always use the latest closure
      trackActivityRef.current();
    };

    events.forEach((evt) => window.addEventListener(evt, handler, true));

    // Kick off the initial idle timer
    modeRef.current = "none";
    resetIdleTimer();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handler, true));
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Don't render anything if not logged in ────────
  if (!user) return null;

  // ── Warning dialog (idle) ─────────────────────────
  if (mode === "warning") {
    return (
      <Dialog open onOpenChange={() => dismissWarning()}>
        <DialogContent className="sm:max-w-md border-amber-200 bg-gradient-to-b from-white to-amber-50/40">
          <DialogHeader className="text-center items-center">
            <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
              <Timer className="h-7 w-7 text-amber-600 animate-pulse" />
            </div>
            <DialogTitle className="text-xl">Are you still there?</DialogTitle>
            <DialogDescription className="text-gray-500 mt-1">
              You've been inactive. You'll be logged out in{" "}
              <span className="font-bold text-amber-700">{countdown}s</span> for
              security.
            </DialogDescription>
          </DialogHeader>

          <Progress
            value={(countdown / (WARNING_BEFORE_MS / 1000)) * 100}
            className="h-2 mt-2 [&>div]:bg-gradient-to-r [&>div]:from-amber-400 [&>div]:to-orange-500"
          />

          <div className="flex gap-3 mt-5">
            <Button
              onClick={dismissWarning}
              className="flex-1 gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-md"
            >
              <ShieldCheck className="h-4 w-4" />
              I'm still here
            </Button>
            <Button
              variant="outline"
              onClick={doLogout}
              className="gap-2 border-gray-300 text-gray-600"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Captcha challenge dialog (active user) ────────
  if (mode === "challenge") {
    return (
      <Dialog open onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md border-blue-200 bg-gradient-to-b from-white to-blue-50/40 [&>button]:hidden">
          <DialogHeader className="text-center items-center">
            <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-blue-600" />
            </div>
            <DialogTitle className="text-xl">Quick security check</DialogTitle>
            <DialogDescription className="text-gray-500 mt-1">
              You've been active for a while — just confirm you're you.
            </DialogDescription>
          </DialogHeader>

          {/* Target */}
          <div className="text-center mt-3">
            <p className="text-sm font-medium text-gray-600 mb-2">
              Tap the matching emoji
            </p>
            <span className="text-5xl select-none">{challenge.target}</span>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {challenge.options.map((emoji, i) => (
              <button
                key={i}
                onClick={() => handlePick(emoji)}
                disabled={wrongPick}
                className={`text-3xl p-4 rounded-xl border-2 transition-all duration-200 select-none
                  ${
                    wrongPick
                      ? "opacity-40 cursor-not-allowed border-gray-200"
                      : "border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:scale-110 active:scale-95 cursor-pointer"
                  }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {wrongPick && (
            <div className="flex items-center gap-2 justify-center mt-3 text-red-600 font-medium animate-in fade-in slide-in-from-bottom-2">
              <XCircle className="h-4 w-4" />
              Wrong pick — logging out…
            </div>
          )}

          {/* Timer bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Time remaining</span>
              <span className="font-mono font-medium text-gray-700">
                {challengeCountdown}s
              </span>
            </div>
            <Progress
              value={
                (challengeCountdown / (CHALLENGE_DEADLINE_MS / 1000)) * 100
              }
              className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-cyan-500"
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Success flash ─────────────────────────────────
  if (mode === "success") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
        <div className="bg-white border border-emerald-200 shadow-2xl rounded-2xl px-8 py-6 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
          <CheckCircle className="h-6 w-6 text-emerald-600" />
          <span className="font-semibold text-emerald-700">Verified ✓</span>
        </div>
      </div>
    );
  }

  return null;
}
