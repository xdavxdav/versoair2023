/**
 * vxpp Public Member Profile (/user/:id)
 *
 * Displays another member's public identity (cover photo, avatar, headline,
 * bio, location, website, interests, public posts, published tracks) without
 * exposing private fields (email, applications, contracts, private messages).
 * Works cleanly for both guests and signed-in members.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Edit3,
  Globe,
  Loader2,
  MapPin,
  MessageCircle,
  Music,
  Newspaper,
  Play,
  User,
} from "lucide-react";
import FollowButton from "@/components/FollowButton";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { authenticatedFetch } from "@/lib/auth";
import { navigateBackSafely } from "@/lib/safe-navigation";

type ActiveTab = "posts" | "tracks" | "about";

interface PublicUserProfile {
  id: number;
  username: string;
  name: string;
  avatar: string | null;
  coverImageUrl: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  profession: string | null;
  company: string | null;
  interests: string[];
  role: string;
  tier: string;
  isArtist: boolean;
  isFollowing: boolean;
  joinedAt: string | null;
  stats: {
    followerCount: number;
    followingCount: number;
    trackCount: number;
    postCount: number;
    streamCount: number;
    likeCount: number;
  };
}

function formatCompact(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value);
}

export default function UserProfilePage() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/user/:id");
  const userId = params?.id;
  const { user: me } = useAuthContext();
  const { toast } = useToast();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("posts");
  const [tracks, setTracks] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    if (!match || !userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAvatarFailed(false);
    setCoverFailed(false);

    authenticatedFetch(`/api/social/users/${userId}`)
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.data) {
          throw new Error(json?.error || "Profile not found.");
        }
        return json.data;
      })
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setProfile(null);
          setError(err instanceof Error ? err.message : "Could not load profile.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [match, userId, me?.id]);

  useEffect(() => {
    if (!userId || !profile) return;
    let cancelled = false;
    setTabLoading(true);

    if (activeTab === "posts") {
      authenticatedFetch(`/api/social/users/${userId}/posts?limit=20`)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (!cancelled && Array.isArray(json?.data)) setPosts(json.data);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setTabLoading(false);
        });
    } else if (activeTab === "tracks") {
      authenticatedFetch(`/api/social/users/${userId}/tracks?limit=20`)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (!cancelled && Array.isArray(json?.data)) setTracks(json.data);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setTabLoading(false);
        });
    } else {
      setTabLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [activeTab, userId, profile]);

  const isMe = Boolean(me?.id && profile?.id && String(me.id) === String(profile.id));

  const initials = useMemo(() => {
    if (!profile?.name) return "VA";
    return profile.name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [profile]);

  const handleMessage = async () => {
    if (!profile) return;
    if (!me) {
      navigate(`/auth/signin?redirect=${encodeURIComponent(`/user/${profile.id}`)}`);
      return;
    }

    try {
      const type = profile.isArtist ? "music_artist" : "direct";
      const response = await authenticatedFetch("/api/inbox/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: String(profile.id),
          participantName: profile.name,
          participantAvatar: profile.avatar,
          type,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Could not open conversation");
      }
      navigate("/messages");
    } catch (err) {
      toast({
        title: "Message unavailable",
        description:
          err instanceof Error ? err.message : "Could not open conversation.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto w-full px-4 py-8">
        <div className="rounded-3xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden animate-pulse">
          <div className="h-44 bg-stone-200 dark:bg-slate-800" />
          <div className="p-6 space-y-4">
            <div className="h-24 w-24 -mt-16 rounded-full bg-stone-300 dark:bg-slate-700 border-4 border-white dark:border-slate-900" />
            <div className="h-6 w-48 rounded bg-stone-200 dark:bg-slate-800" />
            <div className="h-4 w-72 rounded bg-stone-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto w-full px-4 py-12 text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-stone-200 dark:bg-slate-800 mx-auto flex items-center justify-center">
          <User className="h-7 w-7 text-slate-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {error || "Member not found"}
        </h1>
        <button
          type="button"
          onClick={() => navigateBackSafely(navigate, "/blog")}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white px-4 py-2.5 text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      <button
        type="button"
        onClick={() => navigateBackSafely(navigate, "/blog")}
        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 min-h-[38px]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <section className="rounded-3xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="relative h-40 sm:h-52 bg-gradient-to-br from-stone-900 via-amber-950 to-slate-900 overflow-hidden">
          {profile.coverImageUrl && !coverFailed ? (
            <img
              src={profile.coverImageUrl}
              alt={`${profile.name} cover`}
              onError={() => setCoverFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(217,119,6,0.3),transparent_55%)]" />
          )}
        </div>

        <div className="px-5 sm:px-7 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
            <div
              className="relative -mt-12 sm:-mt-16 h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 border-white dark:border-slate-900 bg-gradient-to-br from-amber-600 to-amber-800 shadow-md overflow-hidden flex items-center justify-center text-white text-2xl sm:text-3xl font-extrabold shrink-0 notranslate"
              translate="no"
            >
              {profile.avatar && !avatarFailed ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  onError={() => setAvatarFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-3">
              {isMe ? (
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold px-4 py-2.5 min-h-[42px]"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit My Profile
                </Link>
              ) : (
                <>
                  {me && (
                    <FollowButton
                      userId={profile.id}
                      initialIsFollowing={profile.isFollowing}
                      initialFollowerCount={profile.stats.followerCount}
                      onFollowChange={(isFollowing, count) => {
                        setProfile((prev) =>
                          prev
                            ? {
                                ...prev,
                                isFollowing,
                                stats: { ...prev.stats, followerCount: count },
                              }
                            : prev,
                        );
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => void handleMessage()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold px-4 py-2.5 min-h-[42px]"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {me ? "Message" : "Sign in to Message"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white notranslate" translate="no">
                {profile.name}
              </h1>
              <span className="text-sm text-slate-500 notranslate" translate="no">@{profile.username}</span>
              {profile.isArtist && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-600/10 border border-purple-500/25 px-2.5 py-0.5 text-xs font-semibold text-purple-800 dark:text-purple-300">
                  <Music className="h-3 w-3" />
                  Artist
                </span>
              )}
            </div>

            {profile.headline && (
              <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-200">
                {profile.headline}
              </p>
            )}

            {profile.bio && (
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl whitespace-pre-line">
                {profile.bio}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-slate-500">
              {(profile.profession || profile.company) && (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-amber-700" />
                  {[profile.profession, profile.company].filter(Boolean).join(" · ")}
                </span>
              )}
              {profile.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-amber-700" />
                  {profile.location}
                </span>
              )}
              {profile.website && (
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
              {profile.joinedAt && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Joined {new Date(profile.joinedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {Array.isArray(profile.interests) && profile.interests.length > 0 && (
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

            <div className="flex items-center gap-6 pt-3 border-t border-stone-100 dark:border-slate-800 tabular-nums text-sm">
              <span>
                <strong className="text-slate-900 dark:text-white">
                  {formatCompact(profile.stats.followerCount)}
                </strong>{" "}
                <span className="text-xs text-slate-500">Followers</span>
              </span>
              <span>
                <strong className="text-slate-900 dark:text-white">
                  {formatCompact(profile.stats.followingCount)}
                </strong>{" "}
                <span className="text-xs text-slate-500">Following</span>
              </span>
              <span>
                <strong className="text-slate-900 dark:text-white">
                  {formatCompact(profile.stats.postCount)}
                </strong>{" "}
                <span className="text-xs text-slate-500">Posts</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="flex gap-1 rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5">
        {(
          [
            { id: "posts", label: "Posts", icon: Newspaper },
            ...(profile.isArtist || profile.stats.trackCount > 0
              ? [{ id: "tracks" as const, label: "Tracks", icon: Music }]
              : []),
            { id: "about", label: "About", icon: User },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold min-h-[40px] ${
                active
                  ? "bg-amber-700 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabLoading ? (
        <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-amber-700" />
        </div>
      ) : activeTab === "posts" ? (
        posts.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
            No public posts yet.
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <article
                key={post.id}
                className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2.5"
              >
                <p className="text-xs text-slate-500">
                  {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ""}
                </p>
                <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line">
                  {post.content}
                </p>
                {Array.isArray(post.imageUrls) && post.imageUrls.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {post.imageUrls.map((src: string, idx: number) => (
                      <img
                        key={idx}
                        src={src}
                        alt="Post attachment"
                        className="rounded-xl max-h-72 w-full object-cover"
                      />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )
      ) : activeTab === "tracks" ? (
        tracks.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
            No published tracks yet.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {tracks.map((track) => (
              <Link
                key={track.id}
                href={`/track/${track.id}`}
                className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3 hover:border-amber-500/50 transition-colors"
              >
                <div className="h-12 w-12 rounded-xl bg-amber-700/15 flex items-center justify-center shrink-0 overflow-hidden">
                  {track.coverArt ? (
                    <img src={track.coverArt} alt={track.title} className="h-full w-full object-cover" />
                  ) : (
                    <Play className="h-5 w-5 text-amber-800" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {track.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {track.genre || "Music"} · {formatCompact(Number(track.playCount || 0))} plays
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>{profile.bio || "No bio added yet."}</p>
        </div>
      )}
    </div>
  );
}
