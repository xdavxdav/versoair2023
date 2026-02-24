import React from "react";
import { motion } from "framer-motion";
import { Lock, Star, Users, Zap } from "lucide-react";

interface ViewOnlyGateProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export default function ViewOnlyGate({
  onSignIn,
  onSignUp,
}: ViewOnlyGateProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-handstyle">
      <div className="max-w-2xl w-full">
        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex p-4 bg-cyan-500/20 rounded-full mb-6"
          >
            <Lock className="w-12 h-12 text-cyan-400" />
          </motion.div>

          <h1 className="text-5xl font-bold text-white mb-4">
            Unlock the Full Experience
          </h1>

          <p className="text-xl text-slate-300 mb-8 leading-relaxed">
            You're viewing our community blog in read-only mode. Sign in to
            unlock full features and connect with the community!
          </p>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-4 mb-10">
            {[
              {
                icon: Star,
                title: "Create Posts",
                description: "Share your expertise and stories",
              },
              {
                icon: Users,
                title: "Connect & Follow",
                description: "Build meaningful relationships",
              },
              {
                icon: Zap,
                title: "Full Marketplace",
                description: "Buy and sell with the community",
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-cyan-500/50 transition-all"
              >
                <feature.icon className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSignIn}
              className="px-8 py-4 bg-cyan-500 text-white rounded-lg font-bold text-lg hover:bg-cyan-600 transition-colors shadow-lg shadow-cyan-500/20"
            >
              Sign In
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSignUp}
              className="px-8 py-4 bg-white/5 border-2 border-cyan-500/50 text-cyan-400 rounded-lg font-bold text-lg hover:bg-white/10 transition-all"
            >
              Create Account
            </motion.button>
          </div>
        </motion.div>

        {/* Sample Feed Preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6 mt-12 blur-sm pointer-events-none"
        >
          <p className="text-slate-400 text-center text-sm">
            Sign in to see posts from your network...
          </p>
        </motion.div>
      </div>
    </div>
  );
}
