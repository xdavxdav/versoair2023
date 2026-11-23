import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import CommunityAvatar from "./CommunityAvatar";
import {
  COMMUNITY_CATEGORIES,
  listVxppCommunities,
  type VxppCommunity,
} from "@/lib/communities";

export default function CommunityStrip() {
  const [items, setItems] = useState<VxppCommunity[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    listVxppCommunities()
      .then((res) => {
        if (!active) return;
        setItems((res.items || []).slice(0, 6));
        setMemberCounts(res.memberCounts || {});
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section
      aria-label="Communities"
      className="rounded-2xl border border-[#E6DFD6] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Communities
        </span>
        <Link
          href="/communities"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#B56535] dark:text-amber-300 hover:underline"
        >
          Browse all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {COMMUNITY_CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/communities?category=${encodeURIComponent(cat)}`}
            className="shrink-0 rounded-full border border-[#E6DFD6] dark:border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-[#B56535]/60 hover:text-[#B56535] dark:hover:text-amber-300 transition-colors"
          >
            {cat}
          </Link>
        ))}
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {items.map((community) => {
          const count = memberCounts[String(community.id)] || 0;
          return (
            <Link
              key={community.id}
              href={`/communities/${community.slug}`}
              className="flex shrink-0 items-center gap-2.5 rounded-xl border border-[#EFE9E0] dark:border-slate-800 bg-[#FAF6F1] dark:bg-slate-800/60 px-3 py-2 hover:border-[#B56535]/50 transition-colors"
            >
              <CommunityAvatar emoji={community.emoji} name={community.name} size="sm" />
              <div className="min-w-0">
                <p
                  translate="no"
                  className="notranslate text-xs font-semibold text-[#1A202C] dark:text-slate-100 truncate max-w-[160px]"
                >
                  {community.name}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {count} {count === 1 ? "member" : "members"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
