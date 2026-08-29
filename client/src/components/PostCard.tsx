import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Zap,
  TrendingUp,
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
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  engagementScore?: number;
  isTrending?: boolean;
  tags?: string[];
}

interface PostCardProps {
  post: Post;
  onLike?: (postId: number) => void;
  onComment?: (postId: number, content: string) => Promise<void> | void;
  onShare?: (postId: number) => void;
  liked?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  onShare,
  liked = false,
}) => {
  const [isLiked, setIsLiked] = useState(liked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [shareCount, setShareCount] = useState(post.shares);
  const [showParticles, setShowParticles] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

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
      setComment("");
      setIsCommenting(false);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = () => {
    onShare?.(post.id);
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
              <p className="text-sm font-semibold text-slate-800">
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
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.96 }}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100"
          aria-label="More actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </motion.button>
      </div>

      {post.isTrending && (
        <div className="mb-3 flex items-center gap-1 text-xs font-medium text-amber-600">
          <Zap className="h-3 w-3" />
          Trending
        </div>
      )}

      <p className="mb-4 text-[15px] leading-7 text-slate-700">
        {post.content}
      </p>

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
        <div className="mb-4 flex items-center gap-1 text-xs font-medium text-emerald-600">
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
          onClick={() => setIsCommenting((current) => !current)}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-medium transition-colors hover:bg-slate-100"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {commentCount} comments
        </button>
        <button
          type="button"
          onClick={handleShare}
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
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100"
        >
          <Share2 className="h-4 w-4" />
          Share
        </motion.button>
      </div>

      {isCommenting && (
        <div className="mt-3 flex gap-2 border-t border-slate-200 pt-3">
          <input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submitComment();
            }}
            placeholder="Write a reply..."
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
          />
          <button
            onClick={() => void submitComment()}
            disabled={!comment.trim() || isSubmittingComment}
            className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reply
          </button>
        </div>
      )}
    </motion.article>
  );
};

export default PostCard;
