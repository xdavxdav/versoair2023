// Inline error notice shared by the messenger panel and the /messages page.
// It is announced to screen readers and always says what the user can do next:
// sign in again, try again, or (for rejected input) fix the message.

import { AlertTriangle, X } from "lucide-react";
import { buildSignInHref, type InboxFailure } from "@/lib/inbox-api";

interface InboxNoticeProps {
  failure: InboxFailure;
  /** Where "Sign in again" should come back to. Defaults to the current page. */
  returnTo?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const actionClass =
  "font-semibold text-white underline underline-offset-2 hover:text-red-100";

export default function InboxNotice({
  failure,
  returnTo,
  onRetry,
  onDismiss,
  className = "",
}: InboxNoticeProps) {
  const signInHref = buildSignInHref(
    returnTo ?? window.location.pathname + window.location.search,
  );

  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-left text-xs text-red-200 ${className}`}
    >
      <AlertTriangle
        className="mt-0.5 h-3.5 w-3.5 shrink-0"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="break-words">{failure.message}</p>
        {failure.kind === "unauthorized" ? (
          <a href={signInHref} className={actionClass}>
            Sign in again
          </a>
        ) : failure.retryable && onRetry ? (
          <button type="button" onClick={onRetry} className={actionClass}>
            Try again
          </button>
        ) : null}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded p-0.5 text-red-200/70 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
