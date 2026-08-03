/**
 * Users Control Panel — Full user/subscriber management
 * Extracted from credentials-vault.tsx
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  Crown,
  Wrench,
  User,
  RefreshCw,
  UserPlus,
  UserMinus,
  UserX,
  UserCheck,
  ShieldAlert,
  Copy,
  X,
  Ban,
  BadgeCheck,
  ChevronRight,
  Key,
  RotateCcw,
  UserCog,
  Send,
  Timer,
  PieChart,
  Hash,
  Terminal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionBlock, InfoRow, ApiEndpoint } from "./vault-shared";

// ═══════════════════════════════════════════════════════════
// 👥 USERS CONTROL PANEL — Full user/subscriber management
// ═══════════════════════════════════════════════════════════

interface ManagedUser {
  id: number;
  username: string;
  email: string;
  role: string;
  isVerified: boolean;
  subscriptionTier: string;
  subscriptionStatus: string;
  trialTier: string | null;
  trialExpiresAt: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  premiumExpiresAt: string | null;
}

export function UserRow({
  u,
  onAction,
}: {
  u: ManagedUser;
  onAction: (action: string, id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const roleBadge: Record<string, string> = {
    superuser: "bg-red-500/20 text-red-400 border-red-800/50",
    admin: "bg-amber-500/20 text-amber-400 border-amber-800/50",
    moderator: "bg-blue-500/20 text-blue-400 border-blue-800/50",
    business_owner: "bg-purple-500/20 text-purple-400 border-purple-800/50",
    user: "bg-gray-500/20 text-gray-400 border-gray-800/50",
  };
  const tierBadge: Record<string, string> = {
    free: "text-gray-500",
    essential: "text-blue-400",
    verified: "text-green-400",
    max: "text-amber-400",
    enterprise: "text-red-400",
  };
  const isLocked = u.lockedUntil && new Date(u.lockedUntil) > new Date();
  const isTrialing =
    u.trialTier && u.trialExpiresAt && new Date(u.trialExpiresAt) > new Date();

  return (
    <div className="border border-gray-800/40 rounded-lg overflow-hidden bg-gray-950/30 hover:bg-gray-900/40 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${isLocked ? "bg-red-500/20 text-red-400" : u.isVerified ? "bg-green-500/15 text-green-400" : "bg-gray-800 text-gray-500"}`}
        >
          {isLocked ? (
            <Ban className="h-3.5 w-3.5" />
          ) : (
            u.username.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white text-xs font-mono font-bold truncate">
              {u.username}
            </span>
            <span
              className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border ${roleBadge[u.role] || roleBadge.user}`}
            >
              {u.role.toUpperCase()}
            </span>
            {u.isVerified && (
              <BadgeCheck className="h-3 w-3 text-green-500 flex-shrink-0" />
            )}
            {isLocked && (
              <ShieldAlert className="h-3 w-3 text-red-400 flex-shrink-0" />
            )}
          </div>
          <div className="text-[10px] text-gray-600 font-mono truncate">
            {u.email}
          </div>
        </div>
        <div className="text-right flex-shrink-0 hidden sm:block">
          <div
            className={`text-[10px] font-mono font-bold ${tierBadge[u.subscriptionTier] || "text-gray-500"}`}
          >
            {u.subscriptionTier.toUpperCase()}
            {isTrialing ? ` (TRIAL: ${u.trialTier})` : ""}
          </div>
          <div className="text-[9px] text-gray-700 font-mono">
            {u.subscriptionStatus}
          </div>
        </div>
        <ChevronRight
          className={`h-3.5 w-3.5 text-gray-600 transition-transform flex-shrink-0 ${expanded ? "rotate-90" : ""}`}
        />
      </button>
      {expanded && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: "auto" }}
          className="border-t border-gray-800/30 px-4 py-3 space-y-3"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-mono">
            <div>
              <span className="text-gray-600">ID:</span>{" "}
              <span className="text-gray-400">{u.id}</span>
            </div>
            <div>
              <span className="text-gray-600">Role:</span>{" "}
              <span className="text-gray-400">{u.role}</span>
            </div>
            <div>
              <span className="text-gray-600">Verified:</span>{" "}
              <span
                className={u.isVerified ? "text-green-400" : "text-red-400"}
              >
                {u.isVerified ? "YES" : "NO"}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Tier:</span>{" "}
              <span
                className={tierBadge[u.subscriptionTier] || "text-gray-400"}
              >
                {u.subscriptionTier}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>{" "}
              <span className="text-gray-400">{u.subscriptionStatus}</span>
            </div>
            <div>
              <span className="text-gray-600">Failed:</span>{" "}
              <span
                className={
                  u.failedLoginAttempts > 0 ? "text-amber-400" : "text-gray-400"
                }
              >
                {u.failedLoginAttempts}
              </span>
            </div>
            {isLocked && (
              <div className="col-span-2">
                <span className="text-gray-600">Locked Until:</span>{" "}
                <span className="text-red-400">
                  {new Date(u.lockedUntil!).toLocaleString()}
                </span>
              </div>
            )}
            {u.premiumExpiresAt && (
              <div className="col-span-2">
                <span className="text-gray-600">Premium Expires:</span>{" "}
                <span className="text-amber-400">
                  {new Date(u.premiumExpiresAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {isTrialing && (
              <div className="col-span-2">
                <span className="text-gray-600">Trial:</span>{" "}
                <span className="text-cyan-400">
                  {u.trialTier} until{" "}
                  {new Date(u.trialExpiresAt!).toLocaleDateString()}
                </span>
              </div>
            )}
            <div className="col-span-2 sm:col-span-3">
              <span className="text-gray-600">Joined:</span>{" "}
              <span className="text-gray-400">
                {new Date(u.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-800/30">
            {isLocked && (
              <button
                onClick={() => onAction("unlock", u.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-mono font-bold hover:bg-green-500/20 transition-colors border border-green-800/30"
              >
                <Unlock className="h-3 w-3" />
                UNLOCK
              </button>
            )}
            <button
              onClick={() => onAction("set-password", u.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-mono font-bold hover:bg-green-500/20 transition-colors border border-green-800/30"
            >
              <Key className="h-3 w-3" />
              SET PASSWORD
            </button>
            {!u.isVerified && (
              <button
                onClick={() => onAction("verify", u.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold hover:bg-emerald-500/20 transition-colors border border-emerald-800/30"
              >
                <BadgeCheck className="h-3 w-3" />
                VERIFY
              </button>
            )}
            <button
              onClick={() => onAction("force-reset", u.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold hover:bg-amber-500/20 transition-colors border border-amber-800/30"
            >
              <RotateCcw className="h-3 w-3" />
              FORCE RESET
            </button>
            <button
              onClick={() => onAction("role-change", u.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-mono font-bold hover:bg-blue-500/20 transition-colors border border-blue-800/30"
            >
              <UserCog className="h-3 w-3" />
              CHANGE ROLE
            </button>
            <button
              onClick={() => onAction("tier-change", u.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-purple-500/10 text-purple-400 text-[10px] font-mono font-bold hover:bg-purple-500/20 transition-colors border border-purple-800/30"
            >
              <Crown className="h-3 w-3" />
              SET TIER
            </button>
            <button
              onClick={() => onAction("send-email", u.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-cyan-500/10 text-cyan-400 text-[10px] font-mono font-bold hover:bg-cyan-500/20 transition-colors border border-cyan-800/30"
            >
              <Send className="h-3 w-3" />
              EMAIL
            </button>
            <button
              onClick={() => onAction("delete", u.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-red-500/10 text-red-400 text-[10px] font-mono font-bold hover:bg-red-500/20 transition-colors border border-red-800/30"
            >
              <UserX className="h-3 w-3" />
              DELETE
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function UsersControlPanel() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [securityStats, setSecurityStats] = useState<any>(null);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // ── Create Artist state ──
  const [showCreateArtist, setShowCreateArtist] = useState(false);
  const [createArtistForm, setCreateArtistForm] = useState({
    email: "",
    username: "",
    password: "",
    stageName: "",
    division: "discovery",
    genre: "",
    country: "",
    bio: "",
  });
  const [artistCodePreview, setArtistCodePreview] = useState<string>("");
  const [createLoading, setCreateLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      // Try primary endpoint first
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (searchQ) params.set("search", searchQ);
      if (roleFilter !== "all") params.set("role", roleFilter);
      let res = await fetch(`/api/v1/admin/users?${params}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : data.users || []);
      } else {
        // Fallback to superuser auth endpoint
        const fallback = await fetch("/auth/admin/users", {
          credentials: "include",
        });
        if (fallback.ok) {
          const data = await fallback.json();
          setUsers(data.users || []);
        }
      }
    } catch {
      // Last resort: try the auth admin endpoint
      try {
        const fallback = await fetch("/auth/admin/users", {
          credentials: "include",
        });
        if (fallback.ok) {
          const data = await fallback.json();
          setUsers(data.users || []);
        }
      } catch {
        /* offline */
      }
    }
    setLoading(false);
  };

  const fetchSecurity = async () => {
    try {
      const res = await fetch("/api/v1/admin/security/stats", {
        credentials: "include",
      });
      if (res.ok) setSecurityStats(await res.json());
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSecurity();
  }, [page, searchQ, roleFilter]);

  // ── Artist code preview: debounced fetch on stage name / division change ──
  useEffect(() => {
    if (!showCreateArtist) return;
    const { stageName, division } = createArtistForm;
    if (!stageName.trim()) {
      setArtistCodePreview("");
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          stageName: stageName.trim(),
          division,
        });
        const res = await fetch(
          `/api/v1/admin/users/artist-code-preview?${params}`,
          { credentials: "include" },
        );
        if (res.ok) {
          const data = await res.json();
          setArtistCodePreview(data.artistCode || "");
        }
      } catch {
        // Generate client-side preview as fallback
        const clean = stageName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const prefix = clean.slice(0, 3) || "XX";
        const divCode =
          {
            discovery: "D",
            indie: "I",
            pro: "P",
            elite: "E",
            signed: "S",
            legend: "L",
          }[division] || "D";
        const d = new Date();
        const dateStr = `${String(d.getFullYear() % 100).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
        setArtistCodePreview(`VA_${prefix}_${divCode}_${dateStr}_XXXXXX`);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [createArtistForm.stageName, createArtistForm.division, showCreateArtist]);

  // ── Handle create artist submit ──
  const handleCreateArtist = async () => {
    const {
      email,
      username,
      password,
      stageName,
      division,
      genre,
      country,
      bio,
    } = createArtistForm;
    const logMsg = (msg: string) =>
      setActionLog((prev) =>
        [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50),
      );

    if (!email || !username || !password || !stageName) {
      logMsg("✗ All fields required: email, username, password, stage name");
      return;
    }
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      logMsg("✗ Password must be 8+ chars with uppercase letter and number");
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase(),
          username,
          password,
          role: "artist",
          isVerified: true,
          stageName: stageName.trim(),
          division,
          genre: genre
            ? genre
                .split(",")
                .map((g: string) => g.trim())
                .filter(Boolean)
            : [],
          country: country || undefined,
          bio: bio || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const code = data.data?.artistCode || artistCodePreview;
        logMsg(`✓ Artist "${stageName}" created — Code: ${code}`);
        setShowCreateArtist(false);
        setCreateArtistForm({
          email: "",
          username: "",
          password: "",
          stageName: "",
          division: "discovery",
          genre: "",
          country: "",
          bio: "",
        });
        setArtistCodePreview("");
        fetchUsers();
      } else {
        const err = await res
          .json()
          .catch(() => ({ error: { message: "Unknown error" } }));
        logMsg(
          `✗ Failed to create artist: ${err.error?.message || err.message || "Server error"}`,
        );
      }
    } catch (e) {
      logMsg(`✗ Network error creating artist: ${e}`);
    }
    setCreateLoading(false);
  };

  const handleAction = async (action: string, userId: number) => {
    const user = users.find((u) => u.id === userId);
    const logMsg = (msg: string) =>
      setActionLog((prev) =>
        [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50),
      );

    // Helper: try primary endpoint, fallback to /auth/admin/* endpoints
    const tryAction = async (
      primaryUrl: string,
      primaryOpts: RequestInit,
      fallbackUrl: string,
      fallbackOpts: RequestInit,
    ): Promise<boolean> => {
      try {
        const res = await fetch(primaryUrl, {
          credentials: "include",
          ...primaryOpts,
        });
        if (res.ok) return true;
      } catch {
        /* primary failed */
      }
      try {
        const res = await fetch(fallbackUrl, {
          credentials: "include",
          ...fallbackOpts,
        });
        return res.ok;
      } catch {
        return false;
      }
    };

    try {
      if (action === "unlock") {
        const ok = await tryAction(
          `/api/v1/admin/security/users/${userId}/unlock`,
          { method: "POST" },
          "/auth/admin/unlock-user",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          },
        );
        logMsg(
          ok
            ? `✓ Unlocked ${user?.username}`
            : `✗ Failed to unlock ${user?.username}`,
        );
      } else if (action === "set-password") {
        const newPassword = prompt(
          `Set new password for ${user?.username} (${user?.email})\n\nMin 8 characters:`,
        );
        if (!newPassword) return;
        if (newPassword.length < 8) {
          logMsg("✗ Password must be at least 8 characters");
          return;
        }
        const res = await fetch("/auth/admin/change-password", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, newPassword }),
        });
        logMsg(
          res.ok
            ? `✓ Password changed for ${user?.username} → new pwd set`
            : `✗ Failed to change password for ${user?.username}`,
        );
      } else if (action === "force-reset") {
        if (
          !confirm(
            `Force password reset for ${user?.username}? Their current password will be invalidated.`,
          )
        )
          return;
        const res = await fetch(
          `/api/v1/admin/security/users/${userId}/force-reset`,
          { method: "POST", credentials: "include" },
        );
        logMsg(
          res.ok
            ? `✓ Force-reset password for ${user?.username}`
            : `✗ Failed to reset ${user?.username}`,
        );
      } else if (action === "role-change") {
        const newRole = prompt(
          `Set role for ${user?.username}\n\nOptions: superuser, admin, moderator, artist, business_owner, user`,
          user?.role,
        );
        if (!newRole) return;
        const ok = await tryAction(
          // Route is /users/:id/change-role — /users/:id/role does not exist
          // and 404'd every time, silently falling through to the legacy
          // /auth/admin/change-role endpoint below.
          `/api/v1/admin/security/users/${userId}/change-role`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: newRole }),
          },
          "/auth/admin/change-role",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, newRole }),
          },
        );
        logMsg(
          ok
            ? `✓ Changed ${user?.username} role → ${newRole}`
            : `✗ Failed to change role for ${user?.username}`,
        );
      } else if (action === "verify") {
        const res = await fetch("/auth/admin/verify-user", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        logMsg(
          res.ok
            ? `✓ Verified ${user?.username}`
            : `✗ Failed to verify ${user?.username}`,
        );
      } else if (action === "tier-change") {
        const newTier = prompt(
          `Set subscription tier for ${user?.username}\n\nOptions: free, essential, verified, max, enterprise`,
          user?.subscriptionTier,
        );
        if (!newTier) return;
        const res = await fetch(`/api/v1/admin/users/${userId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionTier: newTier }),
        });
        logMsg(
          res.ok
            ? `✓ Changed ${user?.username} tier → ${newTier}`
            : `✗ Failed to change tier for ${user?.username}`,
        );
      } else if (action === "send-email") {
        const subject = prompt(`Email subject for ${user?.email}:`);
        if (!subject) return;
        logMsg(
          `→ Email feature coming soon — would send to ${user?.email}: "${subject}"`,
        );
      } else if (action === "delete") {
        if (
          !confirm(
            `⚠️ PERMANENTLY delete user "${user?.username}" (${user?.email})?\n\nThis cannot be undone.`,
          )
        )
          return;
        const res = await fetch(`/api/v1/admin/users/${userId}`, {
          method: "DELETE",
          credentials: "include",
        });
        logMsg(
          res.ok
            ? `✓ Deleted user ${user?.username}`
            : `✗ Failed to delete ${user?.username}`,
        );
      }
      // Refresh data
      setTimeout(() => {
        fetchUsers();
        fetchSecurity();
      }, 500);
    } catch (err) {
      logMsg(`✗ Error: ${err}`);
    }
  };

  const filteredUsers = useMemo(() => {
    let list = users;
    if (tierFilter !== "all")
      list = list.filter((u) => u.subscriptionTier === tierFilter);
    return list;
  }, [users, tierFilter]);

  const stats = useMemo(
    () => ({
      total: users.length,
      verified: users.filter((u) => u.isVerified).length,
      locked: users.filter(
        (u) => u.lockedUntil && new Date(u.lockedUntil) > new Date(),
      ).length,
      premium: users.filter((u) => u.subscriptionTier !== "free").length,
      trials: users.filter(
        (u) =>
          u.trialTier &&
          u.trialExpiresAt &&
          new Date(u.trialExpiresAt) > new Date(),
      ).length,
      roles: {
        superuser: users.filter((u) => u.role === "superuser").length,
        admin: users.filter((u) => u.role === "admin").length,
        moderator: users.filter((u) => u.role === "moderator").length,
        artist: users.filter((u) => u.role === "artist").length,
        business_owner: users.filter((u) => u.role === "business_owner").length,
        user: users.filter((u) => u.role === "user").length,
      },
      tiers: {
        free: users.filter((u) => u.subscriptionTier === "free").length,
        essential: users.filter((u) => u.subscriptionTier === "essential")
          .length,
        verified: users.filter((u) => u.subscriptionTier === "verified").length,
        max: users.filter((u) => u.subscriptionTier === "max").length,
        enterprise: users.filter((u) => u.subscriptionTier === "enterprise")
          .length,
      },
    }),
    [users],
  );

  return (
    <>
      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        {[
          {
            label: "TOTAL",
            value: stats.total,
            icon: <Users className="h-3.5 w-3.5" />,
            color: "text-white",
          },
          {
            label: "VERIFIED",
            value: stats.verified,
            icon: <BadgeCheck className="h-3.5 w-3.5" />,
            color: "text-green-400",
          },
          {
            label: "PREMIUM",
            value: stats.premium,
            icon: <Crown className="h-3.5 w-3.5" />,
            color: "text-amber-400",
          },
          {
            label: "TRIALS",
            value: stats.trials,
            icon: <Timer className="h-3.5 w-3.5" />,
            color: "text-cyan-400",
          },
          {
            label: "LOCKED",
            value: stats.locked,
            icon: <ShieldAlert className="h-3.5 w-3.5" />,
            color: "text-red-400",
          },
          {
            label: "SEC.ISSUES",
            value: securityStats?.lockedAccounts ?? 0,
            icon: <AlertTriangle className="h-3.5 w-3.5" />,
            color: "text-orange-400",
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-2.5 text-center"
          >
            <div
              className={`flex items-center justify-center gap-1.5 ${s.color} mb-1`}
            >
              {s.icon}
              <span className="text-lg font-bold font-mono">{s.value}</span>
            </div>
            <div className="text-[9px] text-gray-600 font-mono">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Role & Tier Breakdown */}
      <SectionBlock
        title="ROLE & TIER DISTRIBUTION"
        icon={<PieChart className="w-3.5 h-3.5 text-white" />}
        color="purple"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-gray-500 font-mono mb-2 font-bold">
              ROLES
            </div>
            {Object.entries(stats.roles).map(([role, count]) => (
              <div
                key={role}
                className="flex items-center justify-between py-1 border-b border-gray-800/20 last:border-0"
              >
                <span className="text-[11px] text-gray-400 font-mono">
                  {role}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                      style={{
                        width: `${stats.total ? ((count as number) / stats.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-green-400 font-mono font-bold w-6 text-right">
                    {count as number}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-mono mb-2 font-bold">
              SUBSCRIPTION TIERS
            </div>
            {Object.entries(stats.tiers).map(([tier, count]) => {
              const c =
                {
                  free: "from-gray-500 to-gray-600",
                  essential: "from-blue-500 to-cyan-600",
                  verified: "from-green-500 to-emerald-600",
                  max: "from-amber-500 to-orange-600",
                  enterprise: "from-red-500 to-rose-600",
                }[tier] || "from-gray-500 to-gray-600";
              return (
                <div
                  key={tier}
                  className="flex items-center justify-between py-1 border-b border-gray-800/20 last:border-0"
                >
                  <span className="text-[11px] text-gray-400 font-mono">
                    {tier}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${c} rounded-full`}
                        style={{
                          width: `${stats.total ? ((count as number) / stats.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-green-400 font-mono font-bold w-6 text-right">
                      {count as number}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SectionBlock>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap gap-2 items-center bg-gray-950/50 border border-gray-800/50 rounded-xl p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQ}
            onChange={(e) => {
              setSearchQ(e.target.value);
              setPage(1);
            }}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-8 pr-3 py-2 text-xs font-mono text-green-400 placeholder-gray-600 focus:outline-none focus:border-green-800/50"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-[11px] font-mono text-gray-400 focus:outline-none focus:border-green-800/50"
        >
          <option value="all">All Roles</option>
          <option value="superuser">Superuser</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="artist">Artist</option>
          <option value="business_owner">Business Owner</option>
          <option value="user">User</option>
        </select>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-[11px] font-mono text-gray-400 focus:outline-none focus:border-green-800/50"
        >
          <option value="all">All Tiers</option>
          <option value="free">Free</option>
          <option value="essential">Essential</option>
          <option value="verified">Verified</option>
          <option value="max">Max</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <button
          onClick={() => {
            fetchUsers();
            fetchSecurity();
          }}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-500/10 text-green-400 text-[11px] font-mono font-bold hover:bg-green-500/20 transition-colors border border-green-800/30"
        >
          <RefreshCw className="h-3 w-3" />
          REFRESH
        </button>
        <button
          onClick={() => setShowCreateArtist((v) => !v)}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-purple-500/10 text-purple-400 text-[11px] font-mono font-bold hover:bg-purple-500/20 transition-colors border border-purple-800/30"
        >
          <UserPlus className="h-3 w-3" />
          {showCreateArtist ? "CANCEL" : "ADD ARTIST"}
        </button>
      </div>

      {/* ── Create Artist Form ── */}
      {showCreateArtist && (
        <div className="bg-purple-950/30 border border-purple-800/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-bold font-mono text-purple-300 uppercase tracking-wider">
              Provision New Artist
            </span>
          </div>

          {/* Artist Code Preview */}
          {artistCodePreview && (
            <div className="bg-black/40 border border-purple-700/30 rounded-lg p-3 flex items-center gap-3">
              <Hash className="h-4 w-4 text-purple-400 flex-shrink-0" />
              <div>
                <div className="text-[9px] text-gray-500 font-mono uppercase mb-0.5">
                  Auto-Generated Artist Code
                </div>
                <div className="text-sm font-mono font-bold text-purple-300 tracking-wider">
                  {artistCodePreview}
                </div>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            {/* Stage Name (drives code generation) */}
            <div>
              <label className="text-[10px] text-gray-500 font-mono font-bold block mb-1">
                STAGE NAME *
              </label>
              <input
                type="text"
                placeholder="e.g. Nooka, Himra, DJ Shadow"
                value={createArtistForm.stageName}
                onChange={(e) =>
                  setCreateArtistForm((f) => ({
                    ...f,
                    stageName: e.target.value,
                  }))
                }
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-purple-300 placeholder-gray-600 focus:outline-none focus:border-purple-700/50"
              />
            </div>

            {/* Division */}
            <div>
              <label className="text-[10px] text-gray-500 font-mono font-bold block mb-1">
                DIVISION
              </label>
              <select
                value={createArtistForm.division}
                onChange={(e) =>
                  setCreateArtistForm((f) => ({
                    ...f,
                    division: e.target.value,
                  }))
                }
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-400 focus:outline-none focus:border-purple-700/50"
              >
                <option value="discovery">Discovery (D)</option>
                <option value="indie">Indie (I)</option>
                <option value="pro">Pro (P)</option>
                <option value="elite">Elite (E)</option>
                <option value="signed">Signed (S)</option>
                <option value="legend">Legend (L)</option>
              </select>
            </div>

            {/* Email */}
            <div>
              <label className="text-[10px] text-gray-500 font-mono font-bold block mb-1">
                EMAIL *
              </label>
              <input
                type="email"
                placeholder="artist@email.com"
                value={createArtistForm.email}
                onChange={(e) =>
                  setCreateArtistForm((f) => ({ ...f, email: e.target.value }))
                }
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-green-400 placeholder-gray-600 focus:outline-none focus:border-purple-700/50"
              />
            </div>

            {/* Username */}
            <div>
              <label className="text-[10px] text-gray-500 font-mono font-bold block mb-1">
                USERNAME *
              </label>
              <input
                type="text"
                placeholder="artist_nooka"
                value={createArtistForm.username}
                onChange={(e) =>
                  setCreateArtistForm((f) => ({
                    ...f,
                    username: e.target.value,
                  }))
                }
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-green-400 placeholder-gray-600 focus:outline-none focus:border-purple-700/50"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-[10px] text-gray-500 font-mono font-bold block mb-1">
                PASSWORD *{" "}
                <span className="text-gray-600 font-normal">
                  (8+ chars, 1 uppercase, 1 number)
                </span>
              </label>
              <input
                type="text"
                placeholder="SecurePass1"
                value={createArtistForm.password}
                onChange={(e) =>
                  setCreateArtistForm((f) => ({
                    ...f,
                    password: e.target.value,
                  }))
                }
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-400 placeholder-gray-600 focus:outline-none focus:border-purple-700/50"
              />
            </div>

            {/* Genre */}
            <div>
              <label className="text-[10px] text-gray-500 font-mono font-bold block mb-1">
                GENRES{" "}
                <span className="text-gray-600 font-normal">
                  (comma-separated)
                </span>
              </label>
              <input
                type="text"
                placeholder="Afrobeats, Coupé-Décalé"
                value={createArtistForm.genre}
                onChange={(e) =>
                  setCreateArtistForm((f) => ({ ...f, genre: e.target.value }))
                }
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-400 placeholder-gray-600 focus:outline-none focus:border-purple-700/50"
              />
            </div>

            {/* Country */}
            <div>
              <label className="text-[10px] text-gray-500 font-mono font-bold block mb-1">
                COUNTRY
              </label>
              <input
                type="text"
                placeholder="Côte d'Ivoire"
                value={createArtistForm.country}
                onChange={(e) =>
                  setCreateArtistForm((f) => ({
                    ...f,
                    country: e.target.value,
                  }))
                }
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-400 placeholder-gray-600 focus:outline-none focus:border-purple-700/50"
              />
            </div>

            {/* Bio */}
            <div className="sm:col-span-2">
              <label className="text-[10px] text-gray-500 font-mono font-bold block mb-1">
                BIO
              </label>
              <textarea
                placeholder="Artist biography..."
                rows={2}
                value={createArtistForm.bio}
                onChange={(e) =>
                  setCreateArtistForm((f) => ({ ...f, bio: e.target.value }))
                }
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-400 placeholder-gray-600 focus:outline-none focus:border-purple-700/50 resize-none"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-[10px] text-gray-600 font-mono">
              Artist can also login with self-created password from registration
            </div>
            <button
              onClick={handleCreateArtist}
              disabled={
                createLoading ||
                !createArtistForm.email ||
                !createArtistForm.stageName ||
                !createArtistForm.password
              }
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600/80 text-white text-[11px] font-mono font-bold hover:bg-purple-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {createLoading ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <UserPlus className="h-3 w-3" />
              )}
              {createLoading ? "CREATING..." : "CREATE ARTIST"}
            </button>
          </div>
        </div>
      )}

      {/* User List */}
      <div className="space-y-1.5">
        {loading ? (
          <div className="text-center py-12 text-gray-600 font-mono text-sm">
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-600 font-mono text-sm">
            No users found
          </div>
        ) : (
          filteredUsers.map((u: ManagedUser) => (
            <UserRow key={u.id} u={u} onAction={handleAction} />
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && users.length > 0 && (
        <div className="flex items-center justify-between bg-gray-950/50 border border-gray-800/50 rounded-xl p-3">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-gray-800/50 text-gray-400 text-[11px] font-mono disabled:opacity-30 hover:bg-gray-800 transition-colors"
          >
            ← PREV
          </button>
          <span className="text-[11px] text-gray-500 font-mono">
            Page {page} • {filteredUsers.length} users shown
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={filteredUsers.length < pageSize}
            className="px-3 py-1.5 rounded-lg bg-gray-800/50 text-gray-400 text-[11px] font-mono disabled:opacity-30 hover:bg-gray-800 transition-colors"
          >
            NEXT →
          </button>
        </div>
      )}

      {/* Admin API Endpoints Reference */}
      <SectionBlock
        title="USER MANAGEMENT ENDPOINTS"
        icon={<UserCog className="w-3.5 h-3.5 text-white" />}
        color="blue"
      >
        <ApiEndpoint
          method="GET"
          path="/api/v1/admin/users"
          desc="List all users (paginated, search, role filter)"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/admin/users"
          desc="Create user (admin-provisioned)"
        />
        <ApiEndpoint
          method="GET"
          path="/api/v1/admin/users/:id"
          desc="User detail + subscription + lock status"
        />
        <ApiEndpoint
          method="PUT"
          path="/api/v1/admin/users/:id"
          desc="Update user (role, tier, email, password)"
        />
        <ApiEndpoint
          method="DELETE"
          path="/api/v1/admin/users/:id"
          desc="Delete user (blocks admin/su deletion)"
        />
        <ApiEndpoint
          method="GET"
          path="/api/v1/admin/security/users"
          desc="All users with security status"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/admin/security/users/:id/unlock"
          desc="Unlock locked account"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/admin/security/users/:id/force-reset"
          desc="Invalidate password"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/admin/security/users/:id/role"
          desc="Change user role"
        />
        <ApiEndpoint
          method="GET"
          path="/api/v1/admin/security/stats"
          desc="Security summary stats"
        />
        <ApiEndpoint
          method="GET"
          path="/api/v1/admin/roles"
          desc="All roles + permissions + user counts"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/admin/roles"
          desc="Create custom role"
        />
        <ApiEndpoint
          method="POST"
          path="/api/v1/admin/roles/:id/assign"
          desc="Assign role to user"
        />
      </SectionBlock>

      {/* Subscription Control Reference */}
      <SectionBlock
        title="SUBSCRIPTION SYSTEM"
        icon={<Crown className="w-3.5 h-3.5 text-white" />}
        color="amber"
      >
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0 mb-3">
          <InfoRow
            label="Tiers"
            value="free → essential → verified → max → enterprise"
          />
          <InfoRow label="Trial Duration" value="7 days (one per account)" />
          <InfoRow label="Expiry Check" value="Daily cron (node-cron)" />
          <InfoRow
            label="Tier Middleware"
            value="requireSubscription(feature)"
          />
        </div>
        <div className="text-[10px] font-mono text-gray-500 mb-2 font-bold">
          TIER PRICING
        </div>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
          <InfoRow label="Essential" value="$29/mo · $290/yr" />
          <InfoRow label="Verified" value="$79/mo · $790/yr" />
          <InfoRow label="Max" value="$149/mo · $1,490/yr" />
          <InfoRow label="Enterprise" value="$499/mo · $4,990/yr" />
        </div>
        <div className="text-[10px] font-mono text-gray-500 mt-3 mb-2 font-bold">
          FEATURE GATES
        </div>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
          <InfoRow label="enhanced_listing" value="essential+" />
          <InfoRow label="analytics" value="verified+" />
          <InfoRow label="priority_support" value="verified+" />
          <InfoRow label="api_access" value="verified+" />
          <InfoRow label="custom_branding" value="max+" />
          <InfoRow label="advanced_analytics" value="max+" />
          <InfoRow label="bulk_operations" value="max+" />
          <InfoRow label="white_label" value="max+" />
          <InfoRow label="dedicated_support" value="max+" />
        </div>
      </SectionBlock>

      {/* Action Log */}
      {actionLog.length > 0 && (
        <SectionBlock
          title="ACTION LOG"
          icon={<Terminal className="w-3.5 h-3.5 text-white" />}
          color="green"
        >
          <div className="bg-black/40 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-[10px] space-y-0.5">
            {actionLog.map((log, i) => (
              <div
                key={i}
                className={
                  log.includes("✓")
                    ? "text-green-400"
                    : log.includes("✗")
                      ? "text-red-400"
                      : "text-gray-500"
                }
              >
                {log}
              </div>
            ))}
          </div>
        </SectionBlock>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// 💰 FINANCE CONTROL PANEL — Payments, revenue, billing
