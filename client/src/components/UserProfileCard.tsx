import React from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  UserMinus,
  MessageCircle,
  Share2,
  Star,
  TrendingUp,
} from "lucide-react";

interface UserProfile {
  id: number;
  name: string;
  profession: string;
  bio: string;
  avatar: string;
  coverImage?: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  engagementScore: number;
  satisfactionRating: number;
  verified?: boolean;
  premiumMember?: boolean;
}

interface UserProfileCardProps {
  user: UserProfile;
  isCurrentUser?: boolean;
  isFollowing?: boolean;
  isFollowPending?: boolean;
  onFollow?: (userId: number) => void;
  onUnfollow?: (userId: number) => void;
  onMessage?: (userId: number) => void;
  onShare?: (userId: number) => void;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  user,
  isCurrentUser = false,
  isFollowing = false,
  isFollowPending = false,
  onFollow,
  onUnfollow,
  onMessage,
  onShare,
}) => {
  const [avatarFailed, setAvatarFailed] = React.useState(false);
  const initials = (user.name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const handleFollowToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isFollowPending) return;
    if (isFollowing) {
      onUnfollow?.(user.id);
    } else {
      onFollow?.(user.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-slate-900 to-slate-800 backdrop-blur-md rounded-xl overflow-hidden border border-white/10 hover:border-cyan-500/30 transition-all duration-200 group"
    >
      {/* Cover Image */}
      {user.coverImage && (
        <div className="h-32 overflow-hidden relative">
          <motion.img
            src={user.coverImage}
            alt="Cover"
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900"></div>
        </div>
      )}

      {/* Profile Content */}
      <div className="px-4 pb-4 pt-2">
        {/* Avatar and basic info */}
        <div className="flex gap-4 mb-4">
          {user.avatar && !avatarFailed ? (
            <motion.img
              src={user.avatar}
              alt={user.name}
              onError={() => setAvatarFailed(true)}
              className="w-20 h-20 rounded-full border-4 border-slate-900 object-cover ring-2 ring-cyan-500/30"
              whileHover={{ scale: 1.05 }}
            />
          ) : (
            <div className="w-20 h-20 rounded-full border-4 border-slate-900 bg-gradient-to-br from-cyan-600 to-slate-700 ring-2 ring-cyan-500/30 flex items-center justify-center text-white font-bold text-xl">
              {initials}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-start gap-2 mb-1">
              <h3 className="font-bold text-white text-lg font-handstyle">
                {user.name}
              </h3>
              {user.verified && (
                <span className="text-cyan-400 text-sm font-handstyle">
                  ✓ Verified
                </span>
              )}
              {user.premiumMember && (
                <span className="text-amber-400 text-sm font-handstyle">
                  ⭐ Premium
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mb-2 font-handstyle">
              {user.profession}
            </p>

            {/* Satisfaction rating */}
            <div className="flex items-center gap-1 text-xs text-amber-400 font-handstyle">
              <Star className="w-3 h-3 fill-current" />
              <span>{user.satisfactionRating.toFixed(1)}/5.0</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-sm text-slate-300 mb-4 line-clamp-2 font-handstyle">
            {user.bio}
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-white/5">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-center p-2 hover:bg-white/5 rounded transition-colors cursor-pointer"
          >
            <p className="text-lg font-bold text-cyan-400 font-handstyle">
              {user.postCount}
            </p>
            <p className="text-xs text-slate-400 font-handstyle">Posts</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-center p-2 hover:bg-white/5 rounded transition-colors cursor-pointer"
          >
            <p className="text-lg font-bold text-purple-400 font-handstyle">
              {user.followerCount}
            </p>
            <p className="text-xs text-slate-400 font-handstyle">Followers</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-center p-2 hover:bg-white/5 rounded transition-colors cursor-pointer"
          >
            <p className="text-lg font-bold text-blue-400 font-handstyle">
              {user.followingCount}
            </p>
            <p className="text-xs text-slate-400 font-handstyle">Following</p>
          </motion.div>
        </div>

        {/* Engagement score */}
        <div className="flex items-center gap-2 mb-4 text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-lg border border-green-500/20 font-handstyle">
          <TrendingUp className="w-3 h-3" />
          <span>
            Engagement: {user.engagementScore.toFixed(1)}
            <span className="text-slate-400 ml-1">
              (Top {Math.floor(Math.random() * 100) + 1}%)
            </span>
          </span>
        </div>

        {/* Action buttons */}
        {!isCurrentUser && (
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFollowToggle}
              disabled={isFollowPending}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all duration-200 font-medium text-xs font-handstyle disabled:opacity-60 disabled:cursor-wait ${
                isFollowing
                  ? "bg-white/5 text-rose-300 border border-rose-400/30 hover:bg-rose-500/15"
                  : "bg-cyan-500 text-white hover:bg-cyan-600"
              }`}
            >
              {isFollowing ? (
                <UserMinus className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {isFollowing ? "Unfollow" : "Follow"}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(event) => {
                event.stopPropagation();
                onMessage?.(user.id);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10 transition-all duration-200 font-medium text-xs font-handstyle"
            >
              <MessageCircle className="w-4 h-4" />
              Message
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default UserProfileCard;
