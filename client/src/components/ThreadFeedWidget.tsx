// ThreadFeedWidget — compact, reusable Twitter/LinkedIn-preview style feed.
// Reuses the existing social-blog engine (shared/social-schema.ts, /api/social/posts)
// filtered by `postType` so Marketplace, Musical Universe (/stream), Contractors and
// Job Seekers pages can embed a real, live thread instead of mock/placeholder data.
//
// Scope note (Marketplace): posts here are discussion-only (text + optional single
// image) — NOT a listing-creation form. Actual listings stay in their existing flows.

import { useState } from "react";
import { Link } from "wouter";
import { Heart, MessageCircle, Send, Loader2 } from "lucide-react";
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
  title = "Community Threads",
  composerPlaceholder = "Share something with the community…",
  limit = 8,
  className = "",
  variant = "dark",
}: ThreadFeedWidgetProps) {
  const { user } = useAuthContext();
  const [draft, setDraft] = useState("");
  const { posts, isLoading, createPost, isCreatingPost, likePost } =
    useSocialFeed(1, limit, "recent", postType);

  const handlePost = () => {
    const content = draft.trim();
    if (!content || !user) return;
    createPost({ content, postType });
    setDraft("");
  };

  const isLight = variant === "light";
  const t = {
    wrap: isLight
      ? "rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden"
      : "rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden",
    header: isLight
      ? "px-4 py-3 border-b border-gray-200/70 flex items-center justify-between"
      : "px-4 py-3 border-b border-white/10 flex items-center justify-between",
    title: isLight
      ? "text-sm font-semibold text-gray-800"
      : "text-sm font-semibold text-white/90",
    link: isLight
      ? "text-xs text-blue-600 hover:text-blue-700"
      : "text-xs text-purple-300 hover:text-purple-200",
    composerWrap: isLight
      ? "px-4 py-3 border-b border-gray-200/70 flex gap-2"
      : "px-4 py-3 border-b border-white/10 flex gap-2",
    input: isLight
      ? "flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500/60"
      : "flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50",
    sendBtn: isLight
      ? "shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 disabled:opacity-40 hover:bg-blue-100 transition-colors"
      : "shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 disabled:opacity-40 hover:bg-purple-500/30 transition-colors",
    list: isLight
      ? "divide-y divide-gray-100 max-h-[480px] overflow-y-auto"
      : "divide-y divide-white/5 max-h-[480px] overflow-y-auto",
    empty: isLight
      ? "px-4 py-6 text-center text-gray-400 text-sm"
      : "px-4 py-6 text-center text-white/40 text-sm",
    avatar: isLight
      ? "w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-xs font-semibold text-blue-600 overflow-hidden"
      : "w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-semibold text-purple-300 overflow-hidden",
    author: isLight
      ? "text-sm font-medium text-gray-800 truncate"
      : "text-sm font-medium text-white/90 truncate",
    time: isLight ? "text-xs text-gray-400" : "text-xs text-white/30",
    content: isLight
      ? "text-sm text-gray-700 whitespace-pre-wrap break-words"
      : "text-sm text-white/80 whitespace-pre-wrap break-words",
    image: isLight
      ? "mt-2 rounded-lg max-h-48 w-full object-cover border border-gray-200"
      : "mt-2 rounded-lg max-h-48 w-full object-cover border border-white/10",
    actions: isLight
      ? "flex items-center gap-4 mt-2 text-xs text-gray-400"
      : "flex items-center gap-4 mt-2 text-xs text-white/40",
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

        {!isLoading && posts.length === 0 && (
          <div className={t.empty}>
            No posts yet — be the first to start a thread.
          </div>
        )}

        {posts.map((post: any) => (
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
                onClick={() => user && likePost({ postId: post.id })}
                disabled={!user}
                className="flex items-center gap-1 hover:text-pink-500 transition-colors disabled:opacity-50"
              >
                <Heart className="w-3.5 h-3.5" /> {post.likeCount || 0}
              </button>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" />{" "}
                {post.commentCount || 0}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
