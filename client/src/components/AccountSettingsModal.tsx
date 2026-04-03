import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  User,
  Lock,
  Bell,
  Palette,
  Globe,
  Shield,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Check,
  ArrowLeft,
  Trash2,
  Mail,
  Clock,
} from "lucide-react";

const API_BASE_URL = "";

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface AccountSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "account" | "preferences";
  onBackToDashboard?: () => void;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  isVerified: boolean;
  subscriptionTier: string;
  subscriptionStatus: string;
  oauthProvider: string | null;
  createdAt: string;
}

interface UserPreferences {
  theme: string;
  language: string;
  timezone: string;
  email_notifications: boolean;
  push_notifications: boolean;
  marketing_emails: boolean;
  weekly_digest: boolean;
  security_alerts: boolean;
  login_notifications: boolean;
  compact_view: boolean;
  show_online_status: boolean;
  auto_save: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  language: "en",
  timezone: "auto",
  email_notifications: true,
  push_notifications: true,
  marketing_emails: false,
  weekly_digest: true,
  security_alerts: true,
  login_notifications: true,
  compact_view: false,
  show_online_status: true,
  auto_save: true,
};

const TIMEZONES = [
  { value: "auto", label: "Auto-detect" },
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Toronto", label: "Toronto (EST)" },
  { value: "America/Montreal", label: "Montreal (EST)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Africa/Lagos", label: "Lagos (WAT)" },
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST)" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
  { value: "ar", label: "العربية" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
];

// ─── HELPER: authenticated fetch matching dashboard pattern ──────────────────

async function authFetch(url: string, options: RequestInit = {}) {
  const token =
    localStorage.getItem("auth_token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
    credentials: "include",
  });
}

// ─── COMPONENT ──────────────────────────────────────────────────────────────

