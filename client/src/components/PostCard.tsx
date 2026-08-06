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
import AnimatedKeyboardText from "@/components/AnimatedKeyboardText";

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
  const [showParticles, setShowParticles] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const handleLike = () => {
    if (!isLiked) {
      setIsLiked(true);
      setLikeCount(likeCount + 1);
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 600);
      onLike?.(post.id);
    } else {
      setIsLiked(false);
      setLikeCount(likeCount - 1);
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
      setComment("");
      setIsCommenting(false);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-slate-900 to-slate-800 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:border-cyan-500/30 transition-all duration-200 mb-4 group font-handstyle"
    >
      {/* Header with author info */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={post.author.avatar}
            alt={post.author.name}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-cyan-500/20"
          />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white text-sm font-handstyle">
                {post.author.name}
              </p>
              {post.author.verified && (
                <span className="text-cyan-400 text-xs font-handstyle">✓</span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-handstyle">
              {post.author.profession}
            </p>
            <p className="text-xs text-slate-500 font-handstyle">
              {formatTime(post.timestamp)}
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors"
        >
          <MoreHorizontal className="w-4 h-4 text-slate-400" />
        </motion.button>
      </div>

      {/* Trending badge */}
      {post.isTrending && (
        <div className="flex items-center gap-1 mb-3 text-xs text-amber-400 font-handstyle">
          <Zap className="w-3 h-3" />
          Trending
        </div>
      )}

      {/* Content */}
      <p className="text-slate-200 text-sm mb-4 leading-relaxed font-handstyle">
        {post.content}
      </p>

      {/* Images */}
      {post.images && post.images.length > 0 && (
        <div
          className={`grid gap-2 mb-4 rounded-lg overflow-hidden ${
            post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {post.images.map((image, idx) => (
            <motion.img
              key={idx}
              src={image}
              alt={`Post image ${idx + 1}`}
              whileHover={{ scale: 1.02 }}
              className="w-full h-48 object-cover cursor-pointer"
            />
          ))}
        </div>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded-full hover:bg-cyan-500/20 transition-colors cursor-pointer font-handstyle"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Engagement score */}
      {post.engagementScore && post.engagementScore > 0 && (
        <div className="flex items-center gap-1 mb-4 text-xs text-green-400 font-handstyle">
          <TrendingUp className="w-3 h-3" />
          {post.engagementScore.toFixed(1)} engagement score
        </div>
      )}

      {/* Interaction stats */}
      <div className="flex justify-between text-xs text-slate-400 mb-4 pb-4 border-b border-white/5 font-handstyle">
        <span>{likeCount} likes</span>
        <span>{post.comments} comments</span>
        <span>{post.shares} shares</span>
      </div>

      {/* Like particles effect */}
      <AnimatePresence>
        {showParticles &&
          [0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={`particle-${i}`}
              initial={{
                x: 0,
                y: 0,
                opacity: 1,
                scale: 1,
              }}
              animate={{
                x: (Math.random() - 0.5) * 100,
                y: -100,
                opacity: 0,
                scale: 0,
              }}
              transition={{
                duration: 0.6,
                ease: "easeOut",
              }}
              className="fixed pointer-events-none"
              style={{
                left: "50%",
                top: "50%",
              }}
            >
              <span className="text-2xl">❤️</span>
            </motion.div>
          ))}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all duration-200 ${
            isLiked
              ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
              : "bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10"
          }`}
        >
          <motion.div
            animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
          </motion.div>
          <span className="text-xs font-medium font-handstyle">Like</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsCommenting((current) => !current)}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10 transition-all duration-200"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs font-medium font-handstyle">Comment</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onShare?.(post.id)}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10 transition-all duration-200"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-xs font-medium font-handstyle">Share</span>
        </motion.button>
      </div>

      {isCommenting && (
        <div className="mt-3 flex gap-2 border-t border-white/5 pt-3">
          <input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitComment();
            }}
            placeholder="Write a reply..."
            className="min-w-0 flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50"
          />
          <button
            onClick={submitComment}
            disabled={!comment.trim() || isSubmittingComment}
            className="px-3 py-2 rounded-lg bg-cyan-500 text-sm font-medium text-white disabled:opacity-50"
          >
            Reply
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default PostCard;
