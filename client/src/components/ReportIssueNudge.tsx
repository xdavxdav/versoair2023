import { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { NativeLabel } from "@/components/NativeLabel";
import { getCookieConsent } from "@/lib/cookie-consent";
import { FEEDBACK_FORM_URL } from "@/lib/feedback";
import {
  REPORT_NUDGE_DELAY_MS,
  REPORT_NUDGE_MAX_ATTEMPTS,
  REPORT_NUDGE_RETRY_MS,
  REPORT_NUDGE_SESSION_KEY,
  isCookieBannerPending,
  isReportNudgeQuietPath,
} from "@/lib/report-issue-nudge";

type ReportIssueNudgeProps = {
  path: string;
  // True when a bottom dock (content nav, account bar, audio player) is showing.
  raised: boolean;
};

// Covers the case where storage is blocked: the reminder still shows once per page load.
let shownThisPageLoad = false;

function alreadyShown(): boolean {
  if (shownThisPageLoad) return true;
  try {
    return window.sessionStorage.getItem(REPORT_NUDGE_SESSION_KEY) === "1";
  } catch (error: unknown) {
    console.warn(
      "[ReportIssueNudge] Session storage unavailable:",
      error instanceof Error ? error.name : "storage error",
    );
    return false;
  }
}

function markShown() {
  shownThisPageLoad = true;
  try {
    window.sessionStorage.setItem(REPORT_NUDGE_SESSION_KEY, "1");
  } catch (error: unknown) {
    console.warn(
      "[ReportIssueNudge] Could not remember the reminder:",
      error instanceof Error ? error.name : "storage error",
    );
  }
}

function canShowNow(path: string): boolean {
  if (document.hidden) return false;
  if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return false;
  return !isCookieBannerPending(path, getCookieConsent());
}

export function ReportIssueNudge({ path, raised }: ReportIssueNudgeProps) {
  const [visible, setVisible] = useState(false);
  const quiet = isReportNudgeQuietPath(path);

  useEffect(() => {
    if (quiet) {
      setVisible(false);
      return;
    }
    if (alreadyShown()) return;

    let attempts = 0;
    let timer = 0;
    const attempt = () => {
      if (canShowNow(path)) {
        markShown();
        setVisible(true);
        return;
      }
      attempts += 1;
      if (attempts < REPORT_NUDGE_MAX_ATTEMPTS) {
        timer = window.setTimeout(attempt, REPORT_NUDGE_RETRY_MS);
      }
    };
    timer = window.setTimeout(attempt, REPORT_NUDGE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [quiet, path]);

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="report-issue-nudge"
      className={`pointer-events-none fixed left-4 z-[60] ${
        raised
          ? "bottom-[calc(env(safe-area-inset-bottom)+7.5rem)]"
          : "bottom-[calc(env(safe-area-inset-bottom)+5rem)]"
      }`}
    >
      {visible && (
        <a
          href={FEEDBACK_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="report-issue-nudge-link"
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setVisible(false);
          }}
          className="report-issue-nudge pointer-events-auto inline-flex min-h-11 max-w-[min(22rem,calc(100vw-6.5rem))] items-center gap-2 rounded-full border border-amber-200/40 bg-[#071d19] px-4 py-2 text-left text-sm font-medium leading-snug text-amber-100 shadow-lg shadow-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
        >
          <Flag aria-hidden="true" className="h-4 w-4 shrink-0 text-amber-200" />
          <span>
            <NativeLabel text="Something not working? Report an issue" />
          </span>
          <span className="sr-only">
            <NativeLabel text="(new tab)" />
          </span>
        </a>
      )}
    </div>
  );
}

export default ReportIssueNudge;
