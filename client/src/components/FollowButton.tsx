import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, UserCheck, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authenticatedFetch } from "@/lib/auth";

interface FollowButtonProps {
  userId: number;
  initialIsFollowing: boolean;
  initialFollowerCount: number;
  onFollowChange?: (isFollowing: boolean, newCount: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function FollowButton({
  userId,
  initialIsFollowing,
  initialFollowerCount,
  onFollowChange,
  size = "md",
  className = "",
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-5 py-2.5 text-sm gap-2",
    lg: "px-8 py-3 text-base gap-2.5",
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const buttonText = useMemo(() => {
    if (isLoading) return "...";
    if (isFollowing) return isHovered ? "Unfollow" : "Following";
    return "Follow";
  }, [isFollowing, isHovered, isLoading]);

  const handleToggle = useCallback(async () => {
    if (isLoading) return;

    const nextState = !isFollowing;
    const optimisticCount = followerCount + (nextState ? 1 : -1);

    setIsLoading(true);
    setIsFollowing(nextState);
    setFollowerCount(optimisticCount);
    onFollowChange?.(nextState, optimisticCount);

    try {
      const response = await authenticatedFetch(
        `/api/social/follow/${userId}`,
        {
          method: nextState ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Could not update follow state");
      }

      const safeCount =
        typeof data?.followerCount === "number"
          ? data.followerCount
          : optimisticCount;

      setFollowerCount(safeCount);
      onFollowChange?.(nextState, safeCount);

      toast({
        title: nextState ? "Following" : "Unfollowed",
        description: nextState
          ? "You'll now see their updates in your feed"
          : "You've unfollowed this member",
      });
    } catch (error) {
      setIsFollowing(!nextState);
      setFollowerCount(followerCount);
      onFollowChange?.(!nextState, followerCount);

      toast({
        title: "Action failed",
        description:
          error instanceof Error
            ? error.message
            : "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [followerCount, isFollowing, isLoading, onFollowChange, toast, userId]);

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading}
      className={[
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        sizeClasses[size],
        isFollowing
          ? isHovered
            ? "border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
            : "border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
          : "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500",
        className,
      ].join(" ")}
    >
      {isLoading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : isFollowing ? (
        <UserCheck className={iconSizes[size]} />
      ) : (
        <UserPlus className={iconSizes[size]} />
      )}
      <AnimatePresence mode="wait">
        <motion.span
          key={buttonText}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
        >
          {buttonText}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
