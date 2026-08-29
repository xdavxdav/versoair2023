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
  Edit3,
  Check,
  X,
  Loader2,
  Globe,
  Music,
  Camera,
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

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
  const avatarUrl = user?.avatar && !avatarFailed ? user.avatar : null;

  // Real stats — pulled from the social API, falls back to "—" if unavailable
  const [stats, setStats] = useState<{
    followerCount: number | null;
    followingCount: number | null;
    postCount: number | null;
  }>({ followerCount: null, followingCount: null, postCount: null });

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetch(`/api/social/users/${user.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json?.data) return;
        setStats({
          followerCount: json.data.followerCount ?? null,
          followingCount: json.data.followingCount ?? null,
          postCount: json.data.postCount ?? null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/");
    }
  };

  const handleSaveDisplayName = async () => {
    if (!editName.trim() || editName.trim().length < 2) return;
    setIsSavingName(true);
    try {
      const token =
        localStorage.getItem("auth_token") || localStorage.getItem("authToken");
      // NOTE: the route is POST /auth/account/set-display-name.
      // PUT /auth/display-name does not exist and silently 404'd, so saving a
      // display name from this page never did anything.
      const res = await fetch("/auth/account/set-display-name", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ displayName: editName.trim() }),
      });
      if (res.ok) {
        // Refresh page to pick up new name
        window.location.reload();
      } else {
        // Changing an existing name requires the current password server-side;
        // surface that instead of failing silently.
        const data = await res.json().catch(() => null);
        console.error(
          "Failed to update display name:",
          data?.message || res.status,
        );
      }
    } catch (err) {
      console.error("Failed to update display name:", err);
    } finally {
      setIsSavingName(false);
      setIsEditingName(false);
    }
  };

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
      <div className="min-h-screen flex items-center justify-center bg-[#f3efe9] p-4">
        <div className="max-w-md w-full bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/10 p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/20 flex items-center justify-center">
            <User className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-slate-900 text-xl font-bold">
            Sign in to view your profile
          </h2>
          <p className="text-slate-900/50 text-sm">
            You need to be logged in to access your profile page.
          </p>
          <Link href="/auth/signin">
            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-slate-900 font-bold hover:from-cyan-500 hover:to-cyan-400 transition-all">
              Sign In
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f3efe9]">
      {/* Cover gradient — capped to avoid dead vertical space */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-28 md:h-36 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-700/30 via-violet-600/20 to-amber-900/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#efe7dd]" />
      </motion.div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10 pb-12 w-full">
        {/* Back button — visible on all viewports, amber accent */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 p-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all duration-200 text-slate-900 mb-6"
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
            className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-slate-900 bg-gradient-to-br from-amber-500 to-violet-600 flex items-center justify-center ring-2 ring-amber-500/50 text-slate-900 text-3xl font-bold shrink-0"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${displayName}'s avatar`}
                onError={() => setAvatarFailed(true)}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </motion.div>

          {/* Info */}
          <motion.div
            className="flex-1 pt-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-3xl font-bold text-slate-900 mb-1">
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

            {/* Real stats — Followers / Following / Posts, from /api/social/users/:id */}
            <div className="flex gap-6 mb-4">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">
                  {stats.followerCount ?? "—"}
                </p>
                <p className="text-xs text-slate-400">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">
                  {stats.followingCount ?? "—"}
                </p>
                <p className="text-xs text-slate-400">Following</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">
                  {stats.postCount ?? "—"}
                </p>
                <p className="text-xs text-slate-400">Posts</p>
              </div>
            </div>

            {/* Action Buttons — single set, responsive across all breakpoints */}
            <div className="flex gap-3 flex-wrap">
              <Link href="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-5 py-2 bg-cyan-500 text-slate-900 rounded-lg font-medium hover:bg-cyan-600 transition-colors text-sm"
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
                : "text-slate-400 hover:text-slate-900"
            }`}
          >
            Account Overview
          </button>
          <button
            onClick={() => setActiveTab("portals")}
            className={`px-4 py-3 font-medium transition-all text-sm ${
              activeTab === "portals"
                ? "text-cyan-400 border-b-2 border-cyan-500"
                : "text-slate-400 hover:text-slate-900"
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
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-cyan-400" />
                Account Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Display Name</span>
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-slate-900 text-sm w-32 focus:outline-none focus:border-cyan-500"
                        placeholder="Your name"
                        autoFocus
                        maxLength={50}
                      />
                      <button
                        onClick={handleSaveDisplayName}
                        disabled={isSavingName || editName.trim().length < 2}
                        className="p-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
                      >
                        {isSavingName ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setIsEditingName(false)}
                        className="p-1 text-slate-400 hover:text-slate-900"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900">{displayName}</span>
                      <button
                        onClick={() => {
                          setEditName(displayName);
                          setIsEditingName(true);
                        }}
                        className="p-1 text-slate-500 hover:text-cyan-400 transition-colors"
                        title="Edit display name"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Username</span>
                  <span className="text-slate-900">
                    {user.username || displayName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Email</span>
                  <span className="text-slate-900">{displayEmail}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Role</span>
                  <span className={roleColor}>{roleBadge}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subscription</span>
                  <span className="text-slate-900">{tierLabel}</span>
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
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
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
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                Connected Accounts & Portals
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {capabilities?.portals?.map((portal: string) => (
                  <div
                    key={portal}
                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      {portal === "artist" ? (
                        <Music className="w-4 h-4 text-emerald-400" />
                      ) : portal === "streamer" ? (
                        <Camera className="w-4 h-4 text-emerald-400" />
                      ) : portal === "geo-admin" ? (
                        <Shield className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Globe className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 capitalize">
                        {portal.replace("-", " ")}
                      </p>
                      <p className="text-[10px] text-emerald-400">
                        ✓ Connected
                      </p>
                    </div>
                  </div>
                )) || (
                  <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 col-span-2">
                    <p className="text-slate-400 text-sm">
                      General portal active
                    </p>
                  </div>
                )}
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-cyan-400" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link href="/dashboard">
                  <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl p-4 text-center cursor-pointer transition-all group">
                    <Settings className="w-6 h-6 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm text-slate-900 font-medium">Dashboard</p>
                  </div>
                </Link>
                <Link href="/marketplace">
                  <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl p-4 text-center cursor-pointer transition-all group">
                    <ShoppingBag className="w-6 h-6 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm text-slate-900 font-medium notranslate">
                      Marketplace
                    </p>
                  </div>
                </Link>
                <Link href="/artist-portal/dashboard">
                  <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl p-4 text-center cursor-pointer transition-all group">
                    <Star className="w-6 h-6 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm text-slate-900 font-medium">
                      Artist Portal
                    </p>
                  </div>
                </Link>
                <Link href="/contact">
                  <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl p-4 text-center cursor-pointer transition-all group">
                    <Mail className="w-6 h-6 text-pink-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm text-slate-900 font-medium">Contact</p>
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
