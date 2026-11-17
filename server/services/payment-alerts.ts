/**
 * Operator alerts for payment problems that need a human: money moved but was
 * not fully recorded, or a paid checkout could not be applied to its order.
 *
 * The log line is written first so a mail failure never hides an alert, and
 * nothing here throws, so a webhook can still acknowledge Stripe afterwards.
 */
import { resolveAdminNotificationEmail } from "../utils/admin-notification-email";
import { redactStripeSecrets } from "../utils/stripe-client";

export interface PaymentAlert {
  /** Stable machine-readable name, e.g. "ngo_charge_not_recorded". */
  kind: string;
  summary: string;
  details?: Record<string, string | number | boolean | null | undefined>;
}

export interface PaymentAlertDeps {
  recipient?: () => string;
  send?: (to: string, subject: string, html: string) => Promise<boolean>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function defaultSend(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  // Loaded on demand so importing this module does not initialise SMTP.
  const { sendEmail } = await import("./email-service");
  return sendEmail(to, subject, html);
}

export async function raisePaymentAlert(
  alert: PaymentAlert,
  deps: PaymentAlertDeps = {},
): Promise<void> {
  const details: Record<string, string> = {};
  for (const [key, value] of Object.entries(alert.details ?? {})) {
    if (value === undefined || value === null) continue;
    details[key] = redactStripeSecrets(value);
  }
  const summary = redactStripeSecrets(alert.summary);

  console.error(
    `[PAYMENT-ALERT] ${alert.kind}: ${summary} ${JSON.stringify(details)}`,
  );

  try {
    const to = (deps.recipient ?? resolveAdminNotificationEmail)();
    if (!to) {
      console.warn(
        "[PAYMENT-ALERT] No admin email is configured; the alert was logged only",
      );
      return;
    }

    const rows = Object.entries(details)
      .map(
        ([key, value]) =>
          `<tr><td style="padding:2px 12px 2px 0"><b>${escapeHtml(key)}</b></td><td>${escapeHtml(value)}</td></tr>`,
      )
      .join("");
    const html =
      `<p>${escapeHtml(summary)}</p>` +
      (rows ? `<table>${rows}</table>` : "") +
      `<p>Check the payment in the Stripe Dashboard and reconcile it in Verso Air.</p>`;

    const sent = await (deps.send ?? defaultSend)(
      to,
      `[Verso Air] Payment needs attention: ${alert.kind}`,
      html,
    );
    if (!sent) {
      console.warn("[PAYMENT-ALERT] The alert email could not be sent");
    }
  } catch (err) {
    console.error(
      "[PAYMENT-ALERT] Could not send the alert email:",
      redactStripeSecrets(err instanceof Error ? err.message : err),
    );
  }
}
