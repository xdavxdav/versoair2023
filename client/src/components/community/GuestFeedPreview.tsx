import { useQuery } from "@tanstack/react-query";
import { Heart, MessageCircle } from "lucide-react";

interface PreviewPost {
  id: number;
  content: string;
  likeCount?: number;
  commentCount?: number;
  imageUrls?: string[];
  author?: { displayName?: string; avatarUrl?: string };
}

export default function GuestFeedPreview({ onJoin }: { onJoin: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["guestFeedPreview"],
    queryFn: async () => {
      const res = await fetch("/api/social/posts?limit=5&sort=trending");
      if (!res.ok) throw new Error("Failed to load preview");
      const json = await res.json();
      return (json.data || []) as PreviewPost[];
    },
    staleTime: 60000,
  });

  if (isLoading || !data || data.length === 0) return null;

  return (
    <section
      aria-label="Trending in the community"
      className="mx-auto w-full max-w-2xl px-4 pb-12"
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
        Trending in the community
      </h2>
      <div className="space-y-3">
        {data.map((post) => (
          <article
            key={post.id}
            className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
          >
            <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {post.author?.displayName || "Verso community member"}
            </p>
            <p className="line-clamp-4 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">
              {post.content}
            </p>
            {post.imageUrls?.[0] && (
              <img
                src={post.imageUrls[0]}
                alt=""
                loading="lazy"
                className="mt-3 max-h-64 w-full rounded-xl object-cover"
              />
            )}
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" /> {post.likeCount || 0}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" /> {post.commentCount || 0}
              </span>
            </div>
          </article>
        ))}
      </div>
      <button
        type="button"
        onClick={onJoin}
        className="mt-4 w-full rounded-xl bg-amber-700 hover:bg-amber-800 px-4 py-3 text-sm font-semibold text-white transition-colors"
      >
        Sign in to like, comment and post
      </button>
    </section>
  );
}
