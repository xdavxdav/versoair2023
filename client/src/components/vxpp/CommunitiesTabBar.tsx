/**
 * Unified Communities tab bar bridging /communities (Groups & Guilds)
 * and /community (Discussion Pools: MUDP / CDP / CrossDP) inside vxpp.
 */
import { Link } from "wouter";
import { MessageSquare, Users } from "lucide-react";
import { useLanguage } from "@/components/LanguageSwitcher";

export default function CommunitiesTabBar({
  active,
}: {
  active: "groups" | "discussions";
}) {
  const { currentLang } = useLanguage();
  const isFr = currentLang === "fr";
  const isEs = currentLang === "es";

  const groupsLabel = isFr
    ? "Groupes et communautés"
    : isEs
      ? "Grupos y comunidades"
      : "Groups & Communities";
  const discussionsLabel = isFr
    ? "Espaces de discussion"
    : isEs
      ? "Foros de discusión"
      : "Discussion Pools";

  return (
    <div className="max-w-5xl mx-auto px-4 pt-5 pb-2">
      <div
        role="tablist"
        aria-label="Communities views"
        className="inline-flex rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-sm"
      >
        <Link
          href="/communities"
          role="tab"
          aria-selected={active === "groups"}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors min-h-[40px] ${
            active === "groups"
              ? "bg-amber-700 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800"
          }`}
        >
          <Users className="h-4 w-4" />
          {groupsLabel}
        </Link>
        <Link
          href="/community"
          role="tab"
          aria-selected={active === "discussions"}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors min-h-[40px] ${
            active === "discussions"
              ? "bg-amber-700 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          {discussionsLabel}
        </Link>
      </div>
    </div>
  );
}
