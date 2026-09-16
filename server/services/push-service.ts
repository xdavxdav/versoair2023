/**
 * Web Push (browser/OS push notifications), independent of the WebSocket layer.
 * Degrades gracefully like the email service: if VAPID keys aren't configured,
 * subscribe/send calls are no-ops that log instead of throwing.
 */
import webpush from "web-push";
import { db } from "../db";
import { pushSubscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "../utils/logger";

const log = createLogger("push");

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:support@versoair.com";

const isConfigured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (isConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
} else {
  log.warn(
    "VAPID keys not configured — browser push notifications disabled. Set VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY to enable (generate with `npx web-push generate-vapid-keys`).",
  );
}

export function isPushConfigured(): boolean {
  return isConfigured;
}

export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY || null;
}

export async function saveSubscription(
  userId: number,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
): Promise<void> {
  await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

/**
 * Send a push notification to every device a user has subscribed from.
 * Silently prunes subscriptions the push service reports as gone (410/404).
 */
export async function sendPushToUser(
  userId: number,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  if (!isConfigured) return;

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subs.length === 0) return;

  const json = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          json,
        );
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await removeSubscription(sub.endpoint).catch(() => {});
        } else {
          log.error(
            `Push send failed for user ${userId}:`,
            err?.message || err,
          );
        }
      }
    }),
  );
}
