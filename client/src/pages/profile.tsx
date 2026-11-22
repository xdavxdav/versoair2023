/**
 * vxpp Personal Profile (/profile and /profile/settings)
 *
 * Separates public personal identity (cover photo, avatar, headline, bio,
 * location, website, interests, posts) from private account settings (email,
 * display-name password check, username, billing, portals, sign-out).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  AlertCircle,
  Briefcase,
  Camera,
  Check,
  Crown,
  Edit3,
  ExternalLink,
  Globe,
  Loader2,
  LogOut,
  MapPin,
  Music,
  Newspaper,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import PortalSelector from "@/components/PortalSelector";
import VxppGuestIntro from "@/components/vxpp/VxppGuestIntro";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useLanguage } from "@/components/LanguageSwitcher";
import { useToast } from "@/hooks/use-toast";
import { authenticatedFetch } from "@/lib/auth";
import { invalidateAuthSessionCache } from "@/lib/session-fetch";

type ProfileTab = "posts" | "about" | "portals" | "settings";

interface PersonalProfileData {
  id: number;
  username: string;
  email: string;
  displayName: string;
  role: string;
  accountType: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  joinedAt: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  profession: string | null;
  company: string | null;
  interests: string[];
  privacyLevel: "public" | "friends" | "private";
  stats: {
    followerCount: number;
    followingCount: number;
    postCount: number;
  };
}

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export default function ProfilePage() {
  const { user, logout, restoreAuth } = useAuthContext();
  const { capabilities } = useCapabilities();
  const { currentLang } = useLanguage();
  const { toast } = useToast();
  const [location, navigate] = useLocation();

  const isFr = currentLang === "fr";
  const isEs = currentLang === "es";
  const tr = (en: string, fr: string, es: string) =>
    isFr ? fr : isEs ? es : en;

  const isSettingsPath = location.replace(/\/+$/, "") === "/profile/settings";
  const [activeTab, setActiveTab] = useState<ProfileTab>(
    isSettingsPath ? "settings" : "posts",
  );

  useEffect(() => {
    if (isSettingsPath) setActiveTab("settings");
  }, [isSettingsPath]);

  const [profile, setProfile] = useState<PersonalProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [communities, setCommunities] = useState<any[]>([]);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [formHeadline, setFormHeadline] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formProfession, setFormProfession] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formInterests, setFormInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [formPrivacy, setFormPrivacy] = useState<"public" | "friends" | "private">("public");

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [accountError, setAccountError] = useState("");

  const loadMyProfile = useCallback(async () => {
    if (!user?.id) {
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    setLoadError(null);
    try {
      const res = await authenticatedFetch("/api/profile/me");
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json.profile) {
        throw new Error(json?.message || "Could not load your profile.");
      }
      setProfile(json.profile);
      setAvatarFailed(false);
      setCoverFailed(false);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Could not load your profile.",
      );
    } finally {
      setLoadingProfile(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadMyProfile();
  }, [loadMyProfile]);

  const loadMyPosts = useCallback(async () => {
    if (!user?.id) return;
    setPostsLoading(true);
    setPostsError(null);
    try {
      const res = await authenticatedFetch(`/api/social/users/${user.id}/posts?limit=20`);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Could not load posts.");
      setPosts(Array.isArray(json?.data) ? json.data : []);
    } catch (err) {
      setPostsError(err instanceof Error ? err.message : "Could not load posts.");
    } finally {
      setPostsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    void loadMyPosts();
    authenticatedFetch("/api/communities/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (Array.isArray(json?.data?.memberships)) {
          setCommunities(json.data.memberships);
        }
      })
      .catch(() => {});
  }, [user?.id, loadMyPosts]);

  const openProfileEditor = () => {
    setFormHeadline(profile?.headline || "");
    setFormBio(profile?.bio || "");
    setFormLocation(profile?.location || "");
    setFormWebsite(profile?.website || "");
    setFormProfession(profile?.profession || "");
    setFormCompany(profile?.company || "");
    setFormInterests(profile?.interests || []);
    setFormPrivacy(profile?.privacyLevel || "public");
    setInterestInput("");
    setEditError(null);
    setIsEditingProfile(true);
  };

  const handleUploadImage = async (kind: "avatar" | "cover", file: File) => {
    setMediaError(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setMediaError(
        tr(
          "Image is too large. Maximum size is 5 MB.",
          "L'image est trop volumineuse (max 5 Mo).",
          "La imagen supera el límite de 5 MB.",
        ),
      );
      return;
    }
    const setBusy = kind === "avatar" ? setUploadingAvatar : setUploadingCover;
    setBusy(true);
    try {
      const form = new FormData();
      form.append(kind, file);
      const res = await authenticatedFetch(`/api/profile/${kind}`, {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || `Failed to upload ${kind}.`);
      }
      if (kind === "avatar") {
        setAvatarFailed(false);
        setProfile((prev) =>
          prev ? { ...prev, avatarUrl: json.avatarUrl } : prev,
        );
      } else {
        setCoverFailed(false);
        setProfile((prev) =>
          prev ? { ...prev, coverImageUrl: json.coverImageUrl } : prev,
        );
      }
      invalidateAuthSessionCache();
      await restoreAuth();
      toast({
        title:
          kind === "avatar"
            ? tr("Profile picture saved", "Photo de profil enregistrée", "Foto de perfil guardada")
            : tr("Cover photo saved", "Photo de couverture enregistrée", "Foto de portada guardada"),
        description: tr(
          "Your change is stored and synced across devices.",
          "Votre image est enregistrée et synchronisée sur tous vos appareils.",
          "Tu cambio se guardó y sincronizó en todos tus dispositivos.",
        ),
      });
    } catch (err) {
      setMediaError(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveImage = async (kind: "avatar" | "cover") => {
    setMediaError(null);
    const setBusy = kind === "avatar" ? setUploadingAvatar : setUploadingCover;
    setBusy(true);
    try {
      const res = await authenticatedFetch(`/api/profile/${kind}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || `Could not remove ${kind}.`);
      }
      setProfile((prev) =>
        prev
          ? kind === "avatar"
            ? { ...prev, avatarUrl: null }
            : { ...prev, coverImageUrl: null }
          : prev,
      );
      invalidateAuthSessionCache();
      await restoreAuth();
      toast({
        title:
          kind === "avatar"
            ? tr("Profile picture removed", "Photo de profil retirée", "Foto de perfil eliminada")
            : tr("Cover photo removed", "Couverture retirée", "Portada eliminada"),
      });
    } catch (err) {
      setMediaError(
        err instanceof Error ? err.message : "Could not remove image.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfileDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setEditError(null);
    try {
      const res = await authenticatedFetch("/api/profile/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: formHeadline.trim() || null,
          bio: formBio.trim() || null,
          location: formLocation.trim() || null,
          website: formWebsite.trim() || null,
          profession: formProfession.trim() || null,
          company: formCompany.trim() || null,
          interests: formInterests,
          privacyLevel: formPrivacy,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Could not save profile changes.");
      }
      setProfile((prev) => (prev ? { ...prev, ...json.profile } : prev));
      invalidateAuthSessionCache();
      await restoreAuth();
      setIsEditingProfile(false);
      toast({
        title: tr("Profile updated", "Profil mis à jour", "Perfil actualizado"),
      });
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Could not save profile changes.",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const addInterest = () => {
    const clean = interestInput.trim().slice(0, 32);
    if (!clean || formInterests.includes(clean) || formInterests.length >= 12) return;
    setFormInterests([...formInterests, clean]);
    setInterestInput("");
  };

  const handleSaveDisplayName = async () => {
    if (!editName.trim() || editName.trim().length < 2) return;
    setAccountError("");
    setIsSavingName(true);
    try {
      const res = await authenticatedFetch("/auth/account/set-display-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editName.trim(),
          ...(currentPassword ? { currentPassword } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAccountError(data?.message || "Could not update display name.");
        return;
      }
      setIsEditingName(false);
      setCurrentPassword("");
      invalidateAuthSessionCache();
      await restoreAuth();
      await loadMyProfile();
      toast({ title: tr("Display name updated", "Nom mis à jour", "Nombre actualizado") });
    } catch {
      setAccountError("Network error. Please try again.");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSaveUsername = async () => {
    const username = editUsername.trim();
    if (username.length < 2) return;
    setAccountError("");
    setIsSavingUsername(true);
    try {
      const res = await authenticatedFetch("/auth/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAccountError(data?.message || "Could not update username.");
        return;
      }
      setIsEditingUsername(false);
      invalidateAuthSessionCache();
      await restoreAuth();
      await loadMyProfile();
      toast({ title: tr("Username updated", "Identifiant mis à jour", "Usuario actualizado") });
    } catch {
      setAccountError("Network error. Please try again.");
    } finally {
      setIsSavingUsername(false);
    }
  };

  if (!user) {
    return (
      <VxppGuestIntro
        section="profile"
        onSignIn={() => navigate("/auth/signin?redirect=/profile")}
        onSignUp={() => navigate("/auth/signin?mode=register&redirect=/profile")}
      />
    );
  }

  const displayName =
    profile?.displayName ||
    user.displayName ||
    user.name ||
    user.username ||
    user.email?.split("@")[0] ||
    "Member";
  const displayUsername = profile?.username || user.username || "member";
  const displayRole = profile?.role || user.role || "user";
  const displayTier =
    profile?.subscriptionTier || user.subscriptionTier || user.subscription_tier || "free";
  const isAdmin =
    Boolean(user.isAdmin) ||
    ["admin", "superuser", "moderator"].includes(displayRole);
  const hasArtist = Boolean(user.hasArtistProfile || capabilities?.hasArtistProfile);
  const initials =
    displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "VA";

  const avatarUrl =
    !avatarFailed ? (profile?.avatarUrl || user.avatarUrl || user.avatar || null) : null;
  const coverImageUrl =
    !coverFailed ? (profile?.coverImageUrl || user.coverImageUrl || null) : null;

  return (
    <div className="max-w-4xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      <input
        ref={avatarInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="hidden"
        aria-label="Upload profile picture"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleUploadImage("avatar", file);
        }}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="hidden"
        aria-label="Upload cover photo"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleUploadImage("cover", file);
        }}
      />

      {loadError && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 flex items-center justify-between gap-3 text-sm text-red-800 dark:text-red-200"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {loadError}
          </span>
          <button
            type="button"
            onClick={() => void loadMyProfile()}
            className="inline-flex items-center gap-1 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {tr("Retry", "Réessayer", "Reintentar")}
          </button>
        </div>
      )}

      {mediaError && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-3.5 flex items-center justify-between gap-3 text-sm text-amber-950 dark:text-amber-100"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {mediaError}
          </span>
          <button
            type="button"
            onClick={() => setMediaError(null)}
            aria-label="Dismiss error"
            className="p-1 rounded-lg hover:bg-amber-200/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Profile Hero Card ── */}
      <section className="rounded-3xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="relative h-40 sm:h-52 md:h-60 bg-gradient-to-br from-stone-900 via-amber-950 to-slate-900 overflow-hidden">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={`${displayName} cover`}
              onError={() => setCoverFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(217,119,6,0.35),transparent_55%),radial-gradient(circle_at_80%_75%,rgba(14,116,144,0.22),transparent_50%)]" />
          )}

          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              type="button"
              disabled={uploadingCover}
              onClick={() => coverInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950/75 hover:bg-slate-950/90 text-white backdrop-blur-md border border-white/15 px-3 py-2 text-xs font-semibold min-h-[38px] transition-colors disabled:opacity-60"
            >
              {uploadingCover ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
              {coverImageUrl
                ? tr("Change cover", "Changer couverture", "Cambiar portada")
                : tr("Add cover photo", "Ajouter couverture", "Añadir portada")}
            </button>
            {coverImageUrl && (
              <button
                type="button"
                disabled={uploadingCover}
                onClick={() => void handleRemoveImage("cover")}
                aria-label={tr("Remove cover photo", "Retirer la couverture", "Eliminar portada")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950/75 hover:bg-red-700 text-white backdrop-blur-md border border-white/15 transition-colors disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="px-5 sm:px-7 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
            <div className="relative inline-flex items-end gap-3 -mt-12 sm:-mt-16">
              <div
                className="relative h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 border-white dark:border-slate-900 bg-gradient-to-br from-amber-600 to-amber-800 shadow-md overflow-hidden flex items-center justify-center text-white text-2xl sm:text-3xl font-extrabold shrink-0 notranslate"
                translate="no"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${displayName} avatar`}
                    onError={() => setAvatarFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="flex items-center gap-1.5 pb-1">
                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  aria-label={tr("Upload profile picture", "Changer la photo de profil", "Cambiar foto de perfil")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-stone-100 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 min-h-[36px] shadow-sm disabled:opacity-60"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  {tr("Photo", "Photo", "Foto")}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={() => void handleRemoveImage("avatar")}
                    aria-label={tr("Remove profile picture", "Retirer la photo", "Eliminar foto")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 dark:border-slate-700 text-slate-500 hover:text-red-600 hover:border-red-300 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-3">
              <button
                type="button"
                onClick={openProfileEditor}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 min-h-[40px] whitespace-nowrap transition-colors"
              >
                <Edit3 className="h-4 w-4 shrink-0" />
                {tr("Edit Profile", "Modifier le profil", "Editar perfil")}
              </button>
              <Link
                href={`/user/${user.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold px-3.5 py-2 min-h-[40px] whitespace-nowrap transition-colors"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                {tr("Public View", "Vue publique", "Vista pública")}
              </Link>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold px-3.5 py-2 min-h-[40px] whitespace-nowrap transition-colors"
              >
                <Settings className="h-4 w-4 shrink-0" />
                {tr("Settings", "Paramètres", "Ajustes")}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white notranslate" translate="no">
                  {displayName}
                </h1>
                <span className="text-sm text-slate-500 dark:text-slate-400 notranslate" translate="no">
                  @{displayUsername}
                </span>
              </div>
              {profile?.headline && (
                <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-200 mt-0.5">
                  {profile.headline}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                {isAdmin ? <Shield className="h-3.5 w-3.5 text-amber-600" /> : <User className="h-3.5 w-3.5" />}
                {isAdmin ? (displayRole === "superuser" ? "Superuser" : "Admin") : displayRole === "artist" ? "Artist" : "Member"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-600/10 border border-amber-600/25 px-3 py-1 text-xs font-semibold text-amber-900 dark:text-amber-300 capitalize">
                <Crown className="h-3.5 w-3.5" />
                {displayTier}
              </span>
              {hasArtist && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-600/10 border border-purple-500/25 px-3 py-1 text-xs font-semibold text-purple-800 dark:text-purple-300">
                  <Music className="h-3.5 w-3.5" />
                  Artist
                </span>
              )}
            </div>

            {profile?.bio && (
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl whitespace-pre-line">
                {profile.bio}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {(profile?.profession || profile?.company) && (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  {[profile.profession, profile.company].filter(Boolean).join(" · ")}
                </span>
              )}
              {profile?.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  {profile.location}
                </span>
              )}
              {profile?.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-amber-800 dark:text-amber-300 hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  {profile.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>

            {profile?.interests && profile.interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {profile.interests.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-6 pt-2 border-t border-stone-100 dark:border-slate-800 tabular-nums">
              <div>
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {loadingProfile ? "…" : (profile?.stats.followerCount ?? 0)}
                </span>{" "}
                <span className="text-xs text-slate-500">
                  {tr("Followers", "Abonnés", "Seguidores")}
                </span>
              </div>
              <div>
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {loadingProfile ? "…" : (profile?.stats.followingCount ?? 0)}
                </span>{" "}
                <span className="text-xs text-slate-500">
                  {tr("Following", "Abonnements", "Siguiendo")}
                </span>
              </div>
              <div>
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {loadingProfile ? "…" : (profile?.stats.postCount ?? 0)}
                </span>{" "}
                <span className="text-xs text-slate-500">
                  {tr("Posts", "Publications", "Publicaciones")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section Tabs ── */}
      <div
        role="tablist"
        aria-label="Profile sections"
        className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-sm"
      >
        {(
          [
            { id: "posts", label: tr("Posts", "Publications", "Publicaciones"), icon: Newspaper },
            { id: "about", label: tr("About & Groups", "À propos et groupes", "Acerca y grupos"), icon: Users },
            { id: "portals", label: tr("My Portals", "Mes portails", "Mis portales"), icon: Crown },
            { id: "settings", label: tr("Account Settings", "Paramètres du compte", "Configuración"), icon: Settings },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap min-h-[40px] transition-colors ${
                active
                  ? "bg-amber-700 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: My Posts ── */}
      {activeTab === "posts" && (
        <section className="space-y-3">
          {postsLoading ? (
            <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-700" />
              {tr("Loading your posts…", "Chargement de vos publications…", "Cargando tus publicaciones…")}
            </div>
          ) : postsError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/30 p-6 text-center space-y-3">
              <p className="text-sm text-red-700 dark:text-red-300">{postsError}</p>
              <button
                type="button"
                onClick={() => void loadMyPosts()}
                className="rounded-xl bg-amber-700 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800"
              >
                {tr("Retry", "Réessayer", "Reintentar")}
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
              <Newspaper className="h-8 w-8 text-stone-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {tr("You haven't posted yet.", "Vous n'avez pas encore publié.", "Aún no has publicado nada.")}
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {tr(
                  "Share an update or photo on the vxpp Feed and it will appear on your profile.",
                  "Partagez une actualité ou une photo dans le fil vxpp pour qu'elle apparaisse ici.",
                  "Comparte una publicación o foto en el feed de vxpp y aparecerá aquí.",
                )}
              </p>
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 px-4 py-2.5 text-xs font-semibold text-white"
              >
                {tr("Go to Feed", "Aller au fil social", "Ir al feed")}
              </Link>
            </div>
          ) : (
            posts.map((post) => (
              <article
                key={post.id}
                className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {displayName}
                  </span>
                  <span>
                    {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ""}
                  </span>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {post.content}
                </p>
                {Array.isArray(post.imageUrls) && post.imageUrls.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {post.imageUrls.map((src: string, idx: number) => (
                      <img
                        key={idx}
                        src={src}
                        alt="Post attachment"
                        className="rounded-xl max-h-72 w-full object-cover border border-stone-200 dark:border-slate-800"
                      />
                    ))}
                  </div>
                )}
              </article>
            ))
          )}
        </section>
      )}

      {/* ── Tab 2: About & Joined Communities ── */}
      {activeTab === "about" && (
        <section className="grid md:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {tr("Public Profile Info", "Informations publiques", "Información pública")}
              </h2>
              <button
                type="button"
                onClick={openProfileEditor}
                className="text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline"
              >
                {tr("Edit", "Modifier", "Editar")}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {tr(
                "Only these fields appear on your public profile. Your email, job applications, contracts, and private messages are never shown publicly.",
                "Seuls ces champs sont publics. Votre courriel, candidatures, contrats et messages privés ne sont jamais exposés.",
                "Solo estos campos son públicos. Tu correo, solicitudes, contratos y mensajes privados nunca se muestran.",
              )}
            </p>
            <dl className="space-y-2 text-sm pt-2">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">{tr("Headline", "Titre", "Titular")}</dt>
                <dd className="font-medium text-right">{profile?.headline || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">{tr("Profession", "Métier", "Profesión")}</dt>
                <dd className="font-medium text-right">{profile?.profession || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">{tr("Company", "Entreprise", "Empresa")}</dt>
                <dd className="font-medium text-right">{profile?.company || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">{tr("Location", "Lieu", "Ubicación")}</dt>
                <dd className="font-medium text-right">{profile?.location || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">{tr("Website", "Site web", "Sitio web")}</dt>
                <dd className="font-medium text-right truncate max-w-[200px]">
                  {profile?.website || "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {tr("My Communities", "Mes communautés", "Mis comunidades")}
              </h2>
              <Link
                href="/communities"
                className="text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline"
              >
                {tr("Browse all", "Tout voir", "Ver todas")}
              </Link>
            </div>
            {communities.length === 0 ? (
              <p className="text-sm text-slate-500">
                {tr(
                  "You have not joined any community groups yet.",
                  "Vous n'avez pas encore rejoint de communauté.",
                  "Aún no te has unido a ninguna comunidad.",
                )}
              </p>
            ) : (
              <ul className="space-y-2">
                {communities.map((c: any) => (
                  <li
                    key={c.community_id || c.id}
                    className="rounded-xl border border-stone-200 dark:border-slate-800 p-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {c.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {c.region} · {c.category}
                      </p>
                    </div>
                    <Link
                      href="/communities"
                      className="text-xs font-semibold text-amber-800 dark:text-amber-300 shrink-0"
                    >
                      {tr("Open", "Ouvrir", "Abrir")}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* ── Tab 3: Eligible Portals ── */}
      {activeTab === "portals" && (
        <section className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <PortalSelector />
        </section>
      )}

      {/* ── Tab 4: Private Account & Security Settings ── */}
      {activeTab === "settings" && (
        <section className="grid md:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="h-4 w-4 text-amber-700" />
              {tr("Account & Login (Private)", "Compte et connexion (Privé)", "Cuenta y acceso (Privado)")}
            </h2>

            {accountError && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {accountError}
              </p>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2 py-2 border-b border-stone-100 dark:border-slate-800">
                <span className="text-slate-500">Email (Private)</span>
                <span className="font-medium truncate max-w-[220px]">
                  {profile?.email || user.email}
                </span>
              </div>

              <div className="py-2 border-b border-stone-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">{tr("Display Name", "Nom affiché", "Nombre visible")}</span>
                  {!isEditingName ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditName(displayName);
                        setCurrentPassword("");
                        setAccountError("");
                        setIsEditingName(true);
                      }}
                      className="inline-flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-300 hover:underline"
                    >
                      {displayName}
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
                {isEditingName && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={50}
                      placeholder="Display name"
                      className="flex-1 rounded-xl border border-stone-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                    />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current password"
                      className="flex-1 rounded-xl border border-stone-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={isSavingName}
                        onClick={() => void handleSaveDisplayName()}
                        className="inline-flex items-center justify-center rounded-xl bg-amber-700 px-3 py-2 text-white hover:bg-amber-800 min-w-[40px]"
                      >
                        {isSavingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="inline-flex items-center justify-center rounded-xl border border-stone-300 dark:border-slate-700 px-3 py-2 min-w-[40px]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="py-2 border-b border-stone-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">{tr("Username", "Identifiant", "Usuario")}</span>
                  {!isEditingUsername ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditUsername(displayUsername);
                        setAccountError("");
                        setIsEditingUsername(true);
                      }}
                      className="inline-flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-300 hover:underline"
                    >
                      @{displayUsername}
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
                {isEditingUsername && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      maxLength={40}
                      placeholder="username"
                      className="flex-1 rounded-xl border border-stone-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      disabled={isSavingUsername}
                      onClick={() => void handleSaveUsername()}
                      className="inline-flex items-center justify-center rounded-xl bg-amber-700 px-3 py-2 text-white hover:bg-amber-800 min-w-[40px]"
                    >
                      {isSavingUsername ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingUsername(false)}
                      className="inline-flex items-center justify-center rounded-xl border border-stone-300 dark:border-slate-700 px-3 py-2 min-w-[40px]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-700" />
              {tr("Billing, Security & Session", "Facturation et session", "Facturación y sesión")}
            </h2>
            <div className="flex flex-col gap-2.5">
              <Link
                href="/account/billing"
                className="flex items-center justify-between rounded-xl border border-stone-200 dark:border-slate-800 px-4 py-3 text-sm font-medium hover:bg-stone-50 dark:hover:bg-slate-800"
              >
                <span>{tr("Billing & Invoices", "Facturation et reçus", "Facturación y recibos")}</span>
                <span className="text-xs font-semibold capitalize text-amber-800 dark:text-amber-300">
                  {displayTier}
                </span>
              </Link>
              <Link
                href="/pricing"
                className="flex items-center justify-between rounded-xl border border-stone-200 dark:border-slate-800 px-4 py-3 text-sm font-medium hover:bg-stone-50 dark:hover:bg-slate-800"
              >
                <span>{tr("Compare plans & tiers", "Comparer les forfaits", "Comparar planes")}</span>
                <ExternalLink className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center justify-between rounded-xl border border-stone-200 dark:border-slate-800 px-4 py-3 text-sm font-medium hover:bg-stone-50 dark:hover:bg-slate-800"
              >
                <span>{tr("Member & Business Dashboard", "Tableau de bord membre", "Panel de miembro")}</span>
                <ExternalLink className="h-4 w-4 text-slate-400" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/blog");
                }}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 px-4 py-3 text-sm font-semibold min-h-[44px]"
              >
                <LogOut className="h-4 w-4" />
                {tr("Sign Out", "Se déconnecter", "Cerrar sesión")}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Edit Profile Modal ── */}
      {isEditingProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Edit profile"
        >
          <form
            onSubmit={handleSaveProfileDetails}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {tr("Edit Personal Profile", "Modifier le profil personnel", "Editar perfil personal")}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {editError}
              </p>
            )}

            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {tr("Headline", "Titre professionnel ou personnel", "Titular")}
                </span>
                <input
                  type="text"
                  value={formHeadline}
                  onChange={(e) => setFormHeadline(e.target.value)}
                  maxLength={120}
                  placeholder="e.g. Product Designer · Community Builder"
                  className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {tr("Bio", "Bio", "Biografía")}
                </span>
                <textarea
                  rows={3}
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  maxLength={600}
                  placeholder="Tell people what you build, love, or are looking for..."
                  className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm resize-none"
                />
              </label>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {tr("Profession / Role", "Métier / Rôle", "Profesión / Rol")}
                  </span>
                  <input
                    type="text"
                    value={formProfession}
                    onChange={(e) => setFormProfession(e.target.value)}
                    maxLength={100}
                    className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {tr("Company / Organization", "Entreprise", "Empresa")}
                  </span>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    maxLength={100}
                    className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm"
                  />
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {tr("Location", "Ville / Pays", "Ubicación")}
                  </span>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    maxLength={100}
                    placeholder="Toronto, Canada"
                    className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {tr("Website", "Site web", "Sitio web")}
                  </span>
                  <input
                    type="url"
                    value={formWebsite}
                    onChange={(e) => setFormWebsite(e.target.value)}
                    maxLength={255}
                    placeholder="https://example.com"
                    className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {tr("Interests (up to 12)", "Centres d'intérêt (max 12)", "Intereses (máx. 12)")}
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addInterest();
                      }
                    }}
                    placeholder="Music, Tech, Local Craft..."
                    className="flex-1 rounded-xl border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addInterest}
                    className="inline-flex items-center gap-1 rounded-xl border border-stone-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
                {formInterests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {formInterests.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-600/12 border border-amber-600/25 px-3 py-1 text-xs font-medium text-amber-900 dark:text-amber-200"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() =>
                            setFormInterests(formInterests.filter((t) => t !== tag))
                          }
                          aria-label={`Remove ${tag}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {tr("Profile visibility", "Visibilité du profil", "Visibilidad del perfil")}
                </span>
                <select
                  value={formPrivacy}
                  onChange={(e) =>
                    setFormPrivacy(e.target.value as "public" | "friends" | "private")
                  }
                  className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm"
                >
                  <option value="public">Public (visible to Verso Air visitors)</option>
                  <option value="friends">Connections only</option>
                  <option value="private">Private (minimal display)</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-200 dark:border-slate-800">
              <button
                type="button"
                disabled={savingProfile}
                onClick={() => setIsEditingProfile(false)}
                className="rounded-xl border border-stone-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold"
              >
                {tr("Cancel", "Annuler", "Cancelar")}
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                {tr("Save changes", "Enregistrer", "Guardar")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
