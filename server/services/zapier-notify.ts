/**
 * Fire-and-forget webhook notifier for a Zapier "Catch Hook" trigger.
 * No-op until ZAPIER_WEBHOOK_URL is set, so it's safe to call from any
 * route before Zapier is actually configured.
 *
 * With AUTOMATION_OUTBOX_ENABLED=true the event is stored in the automation
 * outbox instead (see automation-dispatcher), so a Zapier outage cannot drop
 * it. If the outbox itself is unavailable the same body is posted directly.
 * Zaps must dedupe on `automation.eventId`: delivery is at-least-once.
 */
import {
  buildAutomationEvent,
  buildWebhookBody,
} from "../../shared/automation-events";
import {
  getZapierWebhookUrl,
  isAutomationOutboxEnabled,
} from "./automation-config";
import { wakeAutomationDispatcher } from "./automation-dispatcher";
import { enqueueOutboxEvent, type EnqueueInput } from "./automation-outbox";
import { ensureAutomationSchema } from "./automation-schema";

export type ZapierEventCategory =
  | "contact"
  | "ticket"
  | "artist_application"
  | "event_submission"
  | "pilot_lead"
  | "business_request"
  | "artist_request"
  | "job_request";

export interface ZapierNotifierDeps {
  legacyUrl(): string | undefined;
  outboxEnabled(): boolean;
  outboxUrl(): string | null;
  post(url: string, body: Record<string, unknown>): Promise<unknown>;
  enqueue(input: EnqueueInput): Promise<boolean>;
  wake(): void;
  now(): Date;
  warn(message: string, detail?: unknown): void;
}

const errorMessage = (error: unknown): unknown =>
  (error as { message?: unknown } | null | undefined)?.message ?? error;

export function createZapierNotifier(deps: ZapierNotifierDeps) {
  const warnFailed = (category: string, error: unknown) =>
    deps.warn(`[ZAPIER] Notify failed for "${category}":`, errorMessage(error));

  const sendDirect = (
    url: string,
    category: string,
    body: Record<string, unknown>,
  ): void => {
    try {
      deps.post(url, body).catch((error) => warnFailed(category, error));
    } catch (error) {
      warnFailed(category, error);
    }
  };

  return function notifyZapier(
    category: ZapierEventCategory,
    payload: Record<string, unknown>,
  ): void {
    try {
      if (!deps.outboxEnabled()) {
        const url = deps.legacyUrl();
        if (!url) return;
        // The event category is authoritative: a payload key named category must not replace it.
        const { category: _payloadCategory, ...fields } = payload;
        sendDirect(url, category, {
          category,
          ...fields,
          sentAt: deps.now().toISOString(),
        });
        return;
      }

      const url = deps.outboxUrl();
      if (!url) return;

      const now = deps.now();
      const envelope = buildAutomationEvent(category, payload, { now });
      const body = buildWebhookBody(category, payload, envelope, now.toISOString());
      deps
        .enqueue({ category, envelope, body })
        .then((inserted) => {
          if (inserted) deps.wake();
        })
        .catch((error) => {
          deps.warn(
            `[ZAPIER] Outbox unavailable for "${category}", sending directly:`,
            errorMessage(error),
          );
          sendDirect(url, category, body);
        });
    } catch (error) {
      warnFailed(category, error);
    }
  };
}

export const notifyZapier = createZapierNotifier({
  legacyUrl: () => process.env.ZAPIER_WEBHOOK_URL,
  outboxEnabled: () => isAutomationOutboxEnabled(),
  outboxUrl: () => getZapierWebhookUrl(),
  post: (url, body) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  async enqueue(input) {
    // Lazy import: server/db exits the process at import time without DATABASE_URL.
    const { pool } = await import("../db");
    await ensureAutomationSchema(pool);
    return enqueueOutboxEvent(pool, input);
  },
  wake: wakeAutomationDispatcher,
  now: () => new Date(),
  warn: (message, detail) => console.warn(message, detail),
});
