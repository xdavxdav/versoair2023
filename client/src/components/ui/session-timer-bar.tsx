import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Clock, Zap } from "lucide-react";

interface SessionTimerBarProps {
  sessionTimeLeft: number;
  sessionProgress: number;
  isSessionCritical: boolean;
  isSessionLow: boolean;
  onExtendSession: () => void;
  formatTimeLeft: (seconds: number) => string;
}

export function SessionTimerBar({
  sessionTimeLeft,
  sessionProgress,
  isSessionCritical,
  isSessionLow,
  onExtendSession,
  formatTimeLeft,
}: SessionTimerBarProps) {
  return (
    <div
      className={`mb-4 rounded-lg border shadow-sm overflow-hidden transition-colors ${
        isSessionCritical
          ? "border-rose-300 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950 dark:to-red-950"
          : isSessionLow
            ? "border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950"
            : "border-amber-200 bg-gradient-to-r from-amber-50 to-green-50 dark:from-amber-950 dark:to-green-950"
      }`}
    >
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-1.5 rounded-full ${
              isSessionCritical
                ? "bg-rose-200 dark:bg-rose-800"
                : isSessionLow
                  ? "bg-amber-200 dark:bg-amber-800"
                  : "bg-amber-100 dark:bg-amber-900"
            }`}
          >
            {isSessionCritical ? (
              <AlertCircle
                className={`h-4 w-4 ${
                  isSessionCritical
                    ? "text-rose-600 dark:text-rose-300"
                    : isSessionLow
                      ? "text-amber-600 dark:text-amber-300"
                      : "text-amber-600 dark:text-amber-200"
                }`}
              />
            ) : isSessionLow ? (
              <Clock
                className={`h-4 w-4 ${
                  isSessionCritical
                    ? "text-rose-600 dark:text-rose-300"
                    : isSessionLow
                      ? "text-amber-600 dark:text-amber-300"
                      : "text-amber-600 dark:text-amber-200"
                }`}
              />
            ) : (
              <CheckCircle
                className={`h-4 w-4 ${
                  isSessionCritical
                    ? "text-rose-600 dark:text-rose-300"
                    : isSessionLow
                      ? "text-amber-600 dark:text-amber-300"
                      : "text-amber-600 dark:text-amber-200"
                }`}
              />
            )}
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-medium ${
                  isSessionCritical
                    ? "text-rose-700 dark:text-rose-200"
                    : isSessionLow
                      ? "text-amber-700 dark:text-amber-200"
                      : "text-amber-700 dark:text-amber-100"
                }`}
              >
                {isSessionCritical
                  ? "Session Expiring Soon"
                  : isSessionLow
                    ? "Session Ending in 5 Minutes"
                    : "Session Active"}
              </span>
              <span
                className={`text-xs font-mono ${
                  isSessionCritical
                    ? "text-rose-600 dark:text-rose-300"
                    : isSessionLow
                      ? "text-amber-600 dark:text-amber-300"
                      : "text-amber-600 dark:text-amber-200"
                }`}
              >
                {formatTimeLeft(sessionTimeLeft)} remaining
              </span>
            </div>
            <Progress
              value={sessionProgress}
              className={`h-1 ${
                isSessionCritical
                  ? "[&>div]:bg-rose-500 dark:[&>div]:bg-rose-400"
                  : isSessionLow
                    ? "[&>div]:bg-amber-500 dark:[&>div]:bg-amber-400"
                    : "[&>div]:bg-amber-500 dark:[&>div]:bg-amber-400"
              }`}
            />
          </div>
        </div>
        <Button
          onClick={onExtendSession}
          variant="outline"
          size="sm"
          className={`gap-2 whitespace-nowrap ${
            isSessionCritical
              ? "border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900"
              : isSessionLow
                ? "border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900"
                : "border-amber-200 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-950"
          }`}
        >
          <Zap className="h-4 w-4" />
          <span className="hidden sm:inline">Extend Session</span>
        </Button>
      </div>
    </div>
  );
}
