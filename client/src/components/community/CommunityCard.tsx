import React from "react";
import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import CommunityAvatar from "./CommunityAvatar";
import JoinButton from "./JoinButton";
import type { VxppCommunity } from "@/lib/communities";

interface CommunityCardProps {
  community: VxppCommunity;
  memberCount: number;
  postCount: number;
  isMember: boolean;
  busy?: boolean;
  onToggleMembership: (community: VxppCommunity) => void;
}

export default function CommunityCard({
  community,
  memberCount,
  postCount,
  isMember,
  busy = false,
  onToggleMembership,
}: CommunityCardProps) {
  return (
    <article className="group flex flex-col rounded-2xl border border-[#E6DFD6] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:border-[#D3C4B4] dark:hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/communities/${community.slug}`}
          className="flex items-center gap-3 min-w-0 flex-1"
        >
          <CommunityAvatar emoji={community.emoji} name={community.name} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2
                translate="no"
                className="notranslate truncate text-[15px] font-semibold tracking-tight text-[#1A202C] dark:text-slate-100 group-hover:text-[#B56535] dark:group-hover:text-amber-300 transition-colors"
              >
                {community.name}
              </h2>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="mt-1 inline-flex items-center rounded-full bg-[#F7F4F0] dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-[#7C5236] dark:text-amber-300">
              {community.category}
            </span>
          </div>
        </Link>

        <JoinButton
          size="sm"
          isMember={isMember}
          loading={busy}
          onToggle={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleMembership(community);
          }}
        />
      </div>

      <Link
        href={`/communities/${community.slug}`}
        className="mt-3.5 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-2"
      >
        {community.tagline || community.description || "A Verso Air member community."}
      </Link>

      <div className="mt-4 pt-3.5 border-t border-[#F0EAE2] dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2 tabular-nums">
          <span>
            <strong className="font-semibold text-[#1A202C] dark:text-slate-200">
              {memberCount}
            </strong>{" "}
            {memberCount === 1 ? "member" : "members"}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="font-semibold text-[#1A202C] dark:text-slate-200">
              {postCount}
            </strong>{" "}
            {postCount === 1 ? "post" : "posts"}
          </span>
        </div>

        <Link
          href={`/communities/${community.slug}`}
          className="font-medium text-[#B56535] dark:text-amber-300 hover:underline"
        >
          Open
        </Link>
      </div>
    </article>
  );
}
