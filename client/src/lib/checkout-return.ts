/**
 * Stripe Checkout sends the buyer back to our site with ?status=success or
 * ?status=cancelled (plans also carry &tier=). Success only means the buyer
 * left Stripe: the purchase exists once the webhook has recorded it, which can
 * take a few seconds, so the page polls its own state before it says "paid".
 */
export type CheckoutReturnStatus = "success" | "cancelled";

export interface CheckoutReturn {
  status: CheckoutReturnStatus;
  params: URLSearchParams;
}

export function parseCheckoutReturn(search: string): CheckoutReturn | null {
  const params = new URLSearchParams(search);
  const status = params.get("status");
  return status === "success" || status === "cancelled"
    ? { status, params }
    : null;
}

/** The query string without the return parameters, so a reload shows no notice. */
export function withoutCheckoutReturn(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("status");
  params.delete("tier");
  const rest = params.toString();
  return rest ? `?${rest}` : "";
}

export interface PollOptions {
  intervalMs: number;
  timeoutMs: number;
  signal?: AbortSignal;
  now?: () => number;
  wait?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * Runs check() until it answers true. Resolves false when time runs out or the
 * signal aborts; a check that throws is simply tried again.
 */
export async function pollUntil(
  check: () => Promise<boolean>,
  { intervalMs, timeoutMs, signal, now = Date.now, wait = sleep }: PollOptions,
): Promise<boolean> {
  const deadline = now() + timeoutMs;
  while (!signal?.aborted) {
    try {
      if (await check()) return true;
    } catch {
      // not there yet
    }
    if (signal?.aborted || now() + intervalMs > deadline) return false;
    await wait(intervalMs, signal);
  }
  return false;
}
