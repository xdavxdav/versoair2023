import { MapPin, Users, TrendingUp, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";

interface CommunityPost {
  id: number;
  content: string;
  author_name?: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
  user_id?: number;
  created_at: string;
}

function timeAgo(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const s = Math.max(1, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function FanWall() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ posts: CommunityPost[] }>({
    queryKey: ["community-posts"],
    queryFn: async () => {
      const res = await fetch("/api/community/posts?limit=50");
      if (!res.ok) return { posts: [] };
      return res.json();
    },
    refetchInterval: 15000,
  });

  const postMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await authenticatedFetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not post");
      return json;
    },
    onSuccess: () => {
      setText("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["community-posts"] });
    },
    onError: (err: any) => setError(err?.message || "Failed to post"),
  });

  const posts = data?.posts || [];

  return (
    <div className="space-y-4">
      {/* Composer */}
      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
        {user ? (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={postMutation.isPending}
              rows={3}
              maxLength={2000}
              placeholder="Share something with the community…"
              className="w-full bg-slate-900/60 text-white placeholder:text-slate-500 border border-slate-700 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-emerald-500/60"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-slate-500">
                Free for everyone · 30s slow-mode · No cooldown for subscribers
              </p>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  {text.length}/2000
                </span>
                <Button
                  size="sm"
                  disabled={!text.trim() || postMutation.isPending}
                  onClick={() => postMutation.mutate(text.trim())}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {postMutation.isPending ? "Posting…" : "Post"}
                </Button>
              </div>
            </div>
            {error && (
              <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded px-3 py-2">
                {error}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-slate-400 text-sm mb-2">
              Sign in to join the conversation.
            </p>
            <Link href="/login">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                Sign in
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="text-slate-500 text-sm py-6 text-center">
          Loading feed…
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-8 text-center">
          <MessageSquare className="w-8 h-8 mx-auto text-slate-600 mb-2" />
          <p className="text-slate-400 text-sm">
            No posts yet. Be the first to say hi 👋
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const name =
              p.display_name || p.username || p.author_name || "Anonymous";
            return (
              <div
                key={p.id}
                className="bg-slate-800/40 border border-slate-700 rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      name[0]?.toUpperCase() || "U"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-white truncate">
                        {name}
                      </p>
                      <span className="text-xs text-slate-500">
                        {timeAgo(p.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 whitespace-pre-wrap break-words">
                      {p.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CommunityDetail() {
  const [selectedTab, setSelectedTab] = useState("overview");

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="relative pt-20 pb-16 px-4 bg-gradient-to-b from-slate-800/50 to-transparent">
        <div className="max-w-[95vw] mx-auto">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-5xl font-bold text-white mb-3">
                Community Hub
              </h1>
              <p className="text-slate-300 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Global Community
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" className="border-slate-600">
                ← Back
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Active Members", value: "15,234" },
              { label: "Resources", value: "8,492" },
              { label: "Events", value: "142" },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
              >
                <p className="text-slate-400 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-[95vw] mx-auto px-4 py-8">
        <div className="flex gap-4 border-b border-slate-700 mb-8">
          {["overview", "members", "discussions", "events"].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-2 font-semibold capitalize transition-all ${
                selectedTab === tab
                  ? "text-emerald-400 border-b-2 border-emerald-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {selectedTab === "overview" && (
            <div className="space-y-6">
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  About This Community
                </h2>
                <p className="text-slate-300">
                  Join thousands of Verso Air users sharing insights, best
                  practices, and success stories. This is a space to
                  collaborate, learn, and grow together.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    icon: <Users className="h-6 w-6" />,
                    title: "Network",
                    desc: "Connect with professionals in your industry",
                  },
                  {
                    icon: <TrendingUp className="h-6 w-6" />,
                    title: "Learn",
                    desc: "Share knowledge and best practices",
                  },
                  {
                    icon: <MessageSquare className="h-6 w-6" />,
                    title: "Discuss",
                    desc: "Engage in meaningful conversations",
                  },
                  {
                    icon: <MapPin className="h-6 w-6" />,
                    title: "Participate",
                    desc: "Join local chapters and events",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800/30 border border-slate-700 rounded-lg p-4"
                  >
                    <div className="text-emerald-400 mb-3">{item.icon}</div>
                    <h3 className="font-semibold text-white mb-1">
                      {item.title}
                    </h3>
                    <p className="text-slate-400 text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === "members" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((_, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 text-center"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full mx-auto mb-3"></div>
                  <p className="font-semibold text-white">Community Member</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Member since 2024
                  </p>
                </div>
              ))}
            </div>
          )}

          {selectedTab === "discussions" && <FanWall />}

          {selectedTab === "events" && (
            <div className="space-y-4">
              {[
                "Monthly Webinar - Data Insights 101",
                "Community Meetup - New York",
                "Annual Summit 2024",
              ].map((event, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 hover:bg-slate-800/50 transition-all"
                >
                  <h3 className="font-semibold text-white">{event}</h3>
                  <p className="text-slate-400 text-sm mt-2">Next month</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-emerald-400"
                  >
                    Learn More →
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ScrollToTop />
    </div>
  );
}
