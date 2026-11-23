import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, Plus, Search, Users } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import CommunitiesTabBar from "@/components/vxpp/CommunitiesTabBar";
import PageHeader from "@/components/community/PageHeader";
import CommunityCard from "@/components/community/CommunityCard";
import CommunityAvatar from "@/components/community/CommunityAvatar";
import CreateCommunityPanel from "@/components/community/CreateCommunityPanel";
import {
  COMMUNITY_CATEGORIES,
  joinVxppCommunity,
  leaveVxppCommunity,
  listVxppCommunities,
  type VxppCommunity,
} from "@/lib/communities";

export default function Communities() {
  const [, setLocation] = useLocation();
  const { user } = useAuthContext();

  const [items, setItems] = useState<VxppCommunity[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});
  const [myIds, setMyIds] = useState<Set<number>>(new Set());

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(() => {
    const c = new URLSearchParams(window.location.search).get("category");
    return c && (COMMUNITY_CATEGORIES as readonly string[]).includes(c)
      ? c
      : "All";
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const loadCommunities = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listVxppCommunities();
      setItems(data.items || []);
      setMemberCounts(data.memberCounts || {});
      setPostCounts(data.postCounts || {});
      setMyIds(new Set(data.myCommunityIds || []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load communities.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities, user?.id]);

  const myCommunities = useMemo(
    () => items.filter((c) => myIds.has(c.id)),
    [items, myIds],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (category !== "All" && c.category !== category) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.tagline.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    });
  }, [items, query, category]);

  function redirectToSignIn() {
    setLocation(`/auth/signin?redirect=${encodeURIComponent("/communities")}`);
  }

  async function handleToggleMembership(community: VxppCommunity) {
    if (!user) {
      redirectToSignIn();
      return;
    }
    const alreadyMember = myIds.has(community.id);
    setBusyId(community.id);
    setError("");
    try {
      const res = alreadyMember
        ? await leaveVxppCommunity(community.id)
        : await joinVxppCommunity(community.id);
      setMyIds((prev) => {
        const next = new Set(prev);
        if (res.joined) next.add(community.id);
        else next.delete(community.id);
        return next;
      });
      setMemberCounts((prev) => ({
        ...prev,
        [String(community.id)]: res.memberCount,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update membership.");
    } finally {
      setBusyId(null);
    }
  }

  function handleOpenCreate() {
    if (!user) {
      redirectToSignIn();
      return;
    }
    setCreateOpen(true);
  }

  const allCategories = useMemo(() => {
    const seen = new Set<string>(["All", ...COMMUNITY_CATEGORIES]);
    for (const item of items) {
      if (item.category) seen.add(item.category);
    }
    return Array.from(seen);
  }, [items]);

  return (
    <div className="min-h-screen bg-[#F7F4F0] dark:bg-slate-950 text-[#1A202C] dark:text-slate-100">
      <CommunitiesTabBar active="groups" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-12 space-y-6">
        <PageHeader
          title="Communities"
          subtitle="Focused spaces for trades, careers, creators, and local neighborhoods on Verso Air."
          action={
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#B56535] hover:bg-[#9C542A] px-4 text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              New community
            </button>
          }
        />

        {user && myCommunities.length > 0 && (
          <section aria-label="Your communities" className="space-y-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Your communities
            </h2>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {myCommunities.map((community) => (
                <Link
                  key={community.id}
                  href={`/communities/${community.slug}`}
                  className="flex shrink-0 items-center gap-2.5 rounded-xl border border-[#E6DFD6] dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 shadow-2xs hover:border-[#B56535]/50 transition-colors"
                >
                  <CommunityAvatar
                    emoji={community.emoji}
                    name={community.name}
                    size="sm"
                  />
                  <span
                    translate="no"
                    className="notranslate text-xs font-semibold text-[#1A202C] dark:text-slate-100 whitespace-nowrap"
                  >
                    {community.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="space-y-3">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search communities by name, topic, or category…"
              className="w-full h-11 rounded-xl border border-[#DDD3C8] dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 text-base sm:text-sm text-[#1A202C] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#B56535] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {allCategories.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`shrink-0 h-9 rounded-full px-3.5 text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? "bg-[#B56535] text-white shadow-2xs"
                      : "bg-white dark:bg-slate-900 border border-[#E6DFD6] dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#B56535]/50"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-[#E6DFD6] dark:border-slate-800 bg-white dark:bg-slate-900 p-12 flex items-center justify-center gap-2.5 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-[#B56535]" />
            Loading communities…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#DDD3C8] dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-10 text-center space-y-3">
            <Users className="h-8 w-8 mx-auto text-slate-400" />
            <p className="text-sm font-semibold text-[#1A202C] dark:text-slate-200">
              No communities match your filter
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Try a different keyword, clear the category filter, or start a new space.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              {(query || category !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCategory("All");
                  }}
                  className="h-9 rounded-full border border-[#DDD3C8] dark:border-slate-700 px-4 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white cursor-pointer"
                >
                  Clear filters
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenCreate}
                className="h-9 rounded-full bg-[#B56535] hover:bg-[#9C542A] px-4 text-xs font-semibold text-white cursor-pointer"
              >
                New community
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
                memberCount={memberCounts[String(community.id)] || 0}
                postCount={postCounts[String(community.id)] || 0}
                isMember={myIds.has(community.id)}
                busy={busyId === community.id}
                onToggleMembership={handleToggleMembership}
              />
            ))}
          </div>
        )}
      </div>

      <CreateCommunityPanel
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => {
          setCreateOpen(false);
          setLocation(`/communities/${created.slug}`);
        }}
      />
    </div>
  );
}

