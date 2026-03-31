import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  Briefcase,
  Star,
  Mail,
  ShoppingBag,
  LogOut,
  User,
  Shield,
  Crown,
  Settings,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import PortalSelector from "@/components/PortalSelector";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCapabilities } from "@/hooks/useCapabilities";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "portals">(
    "overview",
  );
  const { user, logout } = useAuthContext();
  const { capabilities } = useCapabilities();
  const [location, navigate] = useLocation();

  // Track referrer for proper back navigation
  useEffect(() => {
    // Check if we came from a music page (from document.referrer or history state)
    const referrer = document.referrer;
    if (
      referrer &&
      (referrer.includes("/music") ||
        referrer.includes("/stream") ||
        referrer.includes("/artist-portal"))
    ) {
      sessionStorage.setItem("music_referrer", referrer);
    }
  }, []);

  // Build display data from real auth user
  const displayName =
    user?.name || user?.username || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "";
  const displayRole = user?.role || "user";
  const displayTier =
    user?.subscriptionTier || user?.subscription_tier || "free";
  const isAdmin =
    user?.isAdmin || displayRole === "superuser" || displayRole === "admin";
  const hasArtist =
    user?.hasArtistProfile || capabilities?.hasArtistProfile || false;

  const initials =
    displayName
      .split(/\s+/)
      .map((w: string) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "VA";

  const tierLabel =
    displayTier === "free"
      ? "Free"
      : displayTier === "starter"
        ? "Starter"
        : displayTier === "professional"
          ? "Professional"
          : displayTier === "enterprise"
            ? "Enterprise"
            : displayTier === "max"
              ? "Max"
              : displayTier;

  const roleColor = isAdmin
    ? "text-amber-400"
    : displayRole === "artist"
      ? "text-purple-400"
      : displayRole === "premium"
        ? "text-cyan-400"
        : "text-slate-400";

  const roleBadge = isAdmin
    ? displayRole === "superuser"
      ? "Superuser"
      : "Admin"
    : displayRole === "artist"
      ? "Artist"
      : displayRole === "premium"
        ? "Premium"
        : "Member";

  // Not authenticated — show sign-in prompt
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="max-w-md w-full bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/10 p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/20 flex items-center justify-center">
            <User className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-white text-xl font-bold">
            Sign in to view your profile
          </h2>
          <p className="text-white/50 text-sm">
            You need to be logged in to access your profile page.
          </p>
          <Link href="/auth/signin">
            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-bold hover:from-cyan-500 hover:to-cyan-400 transition-all">
              Sign In
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Cover gradient */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-48 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/30 via-purple-600/20 to-pink-600/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(6,182,212,0.15)_0%,transparent_50%),radial-gradient(ellipse_at_70%_80%,rgba(168,85,247,0.1)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950" />
      </motion.div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10 pb-12 w-full">
        {/* Back button */}
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 p-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all duration-200 text-white mb-6"
          title="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Profile Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
            className="w-28 h-28 rounded-full border-4 border-slate-900 bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center ring-2 ring-cyan-500/50 text-white text-3xl font-bold shrink-0"
          >
            {initials}
          </motion.div>

          {/* Info */}
          <motion.div
            className="flex-1 pt-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-3xl font-bold text-white mb-1">
              {displayName}
            </h1>
            <p className="text-slate-400 mb-3">{displayEmail}</p>

            <div className="flex flex-wrap gap-3 mb-4">
              {/* Role badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                  isAdmin
                    ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                    : displayRole === "artist"
                      ? "bg-purple-500/20 border-purple-500/30 text-purple-400"
                      : "bg-cyan-500/20 border-cyan-500/30 text-cyan-400"
                }`}
              >
                {isAdmin ? (
                  <Shield className="w-3 h-3" />
                ) : (
                  <User className="w-3 h-3" />
                )}
                {roleBadge}
              </span>

              {/* Tier badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-300">
                <Crown className="w-3 h-3" />
                {tierLabel} Tier
              </span>

              {/* Artist badge */}
              {hasArtist && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 border border-purple-500/30 text-purple-400">
                  🎵 Artist Profile
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              <Link href="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-5 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors text-sm"
                >
                  <Settings className="w-4 h-4" />
                  Dashboard
                </motion.button>
              </Link>

              {isAdmin && (
                <Link href="/geo-admin">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-5 py-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 font-medium hover:bg-amber-500/30 transition-colors text-sm"
                  >
                    <Shield className="w-4 h-4" />
                    Admin Panel
                  </motion.button>
                </Link>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  // Check if user came from music portal
                  const referrer = sessionStorage.getItem("music_referrer");
                  const isMusicUser =
                    referrer?.startsWith("/music") ||
                    referrer?.startsWith("/stream") ||
                    referrer?.startsWith("/artist-portal");
                  logout();
                  // Redirect based on where they came from
                  navigate(isMusicUser ? "/artist-portal" : "/");
                }}
                className="flex items-center gap-2 px-5 py-2 bg-white/5 text-slate-400 rounded-lg border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all font-medium text-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-white/10">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-3 font-medium transition-all text-sm ${
              activeTab === "overview"
                ? "text-cyan-400 border-b-2 border-cyan-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Account Overview
          </button>
          <button
            onClick={() => setActiveTab("portals")}
            className={`px-4 py-3 font-medium transition-all text-sm ${
              activeTab === "portals"
                ? "text-cyan-400 border-b-2 border-cyan-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            My Portals
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-2 gap-6"
          >
            {/* Account Details */}
            <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-cyan-400" />
                Account Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Username</span>
                  <span className="text-white">
                    {user.username || displayName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Email</span>
                  <span className="text-white">{displayEmail}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Role</span>
                  <span className={roleColor}>{roleBadge}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subscription</span>
                  <span className="text-white">{tierLabel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Status</span>
                  <span className="text-emerald-400">
                    {user.subscriptionStatus || "Active"}
                  </span>
                </div>
              </div>
            </div>

            {/* Capabilities */}
            <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-400" />
                Capabilities
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Artist Profile</span>
                  <span
                    className={
                      hasArtist ? "text-emerald-400" : "text-slate-500"
                    }
                  >
                    {hasArtist ? "✓ Active" : "Not set up"}
                  </span>
                </div>
                {capabilities?.artistStageName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Stage Name</span>
                    <span className="text-purple-400">
                      {capabilities.artistStageName}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Blog Access</span>
                  <span
                    className={
                      capabilities?.canAccessBlog
                        ? "text-emerald-400"
                        : "text-slate-500"
                    }
                  >
                    {capabilities?.canAccessBlog ? "✓ Enabled" : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Contractor</span>
                  <span
                    className={
                      capabilities?.isContractor
                        ? "text-emerald-400"
                        : "text-slate-500"
                    }
                  >
                    {capabilities?.isContractor ? "✓ Active" : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Portals</span>
                  <span className="text-cyan-400">
                    {capabilities?.portals?.length || 1} active
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="md:col-span-2 bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-cyan-400" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link href="/dashboard">
                  <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl p-4 text-center cursor-pointer transition-all group">
                    <Settings className="w-6 h-6 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm text-white font-medium">Dashboard</p>
                  </div>
                </Link>
                <Link href="/marketplace">
                  <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl p-4 text-center cursor-pointer transition-all group">
                    <ShoppingBag className="w-6 h-6 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm text-white font-medium notranslate">
                      Marketplace
                    </p>
                  </div>
                </Link>
                <Link href="/artist-portal/dashboard">
                  <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl p-4 text-center cursor-pointer transition-all group">
                    <Star className="w-6 h-6 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm text-white font-medium">
                      Artist Portal
                    </p>
                  </div>
                </Link>
                <Link href="/contact">
                  <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl p-4 text-center cursor-pointer transition-all group">
                    <Mail className="w-6 h-6 text-pink-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm text-white font-medium">Contact</p>
                  </div>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Portals Tab */}
        {activeTab === "portals" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-6"
          >
            <PortalSelector showHeading compact className="" />
          </motion.div>
        )}
      </div>
    </div>
  );
}
