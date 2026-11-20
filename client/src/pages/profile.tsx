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
import { TmuShell } from "@/components/music/TmuShell";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCapabilities } from "@/hooks/useCapabilities";
import { navigateBackSafely } from "@/lib/safe-navigation";

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
  const [currentPassword, setCurrentPassword] = useState("");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [profileError, setProfileError] = useState("");
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
    user?.displayName ||
    user?.name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "User";
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
    navigateBackSafely(navigate, "/dashboard");
  };

  const handleSaveDisplayName = async () => {
    if (!editName.trim() || editName.trim().length < 2) return;
    setProfileError("");
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
        body: JSON.stringify({
          displayName: editName.trim(),
          ...(currentPassword ? { currentPassword } : {}),
        }),
      });
      if (res.ok) {
        // Refresh page to pick up new name
        window.location.reload();
      } else {
        // Changing an existing name requires the current password server-side;
        // surface that instead of failing silently.
        const data = await res.json().catch(() => null);
        setProfileError(data?.message || "Could not update display name.");
      }
    } catch {
      setProfileError("Network error. Please try again.");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSaveUsername = async () => {
    const username = editUsername.trim();
    if (username.length < 2) return;
    setProfileError("");
    setIsSavingUsername(true);
    try {
      const res = await fetch("/auth/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json().catch(() => null);
        setProfileError(data?.message || "Could not update username.");
      }
    } catch {
      setProfileError("Network error. Please try again.");
    } finally {
      setIsSavingUsername(false);
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
      <TmuShell chrome="site">
        <div className="min-h-[75vh] flex items-center justify-center p-4">
          <div className="tmu-glass-elevated max-w-md w-full rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
              <User className="w-8 h-8 text-fuchsia-300" />
            </div>
            <h2 className="text-white text-xl font-bold">
              Sign in to view your profile
            </h2>
            <p className="text-slate-300 text-sm">
              You need to be logged in to access your profile page.
            </p>
            <Link href="/auth/signin">
              <button className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold hover:from-purple-500 hover:to-fuchsia-500 transition-all">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </TmuShell>
    );
  }

  return (
    <TmuShell chrome="site">
      <div className="flex flex-col min-h-screen">
        {/* Cover gradient — capped to avoid dead vertical space */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative h-28 md:h-36 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-700/35 via-fuchsia-600/20 to-[#06020f]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#06020f]" />
        </motion.div>

        {/* Profile Content */}
        <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10 pb-12 w-full">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-[#180d34]/80 hover:bg-purple-500/20 backdrop-blur-md border border-purple-500/25 transition-all duration-200 text-white mb-6"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Profile Header */}
          <div className="tmu-glass-elevated rounded-3xl p-6 sm:p-7 flex flex-col md:flex-row gap-6 mb-8">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring" }}
              className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#06020f] bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center ring-2 ring-purple-400/50 text-white text-3xl font-bold shrink-0 overflow-hidden"
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
              className="flex-1 pt-1 min-w-0"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="tmu-hero-title text-3xl font-extrabold mb-1 truncate">
                {displayName}
              </h1>
              <p className="text-slate-300 mb-3 truncate">{displayEmail}</p>

              <div className="flex flex-wrap gap-2.5 mb-4">
                {/* Role badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                    isAdmin
                      ? "bg-amber-500/20 border-amber-400/35 text-amber-200"
                      : displayRole === "artist"
                        ? "bg-purple-500/20 border-purple-400/35 text-purple-200"
                        : "bg-cyan-500/20 border-cyan-400/35 text-cyan-200"
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
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#180d34] border border-purple-500/25 text-slate-200">
                  <Crown className="w-3 h-3 text-amber-300" />
                  {tierLabel} Tier
                </span>

                {/* Artist badge */}
                {hasArtist && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-fuchsia-500/20 border border-fuchsia-400/35 text-fuchsia-200">
                    🎵 Artist Profile
                  </span>
                )}
              </div>

              {/* Real stats */}
              <div className="flex gap-6 mb-4 tabular-nums">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">
                    {stats.followerCount ?? "—"}
                  </p>
                  <p className="text-xs text-slate-400">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">
                    {stats.followingCount ?? "—"}
                  </p>
                  <p className="text-xs text-slate-400">Following</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">
                    {stats.postCount ?? "—"}
                  </p>
                  <p className="text-xs text-slate-400">Posts</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 flex-wrap">
                <Link href="/dashboard">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-fuchsia-500 transition-colors text-sm"
                  >
                    <Settings className="w-4 h-4" />
                    Dashboard
                  </motion.button>
                </Link>

                <Link href="/pricing">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/15 text-purple-200 rounded-xl border border-purple-400/35 font-medium hover:bg-purple-500/25 transition-colors text-sm"
                  >
                    <Crown className="w-4 h-4 text-amber-300" />
                    Jump to tiers
                  </motion.button>
                </Link>

                {isAdmin && (
                  <Link href="/geo-admin">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-200 rounded-xl border border-amber-400/35 font-medium hover:bg-amber-500/30 transition-colors text-sm"
                    >
                      <Shield className="w-4 h-4" />
                      Admin Panel
                    </motion.button>
                  </Link>
                )}

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    const referrer = sessionStorage.getItem("music_referrer");
                    const isMusicUser =
                      referrer?.startsWith("/music") ||
                      referrer?.startsWith("/stream") ||
                      referrer?.startsWith("/artist-portal");
                    logout();
                    navigate(isMusicUser ? "/artist-portal" : "/");
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#180d34] text-slate-200 rounded-xl border border-purple-500/25 hover:bg-rose-500/15 hover:text-rose-200 hover:border-rose-500/35 transition-all font-medium text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-purple-500/20">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-3 font-medium transition-all text-sm ${
                activeTab === "overview"
                  ? "text-fuchsia-300 border-b-2 border-fuchsia-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Account Overview
            </button>
            <button
              onClick={() => setActiveTab("portals")}
              className={`px-4 py-3 font-medium transition-all text-sm ${
                activeTab === "portals"
                  ? "text-fuchsia-300 border-b-2 border-fuchsia-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              My Portals
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid md:grid-cols-2 gap-6"
            >
              {/* Account Details */}
              <div className="tmu-glass rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-fuchsia-300" />
                  Account Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm gap-2">
                    <span className="text-slate-400">Display Name</span>
                    {isEditingName ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-[#090418] border border-purple-500/30 rounded-lg px-2 py-1 text-white text-sm w-32 focus:outline-none focus:border-fuchsia-400"
                          placeholder="Your name"
                          autoFocus
                          maxLength={50}
                        />
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="bg-[#090418] border border-purple-500/30 rounded-lg px-2 py-1 text-white text-sm w-36 focus:outline-none focus:border-fuchsia-400"
                          placeholder="Current password"
                          autoComplete="current-password"
                        />
                        <button
                          onClick={handleSaveDisplayName}
                          disabled={
                            isSavingName ||
                            editName.trim().length < 2 ||
                            (!!user?.displayName && !currentPassword)
                          }
                          className="p-1 text-emerald-300 hover:text-emerald-200 disabled:opacity-40"
                        >
                          {isSavingName ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingName(false);
                            setCurrentPassword("");
                            setProfileError("");
                          }}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-white">{displayName}</span>
                        <button
                          onClick={() => {
                            setEditName(displayName);
                            setIsEditingName(true);
                          }}
                          className="p-1 text-slate-400 hover:text-fuchsia-300 transition-colors"
                          title="Edit display name"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-sm gap-2">
                    <span className="text-slate-400">Username</span>
                    {isEditingUsername ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          className="bg-[#090418] border border-purple-500/30 rounded-lg px-2 py-1 text-white text-sm w-36 focus:outline-none focus:border-fuchsia-400"
                          placeholder="Username"
                          autoFocus
                          maxLength={50}
                          autoComplete="username"
                        />
                        <button
                          onClick={handleSaveUsername}
                          disabled={
                            isSavingUsername ||
                            editUsername.trim().length < 2 ||
                            editUsername.trim() === user.username
                          }
                          className="p-1 text-emerald-300 hover:text-emerald-200 disabled:opacity-40"
                          title="Save username"
                        >
                          {isSavingUsername ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingUsername(false);
                            setProfileError("");
                          }}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-white">
                          {user.username || displayName}
                        </span>
                        <button
                          onClick={() => {
                            setEditUsername(user.username || "");
                            setIsEditingUsername(true);
                          }}
                          className="p-1 text-slate-400 hover:text-fuchsia-300 transition-colors"
                          title="Edit username"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {profileError && (
                    <p role="alert" className="text-sm text-rose-300">
                      {profileError}
                    </p>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Email</span>
                    <span className="text-white">{displayEmail}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Role</span>
                    <span className="text-purple-200">{roleBadge}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subscription</span>
                    <span className="text-white">{tierLabel}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Status</span>
                    <span className="text-emerald-300">
                      {user.subscriptionStatus || "Active"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Capabilities */}
              <div className="tmu-glass rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-fuchsia-300" />
                  Capabilities
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Artist Profile</span>
                    <span
                      className={
                        hasArtist ? "text-emerald-300" : "text-slate-400"
                      }
                    >
                      {hasArtist ? "✓ Active" : "Not set up"}
                    </span>
                  </div>
                  {capabilities?.artistStageName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Stage Name</span>
                      <span className="text-fuchsia-300">
                        {capabilities.artistStageName}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Blog Access</span>
                    <span
                      className={
                        capabilities?.canAccessBlog
                          ? "text-emerald-300"
                          : "text-slate-400"
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
                          ? "text-emerald-300"
                          : "text-slate-400"
                      }
                    >
                      {capabilities?.isContractor ? "✓ Active" : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Portals</span>
                    <span className="text-cyan-300 tabular-nums">
                      {capabilities?.portals?.length || 1} active
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="md:col-span-2 tmu-glass rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-fuchsia-300" />
                  Connected Accounts & Portals
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  {capabilities?.portals?.map((portal: string) => (
                    <div
                      key={portal}
                      className="bg-purple-500/10 border border-purple-400/25 rounded-xl p-3 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                        {portal === "artist" ? (
                          <Music className="w-4 h-4 text-fuchsia-300" />
                        ) : portal === "streamer" ? (
                          <Camera className="w-4 h-4 text-fuchsia-300" />
                        ) : portal === "geo-admin" ? (
                          <Shield className="w-4 h-4 text-fuchsia-300" />
                        ) : (
                          <Globe className="w-4 h-4 text-fuchsia-300" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white capitalize">
                          {portal.replace("-", " ")}
                        </p>
                        <p className="text-[11px] text-emerald-300">
                          ✓ Connected
                        </p>
                      </div>
                    </div>
                  )) || (
                    <div className="bg-[#180d34] border border-purple-500/20 rounded-xl p-3 col-span-2">
                      <p className="text-slate-300 text-sm">
                        General portal active
                      </p>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-fuchsia-300" />
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Link href="/dashboard">
                    <div className="tmu-glass tmu-interactive-card rounded-xl p-4 text-center cursor-pointer group">
                      <Settings className="w-6 h-6 text-cyan-300 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-sm text-white font-medium">
                        Dashboard
                      </p>
                    </div>
                  </Link>
                  <Link href="/marketplace">
                    <div className="tmu-glass tmu-interactive-card rounded-xl p-4 text-center cursor-pointer group">
                      <ShoppingBag className="w-6 h-6 text-amber-300 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-sm text-white font-medium notranslate">
                        Marketplace
                      </p>
                    </div>
                  </Link>
                  <Link href="/artist-portal/dashboard">
                    <div className="tmu-glass tmu-interactive-card rounded-xl p-4 text-center cursor-pointer group">
                      <Star className="w-6 h-6 text-fuchsia-300 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-sm text-white font-medium">
                        Artist Portal
                      </p>
                    </div>
                  </Link>
                  <Link href="/contact">
                    <div className="tmu-glass tmu-interactive-card rounded-xl p-4 text-center cursor-pointer group">
                      <Mail className="w-6 h-6 text-pink-300 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-sm text-white font-medium">
                        Contact
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* Portals Tab */}
          {activeTab === "portals" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="tmu-glass rounded-2xl p-6"
            >
              <PortalSelector showHeading compact className="" />
            </motion.div>
          )}
        </div>
      </div>
    </TmuShell>
  );
}
