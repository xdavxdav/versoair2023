import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Zap,
  TrendingUp,
  Pencil,
  Trash2,
} from "lucide-react";

interface Post {
  id: number;
  author: {
    id: number;
    name: string;
    avatar: string;
    profession?: string;
    verified?: boolean;
  };
  content: string;
  images?: string[];
  videoUrl?: string;
  allowMediaDownload?: boolean;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  engagementScore?: number;
  isTrending?: boolean;
  tags?: string[];
}

interface PostComment {
  id: number;
  content: string;
  createdAt?: string;
  author?: {
    name?: string;
    avatar?: string;
  };
}

interface PostCardProps {
  post: Post;
  canEdit?: boolean;
  onEditPost?: (postId: number, content: string) => Promise<void> | void;
  onDeletePost?: (postId: number) => Promise<void> | void;
  onLike?: (postId: number) => void;
  onComment?: (postId: number, content: string) => Promise<void> | void;
  onEditComment?: (
    postId: number,
    commentId: number,
    content: string,
  ) => Promise<void> | void;
  onDeleteComment?: (postId: number, commentId: number) => Promise<void> | void;
  onFetchComments?: (postId: number) => Promise<PostComment[]>;
  onShare?: (postId: number) => Promise<void> | void;
  liked?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  canEdit = false,
  onEditPost,
  onDeletePost,
  onLike,
  onComment,
  onEditComment,
  onDeleteComment,
  onShare,
  onFetchComments,
  liked = false,
}) => {
  const [isLiked, setIsLiked] = useState(liked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [shareCount, setShareCount] = useState(post.shares);
  const [postContent, setPostContent] = useState(post.content);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editingPostText, setEditingPostText] = useState(post.content);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [postActionError, setPostActionError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const [showParticles, setShowParticles] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [isDeletingCommentId, setIsDeletingCommentId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (!isCommenting || !onFetchComments || commentsLoaded) return;
    setIsLoadingComments(true);
    setCommentsError("");
    onFetchComments(post.id)
      .then((loadedComments) => {
        setComments(loadedComments);
        setCommentsLoaded(true);
      })
      .catch(() => setCommentsError("Comments could not be loaded."))
      .finally(() => setIsLoadingComments(false));
  }, [commentsLoaded, isCommenting, onFetchComments, post.id]);

  const handleLike = () => {
    if (!isLiked) {
      setIsLiked(true);
      setLikeCount((value) => value + 1);
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 600);
      onLike?.(post.id);
    } else {
      setIsLiked(false);
      setLikeCount((value) => Math.max(0, value - 1));
      onLike?.(post.id);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return "Now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const submitComment = async () => {
    const content = comment.trim();
    if (!content || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      await onComment?.(post.id, content);
      setCommentCount((value) => value + 1);
      setComments((current) => [
        {
          id: Date.now(),
          content,
          author: { name: "You" },
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
      setComment("");
      setIsCommenting(false);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const saveEditedComment = async (commentId: number) => {
    const content = editingCommentText.trim();
    if (!content || !onEditComment) return;

    try {
      await onEditComment(post.id, commentId, content);
      setComments((current) =>
        current.map((item) =>
          item.id === commentId ? { ...item, content } : item,
        ),
      );
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch {
      setCommentsError("Comment could not be updated.");
    }
  };

  const deleteComment = async (commentId: number) => {
    if (!onDeleteComment) return;
    setIsDeletingCommentId(commentId);
    try {
      await onDeleteComment(post.id, commentId);
      setComments((current) => current.filter((item) => item.id !== commentId));
      setCommentCount((value) => Math.max(0, value - 1));
      if (editingCommentId === commentId) {
        setEditingCommentId(null);
        setEditingCommentText("");
      }
    } catch {
      setCommentsError("Comment could not be deleted.");
    } finally {
      setIsDeletingCommentId(null);
    }
  };

  useEffect(() => {
    setPostContent(post.content);
  }, [post.content]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const startEditingPost = () => {
    setMenuOpen(false);
    setPostActionError("");
    setEditingPostText(postContent);
    setIsEditingPost(true);
  };

  const saveEditedPost = async () => {
    const trimmed = editingPostText.trim();
    if (!trimmed || !onEditPost || isSavingPost) return;
    setIsSavingPost(true);
    setPostActionError("");
    try {
      await onEditPost(post.id, trimmed);
      setPostContent(trimmed);
      setIsEditingPost(false);
    } catch {
      setPostActionError("Post could not be updated.");
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleDeletePost = async () => {
    if (!onDeletePost || isDeletingPost) return;
    setMenuOpen(false);
    setIsDeletingPost(true);
    setPostActionError("");
    try {
      await onDeletePost(post.id);
    } catch {
      setPostActionError("Post could not be deleted.");
      setIsDeletingPost(false);
    }
  };

  const handleShare = async () => {
    setMenuOpen(false);
    await onShare?.(post.id);
    setShareCount((value) => value + 1);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="mb-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm shadow-slate-200/60 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img
            src={post.author.avatar}
            alt={post.author.name}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-cyan-100"
          />
          <div>
            <div className="flex items-center gap-2">
              <p translate="no" className="notranslate text-sm font-semibold text-slate-800">
                {post.author.name}
              </p>
              {post.author.verified && (
                <span className="text-xs text-cyan-600">✓</span>
              )}
            </div>
            <p className="text-xs text-slate-500">{post.author.profession}</p>
            <p className="text-xs text-slate-400">
              {formatTime(post.timestamp)}
            </p>
          </div>
        </div>
        <div ref={menuRef} className="relative">
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="More actions"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <MoreHorizontal className="h-4 w-4" />
          </motion.button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-30"
            >
              {canEdit && onEditPost && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={startEditingPost}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                >
                  <Pencil className="h-3.5 w-3.5 text-cyan-700" />
                  Edit post
                </button>
              )}
              {canEdit && onDeletePost && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleDeletePost}
                  disabled={isDeletingPost}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {isDeletingPost ? "Deleting..." : "Delete post"}
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={handleShare}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
              >
                <Share2 className="h-3.5 w-3.5 text-slate-500" />
                Share post
              </button>
            </div>
          )}
        </div>
      </div>

      {post.isTrending && (
        <div className="mb-3 flex items-center gap-1 text-xs font-medium text-amber-600">
          <Zap className="h-3 w-3" />
          Trending
        </div>
      )}

      {isEditingPost ? (
        <div className="mb-4 space-y-2">
          <textarea
            value={editingPostText}
            onChange={(e) => setEditingPostText(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-cyan-300 bg-white p-3 text-[15px] leading-6 text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            aria-label="Edit post content"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditingPost(false);
                setEditingPostText(postContent);
                setPostActionError("");
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEditedPost}
              disabled={isSavingPost || !editingPostText.trim()}
              className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-800 disabled:opacity-50"
            >
              {isSavingPost ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <p className="mb-4 whitespace-pre-line text-[15px] leading-7 text-slate-700">
          {postContent}
        </p>
      )}

      {postActionError && (
        <p className="mb-3 text-xs font-medium text-red-600">{postActionError}</p>
      )}

      {post.images && post.images.length > 0 && (
        <div
          className={`mb-4 grid gap-2 overflow-hidden rounded-xl ${
            post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {post.images.map((image, idx) => (
            <motion.img
              key={idx}
              src={image}
              alt={`Post image ${idx + 1}`}
              whileHover={{ scale: 1.01 }}
              className="h-48 w-full cursor-pointer object-cover"
            />
          ))}
        </div>
      )}

      {post.videoUrl && (
        <div className="mb-4 overflow-hidden rounded-xl">
          <video
            src={post.videoUrl}
            controls
            className="max-h-[28rem] w-full bg-slate-950"
          />
        </div>
      )}

      {post.allowMediaDownload && (post.images?.length || post.videoUrl) && (
        <a
          href={`/api/social/posts/${post.id}/media-download`}
          className="mb-4 inline-flex rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          download
        >
          Download media
        </a>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="cursor-pointer rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700 transition-colors hover:bg-cyan-100"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {post.engagementScore && post.engagementScore > 0 && (
        <div className="mb-4 flex items-center gap-1 text-xs font-medium text-amber-600">
          <TrendingUp className="h-3 w-3" />
          {post.engagementScore.toFixed(1)} engagement score
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4 text-xs text-slate-500">
        <button
          type="button"
          onClick={handleLike}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-medium transition-colors hover:bg-slate-100"
        >
          <Heart
            className={`h-3.5 w-3.5 ${isLiked ? "fill-pink-500 text-pink-500" : ""}`}
          />
          {likeCount} likes
        </button>
        <button
          type="button"
          onClick={() => {
            setIsCommenting((current) => !current);
            setShowAllComments(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-medium transition-colors hover:bg-slate-100"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {commentCount} comments
        </button>
        <button
          type="button"
          onClick={() => void handleShare()}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-medium transition-colors hover:bg-slate-100"
        >
          <Share2 className="h-3.5 w-3.5" />
          {shareCount} shares
        </button>
      </div>

      <AnimatePresence>
        {showParticles &&
          [0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={`particle-${i}`}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: (Math.random() - 0.5) * 100,
                y: -100,
                opacity: 0,
                scale: 0,
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="pointer-events-none fixed"
              style={{ left: "50%", top: "50%" }}
            >
              <span className="text-2xl">❤️</span>
            </motion.div>
          ))}
      </AnimatePresence>

      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleLike}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
            isLiked
              ? "border-pink-200 bg-pink-50 text-pink-600"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
          Like
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsCommenting((current) => !current)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100"
        >
          <MessageCircle className="h-4 w-4" />
          Comment
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => void handleShare()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100"
        >
          <Share2 className="h-4 w-4" />
          Share
        </motion.button>
      </div>

      {isCommenting && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <div className="mb-3 space-y-2">
            {isLoadingComments && (
              <p className="text-sm text-slate-500">Loading comments...</p>
            )}
            {commentsError && (
              <p className="text-sm text-rose-600">{commentsError}</p>
            )}
            {!isLoadingComments && !commentsError && comments.length === 0 && (
              <p className="text-sm text-slate-500">No comments yet.</p>
            )}
            {comments.slice(0, showAllComments ? undefined : 3).map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-700 notranslate">
                    {item.author?.name || "Community member"}
                  </p>
                  {(onEditComment || onDeleteComment) && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      {onEditComment && editingCommentId !== item.id && (
                        <button
                          type="button"
                          className="hover:text-cyan-700"
                          onClick={() => {
                            setEditingCommentId(item.id);
                            setEditingCommentText(item.content);
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {onDeleteComment && (
                        <button
                          type="button"
                          className="hover:text-rose-700 disabled:opacity-50"
                          disabled={isDeletingCommentId === item.id}
                          onClick={() => void deleteComment(item.id)}
                        >
                          {isDeletingCommentId === item.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {editingCommentId === item.id ? (
                  <div className="space-y-2">
                    <input
                      value={editingCommentText}
                      onChange={(event) =>
                        setEditingCommentText(event.target.value)
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 notranslate focus:border-cyan-400 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void saveEditedComment(item.id)}
                        className="rounded-lg bg-cyan-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-cyan-500"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditingCommentText("");
                        }}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-700 notranslate whitespace-pre-wrap">
                    {item.content}
                  </p>
                )}
              </div>
            ))}
            {comments.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllComments((current) => !current)}
                className="text-sm font-medium text-cyan-700 hover:text-cyan-600"
              >
                {showAllComments
                  ? "Show fewer comments"
                  : `View all ${comments.length} comments`}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submitComment();
              }}
              placeholder="Write a comment..."
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none notranslate"
              translate="no"
            />
            <button
              onClick={() => void submitComment()}
              disabled={!comment.trim() || isSubmittingComment}
              className="rounded-xl bg-cyan-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Comment
            </button>
          </div>
        </div>
      )}
    </motion.article>
  );
};

export default PostCard;