export function AccountSettingsModal({
  open,
  onOpenChange,
  defaultTab = "account",
  onBackToDashboard,
}: AccountSettingsModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);

  // ── Profile state ──
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editUsername, setEditUsername] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Password state ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // ── Preferences state ──
  const [preferences, setPreferences] =
    useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsChanged, setPrefsChanged] = useState(false);

  // Reset active tab when modal re-opens with a different defaultTab
  useEffect(() => {
    if (open) setActiveTab(defaultTab);
  }, [open, defaultTab]);

  // ── Fetch profile ──
  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await authFetch("/auth/account/profile");
      const data = await res.json();
      if (res.ok && data.profile) {
        setProfile(data.profile);
        setEditUsername(data.profile.username || "");
      }
    } catch (err) {
      console.error("[AccountSettings] Profile fetch error:", err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // ── Fetch preferences ──
  const fetchPreferences = useCallback(async () => {
    setPrefsLoading(true);
    try {
      const res = await authFetch("/auth/account/preferences");
      if (res.ok) {
        const data = await res.json();
        setPreferences({ ...DEFAULT_PREFERENCES, ...data.preferences });
      }
    } catch (err) {
      console.error("[AccountSettings] Preferences fetch error:", err);
    } finally {
      setPrefsLoading(false);
    }
  }, []);

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      fetchProfile();
      fetchPreferences();
    }
  }, [open, fetchProfile, fetchPreferences]);

  // ── Save profile ──
  const handleSaveProfile = async () => {
    if (!editUsername.trim()) {
      toast({
        title: "Error",
        description: "Username cannot be empty",
        variant: "destructive",
      });
      return;
    }
    setSavingProfile(true);
    try {
      const res = await authFetch("/auth/account/profile", {
        method: "PUT",
        body: JSON.stringify({ username: editUsername.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: "✅ Profile Updated",
          description: "Your display name has been saved.",
        });
        fetchProfile();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update profile",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change password ──
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive",
      });
      return;
    }
    setChangingPassword(true);
    try {
      const res = await authFetch("/auth/account/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: "🔒 Password Changed",
          description: "Your password has been updated successfully.",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to change password",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // ── Save preferences ──
  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      const res = await authFetch("/auth/account/preferences", {
        method: "PUT",
        body: JSON.stringify({ preferences }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: "✅ Preferences Saved",
          description: "Your preferences have been updated.",
        });
        setPrefsChanged(false);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to save preferences",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingPrefs(false);
    }
  };

  // ── Delete account ──
  const handleDeleteAccount = async () => {
    try {
      const res = await authFetch("/auth/account", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: "Account Deleted",
          description: "Your account has been removed. Redirecting...",
        });
        setTimeout(() => {
          localStorage.clear();
          window.location.href = "/";
        }, 2000);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to delete account",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Network error",
        variant: "destructive",
      });
    }
  };

  // ── Update preference helper ──
  const updatePref = (key: keyof UserPreferences, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setPrefsChanged(true);
  };

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      superuser: "Super Admin",
      admin: "Administrator",
      moderator: "Moderator",
      business_owner: "Business Owner",
      user: "Member",
    };
    return labels[role] || role;
  };

  const tierLabel = (tier: string) => {
    const labels: Record<string, string> = {
      free: "Free",
      essential: "Essential",
      verified: "Verified",
      max: "Max",
      enterprise: "Enterprise",
    };
    return labels[tier] || tier;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto bg-slate-900 border-slate-700 text-white p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Settings className="h-5 w-5 text-emerald-400" />
              Account & Preferences
            </DialogTitle>
            {onBackToDashboard && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onBackToDashboard();
                }}
                className="text-slate-400 hover:text-white gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "account" | "preferences")}
          className="px-6 pb-6"
        >
          <TabsList className="grid w-full grid-cols-2 bg-slate-800 mb-4">
            <TabsTrigger
              value="account"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              <User className="h-4 w-4 mr-2" />
              Account Settings
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              <Bell className="h-4 w-4 mr-2" />
              Preferences
            </TabsTrigger>
          </TabsList>

          {/* ════════════════════════════════════════════════════════════════════
              TAB 1: ACCOUNT SETTINGS
              ════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="account" className="space-y-4 mt-0">
            {profileLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                <span className="ml-2 text-slate-400">Loading profile...</span>
              </div>
            ) : profile ? (
              <>
                {/* Profile Info Card */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4 text-emerald-400" />
                      Profile Information
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Update your display name and view account details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Avatar + Role badges */}
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                        {(profile.username || profile.email || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white truncate">
                            {profile.username}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-emerald-400 border-emerald-400/30 text-[10px]"
                          >
                            {roleLabel(profile.role || "user")}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-cyan-400 border-cyan-400/30 text-[10px]"
                          >
                            {tierLabel(profile.subscriptionTier || "free")}
                          </Badge>
                          {profile.isVerified && (
                            <Badge
                              variant="outline"
                              className="text-green-400 border-green-400/30 text-[10px]"
                            >
                              <Check className="h-3 w-3 mr-0.5" /> Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                          <Mail className="h-3 w-3" />
                          {profile.email}
                        </p>
                        {profile.createdAt && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            Member since{" "}
                            {new Date(profile.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <Separator className="bg-slate-700" />

                    {/* Edit username */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="username"
                        className="text-sm text-slate-300"
                      >
                        Display Name
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="username"
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          className="bg-slate-700/50 border-slate-600 text-white flex-1"
                          placeholder="Your display name"
                        />
                        <Button
                          onClick={handleSaveProfile}
                          disabled={
                            savingProfile || editUsername === profile.username
                          }
                          className="bg-emerald-600 hover:bg-emerald-500 gap-1 shrink-0"
                          size="sm"
                        >
                          {savingProfile ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>

                    {/* Email (read-only) */}
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-300">
                        Email Address
                      </Label>
                      <Input
                        value={profile.email}
                        disabled
                        className="bg-slate-700/30 border-slate-600/50 text-slate-400"
                      />
                      <p className="text-xs text-slate-500">
                        Contact support to change your email address
                      </p>
                    </div>

                    {/* OAuth indicator */}
                    {profile.oauthProvider && (
                      <div className="flex items-center gap-2 p-2 rounded bg-slate-700/30 border border-slate-600/30">
                        <Shield className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-slate-300">
                          Signed in via{" "}
                          <strong className="text-blue-400 capitalize">
                            {profile.oauthProvider}
                          </strong>
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Change Password Card */}
                {!profile.oauthProvider && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lock className="h-4 w-4 text-amber-400" />
                        Change Password
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Update your password to keep your account secure
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Current password */}
                      <div className="space-y-1">
                        <Label
                          htmlFor="currentPw"
                          className="text-sm text-slate-300"
                        >
                          Current Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="currentPw"
                            type={showCurrentPw ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="bg-slate-700/50 border-slate-600 text-white pr-10"
                            placeholder="Enter current password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPw(!showCurrentPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showCurrentPw ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      {/* New password */}
                      <div className="space-y-1">
                        <Label
                          htmlFor="newPw"
                          className="text-sm text-slate-300"
                        >
                          New Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="newPw"
                            type={showNewPw ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-slate-700/50 border-slate-600 text-white pr-10"
                            placeholder="At least 8 characters"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPw(!showNewPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showNewPw ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {newPassword.length > 0 && newPassword.length < 8 && (
                          <p className="text-xs text-red-400">
                            Password must be at least 8 characters
                          </p>
                        )}
                      </div>
                      {/* Confirm password */}
                      <div className="space-y-1">
                        <Label
                          htmlFor="confirmPw"
                          className="text-sm text-slate-300"
                        >
                          Confirm New Password
                        </Label>
                        <Input
                          id="confirmPw"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="bg-slate-700/50 border-slate-600 text-white"
                          placeholder="Re-enter new password"
                        />
                        {confirmPassword && newPassword !== confirmPassword && (
                          <p className="text-xs text-red-400">
                            Passwords don't match
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={handleChangePassword}
                        disabled={
                          changingPassword ||
                          !currentPassword ||
                          !newPassword ||
                          newPassword !== confirmPassword
                        }
                        className="bg-amber-600 hover:bg-amber-500 gap-1 w-full"
                      >
                        {changingPassword ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                        Change Password
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Danger Zone */}
                <Card className="bg-red-950/20 border-red-900/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-red-400">
                      <Trash2 className="h-4 w-4" />
                      Danger Zone
                    </CardTitle>
                    <CardDescription className="text-red-400/60">
                      Irreversible actions — proceed with caution
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-900 border-slate-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-red-400">
                            Delete Account Permanently?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            This action cannot be undone. All your data,
                            businesses, and settings will be permanently removed
                            from Verso Air.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            className="bg-red-600 hover:bg-red-500"
                          >
                            Yes, Delete My Account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p>Unable to load profile. Please try again.</p>
                <Button
                  onClick={fetchProfile}
                  className="mt-3"
                  variant="outline"
                  size="sm"
                >
                  Retry
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════════════
              TAB 2: PREFERENCES
              ════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="preferences" className="space-y-4 mt-0">
            {prefsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                <span className="ml-2 text-slate-400">
                  Loading preferences...
                </span>
              </div>
            ) : (
              <>
                {/* Appearance */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Palette className="h-4 w-4 text-purple-400" />
                      Appearance
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Customize the look and feel of your experience
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Theme */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm text-slate-200">Theme</Label>
                        <p className="text-xs text-slate-500">
                          Choose your preferred color scheme
                        </p>
                      </div>
                      <Select
                        value={preferences.theme}
                        onValueChange={(v) => updatePref("theme", v)}
                      >
                        <SelectTrigger className="w-36 bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Compact view */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm text-slate-200">
                          Compact View
                        </Label>
                        <p className="text-xs text-slate-500">
                          Reduce spacing for denser layouts
                        </p>
                      </div>
                      <Switch
                        checked={preferences.compact_view}
                        onCheckedChange={(v) => updatePref("compact_view", v)}
                      />
                    </div>

                    {/* Show online status */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm text-slate-200">
                          Online Status
                        </Label>
                        <p className="text-xs text-slate-500">
                          Show when you're active on the platform
                        </p>
                      </div>
                      <Switch
                        checked={preferences.show_online_status}
                        onCheckedChange={(v) =>
                          updatePref("show_online_status", v)
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Language & Region */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-400" />
                      Language & Region
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Set your preferred language and timezone
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Language */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm text-slate-200">
                          Language
                        </Label>
                        <p className="text-xs text-slate-500">
                          Interface display language
                        </p>
                      </div>
                      <Select
                        value={preferences.language}
                        onValueChange={(v) => updatePref("language", v)}
                      >
                        <SelectTrigger className="w-36 bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {LANGUAGES.map((l) => (
                            <SelectItem key={l.value} value={l.value}>
                              {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Timezone */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm text-slate-200">
                          Timezone
                        </Label>
                        <p className="text-xs text-slate-500">
                          Used for scheduling and notifications
                        </p>
                      </div>
                      <Select
                        value={preferences.timezone}
                        onValueChange={(v) => updatePref("timezone", v)}
                      >
                        <SelectTrigger className="w-44 bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Notifications */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Bell className="h-4 w-4 text-amber-400" />
                      Notifications
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Control what notifications you receive
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        key: "email_notifications" as const,
                        label: "Email Notifications",
                        desc: "Receive important updates via email",
                      },
                      {
                        key: "push_notifications" as const,
                        label: "Push Notifications",
                        desc: "Browser push notifications for real-time alerts",
                      },
                      {
                        key: "marketing_emails" as const,
                        label: "Marketing Emails",
                        desc: "Product news, tips, and promotional offers",
                      },
                      {
                        key: "weekly_digest" as const,
                        label: "Weekly Digest",
                        desc: "Summary of activity and insights every week",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <Label className="text-sm text-slate-200">
                            {item.label}
                          </Label>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                        <Switch
                          checked={preferences[item.key]}
                          onCheckedChange={(v) => updatePref(item.key, v)}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Security Notifications */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-400" />
                      Security
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Security-related notification preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        key: "security_alerts" as const,
                        label: "Security Alerts",
                        desc: "Notify on suspicious activity or login from new devices",
                      },
                      {
                        key: "login_notifications" as const,
                        label: "Login Notifications",
                        desc: "Get notified every time you sign in",
                      },
                      {
                        key: "auto_save" as const,
                        label: "Auto-Save",
                        desc: "Automatically save form progress and drafts",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <Label className="text-sm text-slate-200">
                            {item.label}
                          </Label>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                        <Switch
                          checked={preferences[item.key]}
                          onCheckedChange={(v) => updatePref(item.key, v)}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Save Preferences Button */}
                <div className="flex justify-end gap-2 pt-2">
                  {prefsChanged && (
                    <p className="text-xs text-amber-400 self-center mr-auto">
                      ⚠ You have unsaved changes
                    </p>
                  )}
                  <Button
                    onClick={handleSavePreferences}
                    disabled={savingPrefs || !prefsChanged}
                    className="bg-emerald-600 hover:bg-emerald-500 gap-1"
                  >
                    {savingPrefs ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Preferences
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
