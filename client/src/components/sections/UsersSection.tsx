import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  X,
  AlertCircle,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Loader2,
  MailCheck,
  MailX,
  Crown,
  Eye,
  RefreshCw,
  Music,
  Briefcase,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/auth";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import {
  isValidEmail,
  checkPasswordLength,
  checkPasswordUpper,
  checkPasswordNumber,
  passwordStrengthLevel,
  isPasswordStrong,
  isValidPhone,
} from "@/lib/auth-validation";

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  gateUsername: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  isActive: boolean;
  isLocked: boolean;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  failedLoginAttempts: number | null;
  lockedUntil: string | null;
  createdAt: string | null;
  portalAccess?: string[] | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface UserFormData {
  username: string;
  email: string;
  password: string;
  role: string;
  gateUsername: string;
  isVerified: boolean;
  phone: string;
  subscriptionTier: string;
  portalAccess: string[];
  // Artist-specific
  stageName: string;
  genre: string;
  country: string;
  // Contractor-specific
  specialization: string;
  hourlyRate: string;
}

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------

const ROLE_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  superuser: {
    label: "Superuser",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: <Crown className="h-3 w-3" />,
  },
  admin: {
    label: "Admin",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    icon: <ShieldCheck className="h-3 w-3" />,
  },
  moderator: {
    label: "Moderator",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: <Shield className="h-3 w-3" />,
  },
  business_owner: {
    label: "Business Owner",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    icon: <ShieldAlert className="h-3 w-3" />,
  },
  artist: {
    label: "Artist",
    color: "text-fuchsia-700",
    bgColor: "bg-fuchsia-100",
    icon: <Music className="h-3 w-3" />,
  },
  contractor: {
    label: "Contractor",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    icon: <Briefcase className="h-3 w-3" />,
  },
  user: {
    label: "User",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    icon: <UserCheck className="h-3 w-3" />,
  },
};

const ROLES = Object.keys(ROLE_CONFIG);

const PORTAL_OPTIONS = [
  "general",
  "artist",
  "subscriber",
  "community",
  "contractor",
  "business",
];

const TIER_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "essential", label: "Essential" },
  { value: "verified", label: "Verified" },
  { value: "max", label: "Max" },
  { value: "enterprise", label: "Enterprise" },
];

const GENRES = [
  "Pop",
  "Hip-Hop",
  "R&B",
  "Rock",
  "Electronic",
  "Jazz",
  "Classical",
  "Afrobeats",
  "Reggae",
  "Latin",
  "Country",
  "Gospel",
  "Dancehall",
  "Soul",
  "Indie",
  "Other",
];

const SPECIALIZATIONS = [
  "General Construction",
  "Electrical",
  "Plumbing",
  "HVAC",
  "Carpentry",
  "Painting",
  "Roofing",
  "Landscaping",
  "Web Development",
  "Graphic Design",
  "Marketing",
  "Consulting",
  "IT Services",
  "Photography",
  "Catering",
  "Cleaning",
  "Other",
];

