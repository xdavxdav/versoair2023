import { useEffect, type ReactNode } from "react";
import { ArrowLeft, Keyboard } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export function TmuGlassCard({
  children,
  className,
  elevated = false,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}) {
  return (
    <div
      className={cn(
        elevated ? "tmu-glass-elevated" : "tmu-glass",
        "tmu-interactive-card rounded-2xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TmuPortalHeader({
  title,
  subtitle,
  icon,
  backHref,
  backLabel = "Retour",
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "tmu-glass-elevated rounded-2xl p-5 sm:p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {backHref && (
            <Link
              href={backHref}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-500/30 bg-[#180d34]/80 text-slate-200 hover:bg-purple-500/20 hover:text-white transition-colors"
              title={backLabel}
              aria-label={backLabel}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          {icon && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 shadow-[0_0_20px_rgba(168,85,247,0.35)] text-white">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="tmu-hero-title text-xl sm:text-2xl font-extrabold tracking-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

export type TmuStatusTone =
  | "pending"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "awaiting_audio"
  | "attached"
  | "live"
  | "scheduled"
  | "ended"
  | "neutral";

const TONE_CLASSES: Record<TmuStatusTone, string> = {
  pending: "border-amber-400/40 bg-amber-500/15 text-amber-200",
  approved: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  rejected: "border-rose-400/40 bg-rose-500/15 text-rose-200",
  withdrawn: "border-slate-500/35 bg-slate-800/70 text-slate-300",
  awaiting_audio: "border-cyan-400/40 bg-cyan-500/15 text-cyan-200",
  attached: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  live: "border-rose-500/45 bg-rose-500/15 text-rose-200",
  scheduled: "border-amber-400/35 bg-amber-500/15 text-amber-200",
  ended: "border-purple-500/25 bg-[#180d34]/80 text-slate-300",
  neutral: "border-purple-500/25 bg-[#180d34]/80 text-slate-200",
};

export function TmuStatusChip({
  tone,
  label,
  pulse = false,
  className,
}: {
  tone: TmuStatusTone;
  label: string;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap",
        TONE_CLASSES[tone] || TONE_CLASSES.neutral,
        className,
      )}
    >
      {pulse && (
        <span aria-hidden="true" className="relative flex h-2 w-2">
          <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      )}
      {label}
    </span>
  );
}

export function TmuReviewConsoleShell({
  queueTitle,
  queueCount,
  filters,
  queueList,
  detailPane,
  onStepSelection,
  className,
}: {
  queueTitle: string;
  queueCount: number;
  filters?: ReactNode;
  queueList: ReactNode;
  detailPane: ReactNode;
  onStepSelection?: (delta: -1 | 1) => void;
  className?: string;
}) {
  useEffect(() => {
    if (!onStepSelection) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        onStepSelection(1);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        onStepSelection(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStepSelection]);

  return (
    <div className={cn("space-y-4", className)}>
      {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
        <section className="tmu-glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-purple-500/20 px-4 py-3">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>{queueTitle}</span>
              <span className="tabular-nums rounded-full bg-purple-500/20 border border-purple-400/30 px-2 py-0.5 text-xs text-purple-200">
                {queueCount}
              </span>
            </h2>
            {onStepSelection && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400">
                <Keyboard className="w-3 h-3" /> J / K
              </span>
            )}
          </div>
          <div className="max-h-[65vh] overflow-y-auto divide-y divide-purple-500/15">
            {queueList}
          </div>
        </section>

        <section className="tmu-glass-elevated rounded-2xl p-4 sm:p-6 min-h-[320px]">
          {detailPane}
        </section>
      </div>
    </div>
  );
}
