import React, { useState } from "react";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import Monogram from "./Monogram";
import CommentThread from "./CommentThread";
import { relTime, type VxppCommunityPost } from "@/lib/communities";

interface CommunityPostCardProps {
  post: VxppCommunityPost;
  likeCount: number;
  isLiked: boolean;
  commentCount: number;
  canDelete: boolean;
  currentUserName: string | null;
  onToggleLike: (post: VxppCommunityPost) => void;
  onDelete: (post: VxppCommunityPost) => void;
  onCommentAdded: (postId: number) => void;
  onRequireSignIn: () => void;
}

export default function CommunityPostCard({
  post,
  likeCount,
  isLiked,
  commentCount,
  canDelete,
  currentUserName,
  onToggleLike,
  onDelete,
  onCommentAdded,
  onRequireSignIn,
}: CommunityPostCardProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);

  return (
    <article className="rounded-2xl border border-[#E6DFD6] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Monogram name={post.author_name} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                translate="no"
                className="notranslate text-sm font-semibold text-[#1A202C] dark:text-slate-100 truncate"
              >
                {post.author_name || "Member"}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                {relTime(post.created_date)}
              </span>
            </div>
          </div>
        </div>

        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(post)}
            aria-label="Delete post"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-300 transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {post.body && (
        <p className="mt-3 text-[15px] leading-relaxed text-[#1A202C] dark:text-slate-200 whitespace-pre-wrap break-words">
          {post.body}
        </p>
      )}

      {post.image_url && (
        <div className="mt-3 overflow-hidden rounded-xl border border-[#EFE9E0] dark:border-slate-800 bg-[#F7F4F0] dark:bg-slate-950">
          <img
            src={post.image_url}
            alt=""
            loading="lazy"
            className="max-h-[440px] w-full object-cover"
          />
        </div>
      )}

      <div className="mt-3.5 pt-2.5 border-t border-[#F4EFE8] dark:border-slate-800 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onToggleLike(post)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors cursor-pointer ${
            isLiked
              ? "bg-[#B56535]/12 text-[#B56535] dark:bg-amber-500/20 dark:text-amber-300"
              : "text-slate-600 dark:text-slate-300 hover:bg-[#F7F4F0] dark:hover:bg-slate-800"
          }`}
        >
          <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
          <span className="tabular-nums">{likeCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setCommentsOpen((v) => !v)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors cursor-pointer ${
            commentsOpen
              ? "bg-[#F7F4F0] dark:bg-slate-800 text-[#1A202C] dark:text-slate-100"
              : "text-slate-600 dark:text-slate-300 hover:bg-[#F7F4F0] dark:hover:bg-slate-800"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="tabular-nums">{commentCount}</span>
        </button>
      </div>

      {commentsOpen && (
        <CommentThread
          postId={post.id}
          currentUserName={currentUserName}
          onRequireSignIn={onRequireSignIn}
          onCommentAdded={() => onCommentAdded(post.id)}
        />
      )}
    </article>
  );
}
