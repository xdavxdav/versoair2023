import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarClock,
  Gamepad2,
  Headphones,
  MessageCircle,
  Mic2,
  Radio,
  Trophy,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";

export type TmuSurfaceId =
  | "stream"
  | "sessions"
  | "my-live-sessions"
  | "streamer-portal"
  | "arcade"
  | "arena"
  | "artist-portal";

interface TmuHubItem {
  id: TmuSurfaceId;
  href: string;
  labelFr: string;
  labelEn: string;
  shortFr: string;
  shortEn: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const TMU_HUB_ITEMS: readonly TmuHubItem[] = [
  {
    id: "stream",
    href: "/stream",
    labelFr: "Stream",
    labelEn: "Stream",
    shortFr: "Stream",
    shortEn: "Stream",
    icon: Radio,
  },
  {
    id: "sessions",
    href: "/sessions",
    labelFr: "Sessions Live",
    labelEn: "Live Sessions",
    shortFr: "Sessions",
    shortEn: "Sessions",
    icon: Headphones,
  },
  {
    id: "my-live-sessions",
    href: "/my-live-sessions",
    labelFr: "Mes Sessions",
    labelEn: "My Sessions",
    shortFr: "Mes Live",
    shortEn: "My Live",
    icon: CalendarClock,
  },
  {
    id: "streamer-portal",
    href: "/streamer-portal",
    labelFr: "Communauté",
    labelEn: "Community",
    shortFr: "Commu",
    shortEn: "Community",
    icon: MessageCircle,
  },
  {
    id: "arcade",
    href: "/arcade",
    labelFr: "Arcade",
    labelEn: "Arcade",
    shortFr: "Arcade",
    shortEn: "Arcade",
    icon: Gamepad2,
  },
  {
    id: "arena",
    href: "/arena",
    labelFr: "Arena",
    labelEn: "Arena",
    shortFr: "Arena",
    shortEn: "Arena",
    icon: Trophy,
  },
  {
    id: "artist-portal",
    href: "/artist-portal",
    labelFr: "Portail Artiste",
    labelEn: "Artist Portal",
    shortFr: "Artistes",
    shortEn: "Artists",
    icon: Mic2,
  },
] as const;

export function TmuHubNav({
  currentSurface,
  className,
}: {
  currentSurface: TmuSurfaceId;
  className?: string;
}) {
  const [pathname] = useLocation();
  const { currentLang } = useLanguage();
  const isFr = currentLang === "fr";
  const reducedMotion = useReducedMotion();

  const resolvedSurface: TmuSurfaceId =
    currentSurface ||
    (pathname.startsWith("/sessions")
      ? "sessions"
      : pathname.startsWith("/my-live-sessions")
        ? "my-live-sessions"
        : pathname.startsWith("/streamer-portal")
          ? "streamer-portal"
          : pathname.startsWith("/arcade")
            ? "arcade"
            : pathname.startsWith("/arena")
              ? "arena"
              : pathname.startsWith("/artist-portal")
                ? "artist-portal"
                : "stream");

  return (
    <nav
      aria-label={isFr ? "Navigation Musical Universe" : "Musical Universe navigation"}
      className={cn("relative", className)}
    >
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide rounded-2xl border border-purple-500/20 bg-[#0f0822]/85 p-1.5 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        {TMU_HUB_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = resolvedSurface === item.id;
          const label = isFr ? item.labelFr : item.labelEn;
          const shortLabel = isFr ? item.shortFr : item.shortEn;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative shrink-0 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06020f]",
                active
                  ? "text-white"
                  : "text-slate-300 hover:text-white hover:bg-white/[0.06]",
              )}
            >
              {active && (
                <motion.span
                  layoutId={reducedMotion ? undefined : "tmuHubActivePill"}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_0_18px_rgba(168,85,247,0.4)]"
                />
              )}
              <Icon
                aria-hidden="true"
                className={cn(
                  "relative z-10 h-4 w-4 shrink-0",
                  active ? "text-white" : "text-purple-300",
                )}
              />
              <span className="relative z-10 hidden sm:inline">{label}</span>
              <span className="relative z-10 sm:hidden">{shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function TmuEqualizerBars({
  active = true,
  className,
}: {
  active?: boolean;
  className?: string;
}) {
  if (!active) return null;
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex items-end gap-[2px] h-3.5", className)}
    >
      <span className="tmu-eq-bar w-[2.5px] h-full rounded-full bg-fuchsia-400" style={{ animationDelay: "0ms" }} />
      <span className="tmu-eq-bar w-[2.5px] h-full rounded-full bg-purple-400" style={{ animationDelay: "210ms" }} />
      <span className="tmu-eq-bar w-[2.5px] h-full rounded-full bg-cyan-300" style={{ animationDelay: "420ms" }} />
    </span>
  );
}

export function TmuAnimatedCounter({
  value,
  formatter = (n: number) => n.toLocaleString(),
  className,
}: {
  value: number;
  formatter?: (n: number) => string;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (reducedMotion || !Number.isFinite(value) || value <= 0) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const duration = 420;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reducedMotion]);

  return <span className={cn("tabular-nums", className)}>{formatter(display)}</span>;
}

export function TmuSectionHeader({
  icon,
  title,
  subtitle,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-400/25 text-purple-300">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-50 truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-400 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
