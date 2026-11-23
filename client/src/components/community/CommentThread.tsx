import React, { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import Monogram from "./Monogram";
import {
  createVxppPostComment,
  listVxppPostComments,
  relTime,
  type VxppCommunityComment,
} from "@/lib/communities";

interface CommentThreadProps {
  postId: number;
  currentUserName: string | null;
  onRequireSignIn: () => void;
  onCommentAdded: () => void;
}

export default function CommentThread({
  postId,
  currentUserName,
  onRequireSignIn,
  onCommentAdded,
}: CommentThreadProps) {
  const [comments, setComments] = useState<VxppCommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    listVxppPostComments(postId)
      .then((res) => {
        if (active) setComments(res.comments || []);
      })
      .catch(() => {
        if (active) setComments([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [postId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserName) {
      onRequireSignIn();
      return;
    }
    const text = body.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await createVxppPostComment(postId, text);
      setComments((prev) => [...prev, res.comment]);
      setBody("");
      onCommentAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send comment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-[#F0EAE2] dark:border-slate-800 space-y-3">
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#B56535]" />
          Loading comments…
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No comments yet. Start the reply thread below.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {comments.map((comment) => (
            <li key={comment.id} className="flex items-start gap-2.5">
              <Monogram name={comment.author_name} size="sm" />
              <div className="flex-1 min-w-0 rounded-xl bg-[#F7F4F0] dark:bg-slate-800/80 px-3 py-2">
                <div className="flex items-baseline gap-2">
                  <span
                    translate="no"
                    className="notranslate text-xs font-semibold text-[#1A202C] dark:text-slate-100 truncate"
                  >
                    {comment.author_name || "Member"}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                    {relTime(comment.created_date)}
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-[13px] leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">
                  {comment.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
      )}

      {currentUserName ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a comment…"
            maxLength={2000}
            className="flex-1 min-w-0 h-9 rounded-full border border-[#DDD3C8] dark:border-slate-700 bg-[#FAF6F1] dark:bg-slate-800 px-3.5 text-base sm:text-xs text-[#1A202C] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#B56535] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!body.trim() || submitting}
            aria-label="Send comment"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#B56535] hover:bg-[#9C542A] text-white transition-colors cursor-pointer disabled:opacity-45"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={onRequireSignIn}
          className="text-xs font-semibold text-[#B56535] dark:text-amber-300 hover:underline cursor-pointer"
        >
          Sign in to reply
        </button>
      )}
    </div>
  );
}
