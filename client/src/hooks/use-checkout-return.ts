import { useCallback, useEffect, useRef, useState } from "react";
import {
  parseCheckoutReturn,
  pollUntil,
  withoutCheckoutReturn,
} from "@/lib/checkout-return";

export type CheckoutReturnPhase =
  | "idle"
  | "confirming"
  | "confirmed"
  | "delayed"
  | "cancelled";

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 40_000;

interface Options {
  /** True once the purchase shows up in the buyer's account. */
  isFulfilled: (params: URLSearchParams) => Promise<boolean>;
  /** False until what isFulfilled needs (the signed-in user, the event) exists. */
  ready: boolean;
}

/**
 * Handles the buyer coming back from Stripe Checkout. The query string is read
 * once and removed, so a reload does not repeat the notice. On success the page
 * state is polled until the webhook has recorded the purchase.
 */
export function useCheckoutReturn({ isFulfilled, ready }: Options) {
  const [returned] = useState(() =>
    typeof window === "undefined"
      ? null
      : parseCheckoutReturn(window.location.search),
  );
  const [phase, setPhase] = useState<CheckoutReturnPhase>(
    !returned ? "idle" : returned.status === "success" ? "confirming" : "cancelled",
  );
  const [attempt, setAttempt] = useState(0);
  const latest = useRef({ isFulfilled, ready });
  latest.current = { isFulfilled, ready };

  useEffect(() => {
    if (!returned) return;
    const { pathname, search, hash } = window.location;
    window.history.replaceState(
      window.history.state,
      "",
      `${pathname}${withoutCheckoutReturn(search)}${hash}`,
    );
  }, [returned]);

  useEffect(() => {
    if (phase !== "confirming" || !returned) return;
    const controller = new AbortController();
    void pollUntil(
      async () =>
        latest.current.ready && (await latest.current.isFulfilled(returned.params)),
      {
        intervalMs: POLL_INTERVAL_MS,
        timeoutMs: POLL_TIMEOUT_MS,
        signal: controller.signal,
      },
    ).then((fulfilled) => {
      if (!controller.signal.aborted) {
        setPhase(fulfilled ? "confirmed" : "delayed");
      }
    });
    return () => controller.abort();
  }, [phase, attempt, returned]);

  const checkAgain = useCallback(() => {
    setAttempt((n) => n + 1);
    setPhase("confirming");
  }, []);
  const dismiss = useCallback(() => setPhase("idle"), []);

  return {
    phase,
    /** The payment is still being confirmed: do not offer to pay again. */
    awaitingPayment: phase === "confirming" || phase === "delayed",
    params: returned?.params ?? null,
    checkAgain,
    dismiss,
  };
}
