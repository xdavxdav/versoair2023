import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  UserPlus,
  UserMinus,
  MessageCircle,
  Share2,
  Mail,
} from "lucide-react";
import { useScrollLock } from "@/hooks/use-scroll-lock";

interface User {
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

interface UserConnectionModalProps {
  isOpen: boolean;
  user: User | null;
  isConnected?: boolean;
  onClose: () => void;
  onConnect: (userId: number) => void | Promise<void>;
  onDisconnect?: (userId: number) => void | Promise<void>;
  onMessage: (userId: number) => void;
  onShare: (userId: number) => void;
}

const UserConnectionModal: React.FC<UserConnectionModalProps> = ({
  isOpen,
  user,
  isConnected = false,
  onClose,
  onConnect,
  onDisconnect,
  onMessage,
  onShare,
}) => {
  useScrollLock(isOpen);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "connecting" | "connected" | "failed"
  >("idle");

  const handleConnect = async () => {
    if (!user) return;

    setIsConnecting(true);
    setConnectionStatus("connecting");

    try {
      await onConnect(user.id);

      setConnectionStatus("connected");

      // Auto-close after success
      setTimeout(() => {
        onClose();
        setConnectionStatus("idle");
        setIsConnecting(false);
      }, 1000);
    } catch (error) {
      setConnectionStatus("failed");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user || !onDisconnect) return;

    setIsDisconnecting(true);
    try {
      await onDisconnect(user.id);
      setConnectionStatus("idle");
      onClose();
    } catch (error) {
      setConnectionStatus("failed");
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="fixed inset-0 z-50 overflow-y-auto overscroll-contain touch-pan-y flex items-start justify-center p-3 sm:p-4 [-webkit-overflow-scrolling:touch]"
          >
            <div className="w-full max-w-md my-[max(0.75rem,env(safe-area-inset-top))] mb-[max(0.75rem,env(safe-area-inset-bottom))] max-h-[calc(100dvh-1.5rem)] flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-white/10 overflow-hidden font-handstyle">
              {/* Cover Image */}
              {user.coverImage && (
                <div className="h-32 overflow-hidden relative flex-shrink-0">
                  <motion.img
                    src={user.coverImage}
                    alt="Cover"
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900" />
                </div>
              )}

              {/* Content */}
              <div className="px-6 pb-6 pt-4 overflow-y-auto overscroll-contain">
                {/* Close Button */}
                <div className="flex justify-end mb-4">
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* User Avatar & Info */}
                <div className="flex flex-col items-center text-center mb-6">
                  <motion.img
                    src={user.avatar}
                    alt={user.name}
                    className="w-24 h-24 rounded-full border-4 border-slate-900 object-cover ring-2 ring-cyan-500/50 mb-4"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1 }}
                  />

                  <div className="flex items-center gap-2 justify-center mb-2">
                    <h2 className="text-2xl font-bold text-white font-handstyle">
                      {user.name}
                    </h2>
                    {user.verified && <span className="text-cyan-400">✓</span>}
                  </div>

                  <p className="text-sm text-slate-400 font-handstyle mb-2">
                    {user.profession}
                  </p>

                  {user.bio && (
                    <p className="text-sm text-slate-300 font-handstyle">
                      {user.bio}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <p className="text-lg font-bold text-cyan-400 font-handstyle">
                      {user.postCount}
                    </p>
                    <p className="text-xs text-slate-400 font-handstyle">
                      Posts
                    </p>
                  </div>
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <p className="text-lg font-bold text-purple-400 font-handstyle">
                      {user.followerCount}
                    </p>
                    <p className="text-xs text-slate-400 font-handstyle">
                      Followers
                    </p>
                  </div>
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <p className="text-lg font-bold text-blue-400 font-handstyle">
                      {user.engagementScore.toFixed(1)}
                    </p>
                    <p className="text-xs text-slate-400 font-handstyle">
                      Engagement
                    </p>
                  </div>
                </div>

                {/* Connection Status */}
                <AnimatePresence mode="wait">
                  {connectionStatus === "connected" && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 mb-4 text-center"
                    >
                      <p className="text-sm text-green-400 font-handstyle">
                        ✓ Connected! You can now interact with {user.name}
                      </p>
                    </motion.div>
                  )}

                  {connectionStatus === "failed" && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 text-center"
                    >
                      <p className="text-sm text-red-400 font-handstyle">
                        ✗ Connection failed. Please try again.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Connect Button */}
                  {!isConnected && connectionStatus !== "connected" && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-handstyle"
                    >
                      {isConnecting && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                          }}
                        >
                          <UserPlus className="w-5 h-5" />
                        </motion.div>
                      )}
                      {!isConnecting && (
                        <>
                          <UserPlus className="w-5 h-5" />
                          Connect with {user.name.split(" ")[0]}
                        </>
                      )}
                    </motion.button>
                  )}

                  {(isConnected || connectionStatus === "connected") && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDisconnect}
                      disabled={isDisconnecting || !onDisconnect}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 text-rose-300 font-medium rounded-lg border border-rose-400/30 hover:bg-rose-500/15 transition-all disabled:opacity-60 disabled:cursor-wait font-handstyle"
                    >
                      <UserMinus className="w-5 h-5" />
                      {isDisconnecting ? "Disconnecting…" : "Disconnect"}
                    </motion.button>
                  )}

                  {/* Secondary Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onMessage(user.id);
                        onClose();
                      }}
                      className="flex items-center justify-center gap-2 py-2 px-3 bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10 rounded-lg transition-all font-medium text-sm font-handstyle"
                    >
                      <Mail className="w-4 h-4" />
                      Message
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onShare(user.id);
                        onClose();
                      }}
                      className="flex items-center justify-center gap-2 py-2 px-3 bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10 rounded-lg transition-all font-medium text-sm font-handstyle"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </motion.button>
                  </div>
                </div>

                {/* Footer Text */}
                <p className="text-xs text-slate-500 text-center mt-4 font-handstyle">
                  Connecting allows you to follow updates, send messages, and
                  interact with {user.name}'s content.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UserConnectionModal;
