import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, Lock, MessageSquarePlus } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import CommunityAvatar from "@/components/community/CommunityAvatar";
import JoinButton from "@/components/community/JoinButton";
import PostComposer from "@/components/community/PostComposer";
import CommunityPostCard from "@/components/community/CommunityPostCard";
import {
  createVxppCommunityPost,
  deleteVxppCommunityPost,
  getVxppCommunityBySlug,
  joinVxppCommunity,
  leaveVxppCommunity,
  likeVxppCommunityPost,
  unlikeVxppCommunityPost,
  type VxppCommunity,
  type VxppCommunityPost,
} from "@/lib/communities";

export default function CommunitySlugPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params?.slug || "";
  const [, setLocation] = useLocation();
  const { user } = useAuthContext();

  const [community, setCommunity] = useState<VxppCommunity | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [posts, setPosts] = useState<VxppCommunityPost[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [membershipBusy, setMembershipBusy] = useState(false);

  const currentUserName = user
    ? user.displayName || user.name || user.username || user.email?.split("@")[0] || "Member"
    : null;

  const isStaff = Boolean(
    user?.isAdmin ||
      ["admin", "superuser", "moderator"].includes(String(user?.role || "").toLowerCase()),
  );

  const loadDetail = useCallback(async () => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setNotFound(false);
    try {
      const data = await getVxppCommunityBySlug(slug);
      setCommunity(data.community);
      setMemberCount(data.memberCount || 0);
      setPostCount(data.postCount || 0);
      setIsMember(Boolean(data.isMember));
      setPosts(data.posts || []);
      setCommentCounts(data.commentCounts || {});
      setLikeCounts(data.likeCounts || {});
      setLikedIds(new Set(data.likedPostIds || []));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not load community.";
      if (msg.toLowerCase().includes("not found") || msg.includes("404")) {
        setNotFound(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail, user?.id]);

  function redirectToSignIn() {
    setLocation(`/auth/signin?redirect=${encodeURIComponent(`/communities/${slug}`)}`);
  }

  async function handleToggleMembership() {
    if (!community) return;
    if (!user) {
      redirectToSignIn();
      return;
    }
    setMembershipBusy(true);
    setError("");
    try {
      const res = isMember
        ? await leaveVxppCommunity(community.id)
        : await joinVxppCommunity(community.id);
      setIsMember(res.joined);
      setMemberCount(res.memberCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update membership.");
    } finally {
      setMembershipBusy(false);
    }
  }

  async function handleCreatePost(payload: { body: string; image_url?: string }) {
    if (!community) return;
    const res = await createVxppCommunityPost(community.id, payload);
    setPosts((prev) => [res.post, ...prev]);
    setPostCount((c) => c + 1);
  }

  async function handleToggleLike(post: VxppCommunityPost) {
    if (!user) {
      redirectToSignIn();
      return;
    }
    const alreadyLiked = likedIds.has(post.id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (alreadyLiked) next.delete(post.id);
      else next.add(post.id);
      return next;
    });
    setLikeCounts((prev) => ({
      ...prev,
      [String(post.id)]: Math.max(0, (prev[String(post.id)] || 0) + (alreadyLiked ? -1 : 1)),
    }));
    try {
      const res = alreadyLiked
        ? await unlikeVxppCommunityPost(post.id)
        : await likeVxppCommunityPost(post.id);
      setLikeCounts((prev) => ({ ...prev, [String(post.id)]: res.likeCount }));
    } catch {
      await loadDetail();
    }
  }

  async function handleDeletePost(post: VxppCommunityPost) {
    try {
      await deleteVxppCommunityPost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      setPostCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete post.");
    }
  }

  const orderedPosts = useMemo(() => posts, [posts]);

  return (
    <div className="min-h-screen bg-[#F7F4F0] dark:bg-slate-950 text-[#1A202C] dark:text-slate-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        <div>
          <Link
            href="/communities"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-[#B56535] dark:hover:text-amber-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All communities
          </Link>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#E6DFD6] dark:border-slate-800 bg-white dark:bg-slate-900 p-10 flex items-center justify-center gap-2.5 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-[#B56535]" />
            Loading community…
          </div>
        ) : notFound || !community ? (
          <div className="rounded-2xl border border-[#E6DFD6] dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-3">
            <h1 className="text-xl font-bold text-[#1A202C] dark:text-slate-100">
              Community not found
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This community may have been moved or removed.
            </p>
            <Link
              href="/communities"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#B56535] hover:bg-[#9C542A] px-5 text-sm font-semibold text-white transition-colors"
            >
              Browse communities
            </Link>
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-[#E6DFD6] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <CommunityAvatar
                    emoji={community.emoji}
                    name={community.name}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1
                        translate="no"
                        className="notranslate text-xl sm:text-2xl font-bold tracking-tight text-[#1A202C] dark:text-slate-100"
                      >
                        {community.name}
                      </h1>
                      <span className="inline-flex items-center rounded-full bg-[#F7F4F0] dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-[#7C5236] dark:text-amber-300">
                        {community.category}
                      </span>
                    </div>

                    {community.tagline && (
                      <p className="mt-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {community.tagline}
                      </p>
                    )}

                    {community.description && (
                      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                        {community.description}
                      </p>
                    )}

                    <div className="mt-3.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
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
                  </div>
                </div>

                <div className="shrink-0">
                  <JoinButton
                    isMember={isMember}
                    loading={membershipBusy}
                    onToggle={handleToggleMembership}
                  />
                </div>
              </div>
            </section>

            {error && (
              <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {user && isMember ? (
              <PostComposer
                communityName={community.name}
                userName={currentUserName || "Member"}
                onSubmit={handleCreatePost}
              />
            ) : (
              <div className="rounded-2xl border border-[#E6DFD6] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-[#FAF6F1] dark:bg-slate-800 flex items-center justify-center text-[#B56535] dark:text-amber-300">
                    {user ? <MessageSquarePlus className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1A202C] dark:text-slate-100">
                      {user
                        ? "Join to post in this community"
                        : "Sign in to join and share updates"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Everyone can read posts here. Members can publish, like, and reply.
                    </p>
                  </div>
                </div>
                {user ? (
                  <JoinButton
                    isMember={false}
                    loading={membershipBusy}
                    onToggle={handleToggleMembership}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={redirectToSignIn}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#B56535] hover:bg-[#9C542A] px-4 text-sm font-semibold text-white transition-colors cursor-pointer"
                  >
                    Sign in
                  </button>
                )}
              </div>
            )}

            {orderedPosts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DDD3C8] dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-10 text-center space-y-2">
                <p className="text-sm font-semibold text-[#1A202C] dark:text-slate-200">
                  No posts yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isMember
                    ? "Start the first conversation above."
                    : "Join this community to publish the first post."}
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {orderedPosts.map((post) => {
                  const canDelete = Boolean(
                    user &&
                      (String(post.created_by) === String(user.id) || isStaff),
                  );
                  return (
                    <CommunityPostCard
                      key={post.id}
                      post={post}
                      likeCount={likeCounts[String(post.id)] || 0}
                      isLiked={likedIds.has(post.id)}
                      commentCount={commentCounts[String(post.id)] || 0}
                      canDelete={canDelete}
                      currentUserName={currentUserName}
                      onToggleLike={handleToggleLike}
                      onDelete={handleDeletePost}
                      onCommentAdded={(postId) =>
                        setCommentCounts((prev) => ({
                          ...prev,
                          [String(postId)]: (prev[String(postId)] || 0) + 1,
                        }))
                      }
                      onRequireSignIn={redirectToSignIn}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
