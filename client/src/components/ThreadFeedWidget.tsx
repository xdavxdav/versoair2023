// ThreadFeedWidget — compact, reusable Twitter/LinkedIn-preview style feed.
// Reuses the existing social-blog engine (shared/social-schema.ts, /api/social/posts)
// filtered by `postType` so Marketplace, Musical Universe (/stream), Contractors and
// Job Seekers pages can embed a real, live thread instead of mock/placeholder data.
//
// Scope note (Marketplace): posts here are discussion-only (text + optional single
// image) — NOT a listing-creation form. Actual listings stay in their existing flows.

import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Heart,
  MessageCircle,
  Send,
  Loader2,
  Share2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useSocialFeed } from "@/hooks/use-social-feed";
import { useAuthContext } from "@/contexts/AuthContext";

export type ThreadPostType =
  | "marketplace"
  | "musical_universe"
  | "contractor"
  | "job_seeker";

interface ThreadFeedWidgetProps {
  postType: ThreadPostType;
  title?: string;
  composerPlaceholder?: string;
  limit?: number;
  className?: string;
  /** "dark" (default) for dark-themed pages like /stream, "light" for white-background pages like careers/contractors. */
  variant?: "dark" | "light";
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (hours < 1) return "Now";
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
}

export default function ThreadFeedWidget({
  postType,
  title = "MU × Community talks",
  composerPlaceholder = "Share something with the community…",
  limit = 8,
  className = "",
  variant = "dark",
}: ThreadFeedWidgetProps) {
  const { user } = useAuthContext();
  const [draft, setDraft] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>(
    {},
  );
  const [expandedComments, setExpandedComments] = useState<
    Record<number, boolean>
  >({});
  const [commentCache, setCommentCache] = useState<Record<number, any[]>>({});
  const [loadingComments, setLoadingComments] = useState<
    Record<number, boolean>
  >({});
  const { posts, isLoading, createPost, isCreatingPost, likePost } =
    useSocialFeed(1, limit, "recent", postType);
  const [localPosts, setLocalPosts] = useState<any[]>(posts);

  useEffect(() => {
    setLocalPosts(posts);
  }, [posts]);

  const handlePost = () => {
    const content = draft.trim();
    if (!content || !user) return;
    createPost({ content, postType });
    setDraft("");
  };

  const handleLike = (postId: number) => {
    if (!user) return;
    setLocalPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, likeCount: (post.likeCount || 0) + 1 }
          : post,
      ),
    );
    likePost({ postId });
  };

  const handleShare = async (postId: number) => {
    if (!user) return;
    const res = await fetch(`/api/social/posts/${postId}/share`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    setLocalPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              shareCount: data?.shareCount ?? (post.shareCount || 0) + 1,
            }
          : post,
      ),
    );
  };

  const loadComments = async (postId: number) => {
    if (commentCache[postId]) {
      setExpandedComments((current) => ({
        ...current,
        [postId]: !current[postId],
      }));
      return;
    }

    setLoadingComments((current) => ({ ...current, [postId]: true }));
    try {
      const res = await fetch(`/api/social/posts/${postId}/comments?limit=5`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setCommentCache((current) => ({ ...current, [postId]: data.data || [] }));
      setExpandedComments((current) => ({ ...current, [postId]: true }));
    } finally {
      setLoadingComments((current) => ({ ...current, [postId]: false }));
    }
  };

  const handleComment = async (postId: number) => {
    const content = (commentDrafts[postId] || "").trim();
    if (!content || !user) return;

    const res = await fetch(`/api/social/posts/${postId}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) return;
    const data = await res.json().catch(() => null);

    setLocalPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, commentCount: (post.commentCount || 0) + 1 }
          : post,
      ),
    );

    const newComment = data?.data;
    setCommentCache((current) => ({
      ...current,
      [postId]: newComment
        ? [newComment, ...(current[postId] || [])]
        : current[postId],
    }));
    setCommentDrafts((current) => ({ ...current, [postId]: "" }));
    setExpandedComments((current) => ({ ...current, [postId]: true }));
  };

  const isLight = variant === "light";
  const t = {
    wrap: isLight
      ? "rounded-2xl border border-[#d9d0c6] bg-[#f7f4f0] shadow-[0_8px_30px_rgba(15,23,42,0.04)] overflow-hidden"
      : "rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden",
    header: isLight
      ? "px-4 py-3 border-b border-[#e7dfd7] flex items-center justify-between"
      : "px-4 py-3 border-b border-white/10 flex items-center justify-between",
    title: isLight
      ? "text-sm font-semibold text-slate-800"
      : "text-sm font-semibold text-white/90",
    link: isLight
      ? "text-xs text-violet-600 hover:text-violet-700"
      : "text-xs text-purple-300 hover:text-purple-200",
    composerWrap: isLight
      ? "px-4 py-3 border-b border-[#e7dfd7] flex gap-2 bg-[#f4efe9]"
      : "px-4 py-3 border-b border-white/10 flex gap-2",
    input: isLight
      ? "flex-1 bg-white border border-[#dcd4cb] rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-500/60"
      : "flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50",
    sendBtn: isLight
      ? "shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-violet-100 text-violet-700 border border-violet-200 disabled:opacity-40 hover:bg-violet-200 transition-colors"
      : "shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 disabled:opacity-40 hover:bg-purple-500/30 transition-colors",
    list: isLight
      ? "divide-y divide-[#ece3db] max-h-[480px] overflow-y-auto bg-[#f7f4f0]"
      : "divide-y divide-white/5 max-h-[480px] overflow-y-auto",
    empty: isLight
      ? "px-4 py-6 text-center text-slate-500 text-sm"
      : "px-4 py-6 text-center text-white/40 text-sm",
    avatar: isLight
      ? "w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-xs font-semibold text-violet-700 overflow-hidden"
      : "w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-semibold text-purple-300 overflow-hidden",
    author: isLight
      ? "text-sm font-medium text-slate-800 truncate"
      : "text-sm font-medium text-white/90 truncate",
    time: isLight ? "text-xs text-slate-400" : "text-xs text-white/30",
    content: isLight
      ? "text-sm text-slate-700 whitespace-pre-wrap break-words"
      : "text-sm text-white/80 whitespace-pre-wrap break-words",
    image: isLight
      ? "mt-2 rounded-lg max-h-48 w-full object-cover border border-[#e7dfd7]"
      : "mt-2 rounded-lg max-h-48 w-full object-cover border border-white/10",
    actions: isLight
      ? "flex items-center gap-4 mt-3 text-xs text-slate-500"
      : "flex items-center gap-4 mt-2 text-xs text-white/40",
    actionBtn: isLight
      ? "inline-flex items-center gap-1.5 rounded-full px-2 py-1 hover:bg-slate-200/60 transition-colors"
      : "inline-flex items-center gap-1.5 rounded-full px-2 py-1 hover:bg-white/5 transition-colors",
    commentBox: isLight
      ? "mt-3 rounded-xl border border-[#e7dfd7] bg-white p-2"
      : "mt-3 rounded-xl border border-white/10 bg-white/5 p-2",
    commentInput: isLight
      ? "w-full bg-[#f7f4f0] border border-[#e7dfd7] rounded-lg px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-violet-500/60"
      : "w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50",
  };

  return (
    <div className={`${t.wrap} ${className}`}>
      <div className={t.header}>
        <h3 className={t.title}>{title}</h3>
        <Link href="/blog" className={t.link}>
          View all
        </Link>
      </div>

      {user ? (
        <div className={t.composerWrap}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handlePost();
              }
            }}
            placeholder={composerPlaceholder}
            maxLength={500}
            className={t.input}
          />
          <button
            onClick={handlePost}
            disabled={!draft.trim() || isCreatingPost}
            className={t.sendBtn}
            aria-label="Post"
          >
            {isCreatingPost ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      ) : null}

      <div className={t.list}>
        {isLoading && <div className={t.empty}>Loading threads…</div>}

        {!isLoading && localPosts.length === 0 && (
          <div className={t.empty}>
            No posts yet — be the first to start a thread.
          </div>
        )}

        {localPosts.map((post: any) => {
          const comments = commentCache[post.id] || [];
          const isExpanded = !!expandedComments[post.id];
          return (
            <div key={post.id} className="px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <div className={t.avatar}>
                  {post.author?.avatarUrl ? (
                    <img
                      src={post.author.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (post.author?.displayName || "?")[0]?.toUpperCase()
                  )}
                </div>
                <span className={t.author}>
                  {post.author?.displayName || "Anonymous"}
                </span>
                <span className={t.time}>· {formatTime(post.createdAt)}</span>
              </div>
              <p className={t.content}>{post.content}</p>
              {post.imageUrls?.[0] && (
                <img src={post.imageUrls[0]} alt="" className={t.image} />
              )}
              <div className={t.actions}>
                <button
                  onClick={() => handleLike(post.id)}
                  disabled={!user}
                  className={`${t.actionBtn} hover:text-pink-500 ${!user ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Heart className="w-3.5 h-3.5" /> {post.likeCount || 0}
                </button>
                <button
                  onClick={() => loadComments(post.id)}
                  className={`${t.actionBtn} ${isExpanded ? "text-violet-500" : ""}`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />{" "}
                  {post.commentCount || 0}
                </button>
                <button
                  onClick={() => handleShare(post.id)}
                  disabled={!user}
                  className={`${t.actionBtn} ${!user ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Share2 className="w-3.5 h-3.5" /> {post.shareCount || 0}
                </button>
              </div>

              {isExpanded && (
                <div className={t.commentBox}>
                  {loadingComments[post.id] ? (
                    <div className="text-[11px] text-slate-400 py-2">
                      Loading comments…
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-[11px] text-slate-400 py-2">
                      No comments yet.
                    </div>
                  ) : (
                    <div className="space-y-2 mb-2">
                      {comments.slice(0, 3).map((comment: any) => (
                        <div
                          key={comment.id}
                          className="rounded-lg bg-slate-100/70 p-2"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[11px] font-medium text-slate-700">
                              {comment.authorName || "Member"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 break-words">
                            {comment.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {user && (
                    <div className="flex items-center gap-2">
                      <input
                        value={commentDrafts[post.id] || ""}
                        onChange={(e) =>
                          setCommentDrafts((current) => ({
                            ...current,
                            [post.id]: e.target.value,
                          }))
                        }
                        placeholder="Add a comment…"
                        className={t.commentInput}
                      />
                      <button
                        onClick={() => handleComment(post.id)}
                        disabled={!(commentDrafts[post.id] || "").trim()}
                        className="shrink-0 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[11px] font-medium text-white disabled:opacity-40"
                      >
                        Post
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
