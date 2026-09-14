/**
 * Fire-and-forget webhook notifier for a Zapier "Catch Hook" trigger.
 * No-op until ZAPIER_WEBHOOK_URL is set, so it's safe to call from any
 * route before Zapier is actually configured.
 */
const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL;

export type ZapierEventCategory =
  | "contact"
  | "ticket"
  | "artist_application"
  | "event_submission";

export function notifyZapier(
  category: ZapierEventCategory,
  payload: Record<string, unknown>,
): void {
  if (!ZAPIER_WEBHOOK_URL) return;

  fetch(ZAPIER_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category,
      ...payload,
      sentAt: new Date().toISOString(),
    }),
  }).catch((err) => {
    console.warn(`[ZAPIER] Notify failed for "${category}":`, err?.message ?? err);
  });
}