const API_BASE_URL =
  typeof window !== "undefined" ? import.meta.env.VITE_API_URL || "" : "";

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function UsersSection() {
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  useScrollLock(isModalOpen || !!viewingUser || !!deleteConfirm);
  const [formData, setFormData] = useState<UserFormData>({
    username: "",
    email: "",
    password: "",
    role: "user",
    gateUsername: "",
    isVerified: false,
    phone: "",
    subscriptionTier: "free",
    portalAccess: ["general"],
    stageName: "",
    genre: "",
    country: "",
    specialization: "",
    hourlyRate: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // -------------------------------------------------------------------
  // Fetch users
  // -------------------------------------------------------------------

  const fetchUsers = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
        });
        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (roleFilter) params.set("role", roleFilter);

        const res = await authenticatedFetch(
          `${API_BASE_URL}/api/v1/admin/users?${params}`,
        );
        if (!res.ok) throw new Error("Failed to fetch users");
        const json = await res.json();

        if (json.success) {
          setUsers(json.data || []);
          if (json.pagination) setPagination(json.pagination);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setError("Failed to load users");
        setTimeout(() => setError(""), 4000);
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, roleFilter],
  );

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  // -------------------------------------------------------------------
  // CRUD handlers
  // -------------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.email) {
      setError("Username and email are required");
      return;
    }
    if (!editingUser && !formData.password) {
      setError("Password is required for new users");
      return;
    }
    if (!isValidEmail(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (formData.password && !isPasswordStrong(formData.password)) {
      setError("Password must be 8+ chars with uppercase letter and number");
      return;
    }
    if (formData.phone && !isValidPhone(formData.phone)) {
      setError("Please enter a valid phone number");
      return;
    }
    if (formData.role === "artist" && !editingUser && !formData.stageName) {
      setError("Stage name is required for artist accounts");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const url = editingUser
        ? `${API_BASE_URL}/api/v1/admin/users/${editingUser.id}`
        : `${API_BASE_URL}/api/v1/admin/users`;
      const method = editingUser ? "PUT" : "POST";

      const payload: Record<string, any> = {
        username: formData.username,
        email: formData.email,
        role: formData.role,
        gateUsername: formData.gateUsername || null,
        isVerified: formData.isVerified,
        subscriptionTier: formData.subscriptionTier,
        portalAccess: formData.portalAccess,
      };
      if (formData.password) payload.password = formData.password;
      if (formData.phone) payload.phone = formData.phone;

      const res = await authenticatedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save user");
      }

      const createdUserId = data.data?.id;

      // If creating an artist, also create artist profile
      if (!editingUser && formData.role === "artist" && createdUserId) {
        try {
          await authenticatedFetch(`${API_BASE_URL}/api/artists`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: createdUserId,
              stage_name: formData.stageName,
              email: formData.email,
              genre: formData.genre || "Other",
              country_code: formData.country || "US",
              label_status: "independent",
            }),
          });
        } catch {
          console.warn("Artist profile creation failed (non-blocking)");
        }
      }

      // If creating a contractor, also create contractor profile
      if (!editingUser && formData.role === "contractor" && createdUserId) {
        try {
          await authenticatedFetch(`${API_BASE_URL}/api/contractors`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: formData.username,
              email: formData.email,
              specialization: formData.specialization || "General",
              hourlyRate: formData.hourlyRate
                ? parseFloat(formData.hourlyRate)
                : null,
              isAvailable: true,
            }),
          });
        } catch {
          console.warn("Contractor profile creation failed (non-blocking)");
        }
      }

      setSuccess(
        editingUser
          ? "User updated successfully"
          : `User created successfully${formData.role === "artist" ? " (+ artist profile)" : formData.role === "contractor" ? " (+ contractor profile)" : ""}`,
      );
      resetForm();
      fetchUsers(pagination.page);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to save user");
      setTimeout(() => setError(""), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSubmitting(true);
    try {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/users/${deleteConfirm.id}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to delete user");
      }
      setSuccess("User deleted successfully");
      setDeleteConfirm(null);
      fetchUsers(pagination.page);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
      setTimeout(() => setError(""), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      role: "user",
      gateUsername: "",
      isVerified: false,
      phone: "",
      subscriptionTier: "free",
      portalAccess: ["general"],
      stageName: "",
      genre: "",
      country: "",
      specialization: "",
      hourlyRate: "",
    });
    setEditingUser(null);
    setIsModalOpen(false);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      role: user.role,
      gateUsername: user.gateUsername || "",
      isVerified: user.isVerified,
      phone: "",
      subscriptionTier: user.subscriptionTier || "free",
      portalAccess: user.portalAccess || ["general"],
      stageName: "",
      genre: "",
      country: "",
      specialization: "",
      hourlyRate: "",
    });
    setIsModalOpen(true);
  };

  // -------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------

  const RoleBadge = ({ role }: { role: string }) => {
    const config = ROLE_CONFIG[role] || ROLE_CONFIG.user;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
      >
        {config.icon}
        {config.label}
      </span>
    );
  };

  const VerificationBadge = ({ verified }: { verified: boolean }) => (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        verified
          ? "bg-green-100 text-green-700"
          : "bg-yellow-100 text-yellow-700"
      }`}
    >
      {verified ? (
        <MailCheck className="h-3 w-3" />
      ) : (
        <MailX className="h-3 w-3" />
      )}
      {verified ? "Verified" : "Unverified"}
    </span>
  );

  const StatusBadge = ({ active }: { active: boolean }) => (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
      }`}
    >
      {active ? (
        <UserCheck className="h-3 w-3" />
      ) : (
        <UserX className="h-3 w-3" />
      )}
      {active ? "Active" : "Locked"}
    </span>
  );

  // -------------------------------------------------------------------
  // JSX
  // -------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          <p className="text-sm text-slate-500 mt-1">
            {pagination.total} total user{pagination.total !== 1 ? "s" : ""} —
            Create & manage all account types
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchUsers(pagination.page)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            New User
          </button>
        </div>
      </div>

      {/* ===== Alerts ===== */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <Check size={18} />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* ===== Search & Filters ===== */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search by username or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-[160px]"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_CONFIG[r].label}
            </option>
          ))}
        </select>
      </div>

      {/* ===== Table ===== */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">
                  User
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">
                  Role
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">
                  GeoAdmin
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">
                  Email Verified
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">
                  Tier
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">
                  Joined
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                    <p className="text-slate-400 mt-2 text-sm">
                      Loading users…
                    </p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* User info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                          {(user.username || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {user.username}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>

                    {/* GeoAdmin */}
                    <td className="px-4 py-3">
                      {user.gateUsername ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          <Shield className="h-3 w-3" />
                          {user.gateUsername}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge active={user.isActive} />
                    </td>

                    {/* Verified */}
                    <td className="px-4 py-3">
                      <VerificationBadge verified={user.isVerified} />
                    </td>

                    {/* Subscription */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-600 capitalize">
                        {user.subscriptionTier || "free"}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="View"
                          onClick={() => setViewingUser(user)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          title="Edit"
                          onClick={() => openEdit(user)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => setDeleteConfirm(user)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ===== Pagination ===== */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.totalPages} (
              {pagination.total} users)
            </p>
            <div className="flex gap-1">
              <button
                disabled={!pagination.hasPrev}
                onClick={() => fetchUsers(pagination.page - 1)}
                className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={!pagination.hasNext}
                onClick={() => fetchUsers(pagination.page + 1)}
                className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================
          VIEW USER MODAL
          ================================================================ */}
      {viewingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">User Details</h3>
              <button
                onClick={() => setViewingUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                  {(viewingUser.username || "?")[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="text-lg font-semibold">
                    {viewingUser.username}
                  </h4>
                  <p className="text-sm text-slate-500">{viewingUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Role</p>
                  <RoleBadge role={viewingUser.role} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">GeoAdmin Access</p>
                  {viewingUser.gateUsername ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                      <Shield className="h-3 w-3" />
                      {viewingUser.gateUsername}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">None</span>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Status</p>
                  <StatusBadge active={viewingUser.isActive} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Email Verified</p>
                  <VerificationBadge verified={viewingUser.isVerified} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Subscription</p>
                  <span className="text-sm capitalize">
                    {viewingUser.subscriptionTier || "free"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Joined</p>
                  <span className="text-sm">
                    {viewingUser.createdAt
                      ? new Date(viewingUser.createdAt).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Failed Logins</p>
                  <span className="text-sm">
                    {viewingUser.failedLoginAttempts || 0}
                  </span>
                </div>
              </div>
              {viewingUser.isLocked && viewingUser.lockedUntil && (
                <div className="mt-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                  🔒 Account locked until{" "}
                  {new Date(viewingUser.lockedUntil).toLocaleString()}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => {
                  const u = viewingUser;
                  setViewingUser(null);
                  openEdit(u);
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit User
              </button>
              <button
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          CREATE / EDIT USER MODAL
          ================================================================ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUser ? "Edit User" : "Create New User"}
              </h3>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Account Type (role) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Account Type *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_CONFIG[r].label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  {formData.role === "artist" &&
                    "Will also create an artist profile automatically"}
                  {formData.role === "contractor" &&
                    "Will also create a contractor profile automatically"}
                  {formData.role === "business_owner" &&
                    "Business owner with directory listing access"}
                  {formData.role === "superuser" &&
                    "⚠️ Full system access — use with caution"}
                </p>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="e.g. john_doe"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className={`w-full px-3 py-2 pr-9 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                      formData.email && !isValidEmail(formData.email)
                        ? "border-red-400"
                        : formData.email && isValidEmail(formData.email)
                          ? "border-green-400"
                          : "border-slate-300"
                    }`}
                    placeholder="user@example.com"
                  />
                  {formData.email && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {isValidEmail(formData.email) ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Phone{" "}
                  <span className="text-xs text-slate-400">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                    formData.phone && !isValidPhone(formData.phone)
                      ? "border-red-400"
                      : "border-slate-300"
                  }`}
                  placeholder="+1 555 123 4567"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password{editingUser ? " (leave blank to keep)" : " *"}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="••••••••"
                />
                {formData.password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            passwordStrengthLevel(formData.password) >= level
                              ? passwordStrengthLevel(formData.password) === 1
                                ? "bg-red-400"
                                : passwordStrengthLevel(formData.password) === 2
                                  ? "bg-amber-400"
                                  : "bg-green-500"
                              : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-1 gap-0.5">
                      <p
                        className={`text-xs flex items-center gap-1 ${checkPasswordLength(formData.password) ? "text-green-600" : "text-slate-400"}`}
                      >
                        {checkPasswordLength(formData.password) ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        At least 8 characters
                      </p>
                      <p
                        className={`text-xs flex items-center gap-1 ${checkPasswordUpper(formData.password) ? "text-green-600" : "text-slate-400"}`}
                      >
                        {checkPasswordUpper(formData.password) ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        One uppercase letter (A–Z)
                      </p>
                      <p
                        className={`text-xs flex items-center gap-1 ${checkPasswordNumber(formData.password) ? "text-green-600" : "text-slate-400"}`}
                      >
                        {checkPasswordNumber(formData.password) ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        One number (0–9)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Subscription Tier */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Subscription Tier
                </label>
                <select
                  value={formData.subscriptionTier}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subscriptionTier: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {TIER_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Portal Access */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Portal Access
                </label>
                <div className="flex flex-wrap gap-2">
                  {PORTAL_OPTIONS.map((portal) => (
                    <button
                      key={portal}
                      type="button"
                      onClick={() => {
                        const current = formData.portalAccess;
                        const next = current.includes(portal)
                          ? current.filter((p) => p !== portal)
                          : [...current, portal];
                        setFormData({
                          ...formData,
                          portalAccess: next.length > 0 ? next : ["general"],
                        });
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        formData.portalAccess.includes(portal)
                          ? "bg-blue-100 border-blue-300 text-blue-700"
                          : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                      }`}
                    >
                      {portal}
                    </button>
                  ))}
                </div>
              </div>

              {/* Artist-specific fields */}
              {formData.role === "artist" && !editingUser && (
                <div className="p-4 bg-fuchsia-50 border border-fuchsia-200 rounded-lg space-y-3">
                  <p className="text-sm font-medium text-fuchsia-700 flex items-center gap-2">
                    <Music className="h-4 w-4" /> Artist Profile
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Stage Name *
                    </label>
                    <input
                      type="text"
                      value={formData.stageName}
                      onChange={(e) =>
                        setFormData({ ...formData, stageName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      placeholder="Artist / stage name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Genre
                      </label>
                      <select
                        value={formData.genre}
                        onChange={(e) =>
                          setFormData({ ...formData, genre: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="">Select</option>
                        {GENRES.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) =>
                          setFormData({ ...formData, country: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        placeholder="e.g. US, FR"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Contractor-specific fields */}
              {formData.role === "contractor" && !editingUser && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
                  <p className="text-sm font-medium text-orange-700 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> Contractor Profile
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Specialization
                    </label>
                    <select
                      value={formData.specialization}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          specialization: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                      <option value="">Select</option>
                      {SPECIALIZATIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Hourly Rate (USD){" "}
                      <span className="text-slate-400">(optional)</span>
                    </label>
                    <input
                      type="number"
                      value={formData.hourlyRate}
                      onChange={(e) =>
                        setFormData({ ...formData, hourlyRate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      placeholder="e.g. 45"
                    />
                  </div>
                </div>
              )}

              {/* GeoAdmin Gate Username */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  GeoAdmin Username
                  <span className="text-xs text-slate-400 ml-1">
                    (optional — grants gate access)
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.gateUsername}
                  onChange={(e) =>
                    setFormData({ ...formData, gateUsername: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="e.g. admin_001"
                />
              </div>

              {/* Email Verified Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">
                  Email Verified
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.isVerified}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      isVerified: !formData.isVerified,
                    })
                  }
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    formData.isVerified ? "bg-green-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      formData.isVerified ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Error in modal */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {editingUser ? "Update User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================
          DELETE CONFIRMATION MODAL
          ================================================================ */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete User</h3>
              <p className="text-sm text-slate-500">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-700">
                  {deleteConfirm.username}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
