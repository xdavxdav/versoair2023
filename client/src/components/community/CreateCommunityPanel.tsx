import React, { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_MARKS,
  createVxppCommunity,
  slugifyCommunityName,
  type VxppCommunity,
} from "@/lib/communities";

interface CreateCommunityPanelProps {
  open: boolean;
  onClose: () => void;
  onCreated: (community: VxppCommunity) => void;
}

export default function CreateCommunityPanel({
  open,
  onClose,
  onCreated,
}: CreateCommunityPanelProps) {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("General");
  const [emoji, setEmoji] = useState<string>("◇");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const previewSlug = slugifyCommunityName(name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || !previewSlug) {
      setError("Enter a community name first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await createVxppCommunity({
        name: cleanName,
        slug: previewSlug,
        tagline: tagline.trim(),
        description: description.trim(),
        category,
        emoji,
      });
      setName("");
      setTagline("");
      setDescription("");
      setCategory("General");
      setEmoji("◇");
      onCreated(res.community);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create community.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-community-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-[#E6DFD6] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EFE9E0] dark:border-slate-800 shrink-0">
          <div>
            <h2
              id="create-community-title"
              className="text-base font-semibold text-[#1A202C] dark:text-slate-100"
            >
              Start a community
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create a dedicated space for posts, updates, and member discussion.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-[#F7F4F0] dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4"
        >
          <div>
            <label
              htmlFor="community-name"
              className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5"
            >
              Name
            </label>
            <input
              id="community-name"
              type="text"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Montreal Electrical Guild"
              className="w-full h-11 rounded-xl border border-[#DDD3C8] dark:border-slate-700 bg-[#FAF6F1] dark:bg-slate-800 px-3.5 text-base sm:text-sm text-[#1A202C] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#B56535] focus:outline-none"
            />
            {previewSlug && (
              <p
                translate="no"
                className="notranslate mt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400"
              >
                /communities/{previewSlug}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                Mark
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {COMMUNITY_MARKS.map((mark) => (
                  <button
                    key={mark}
                    type="button"
                    translate="no"
                    onClick={() => setEmoji(mark)}
                    className={`notranslate h-10 rounded-xl border text-base font-semibold transition-colors cursor-pointer ${
                      emoji === mark
                        ? "border-[#B56535] bg-[#B56535]/12 text-[#B56535] dark:text-amber-300"
                        : "border-[#E6DFD6] dark:border-slate-700 bg-[#FAF6F1] dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#B56535]/50"
                    }`}
                  >
                    {mark}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="community-category"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5"
              >
                Category
              </label>
              <select
                id="community-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 rounded-xl border border-[#DDD3C8] dark:border-slate-700 bg-[#FAF6F1] dark:bg-slate-800 px-3 text-base sm:text-sm text-[#1A202C] dark:text-slate-100 focus:border-[#B56535] focus:outline-none"
              >
                {COMMUNITY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="community-tagline"
              className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5"
            >
              Tagline
            </label>
            <input
              id="community-tagline"
              type="text"
              maxLength={140}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="One crisp line explaining who this space is for"
              className="w-full h-11 rounded-xl border border-[#DDD3C8] dark:border-slate-700 bg-[#FAF6F1] dark:bg-slate-800 px-3.5 text-base sm:text-sm text-[#1A202C] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#B56535] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="community-description"
              className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5"
            >
              About (optional)
            </label>
            <textarea
              id="community-description"
              rows={3}
              maxLength={1500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share guidelines, topics, or what members post here."
              className="w-full rounded-xl border border-[#DDD3C8] dark:border-slate-700 bg-[#FAF6F1] dark:bg-slate-800 px-3.5 py-2.5 text-base sm:text-sm text-[#1A202C] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#B56535] focus:outline-none resize-none"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="pt-2 pb-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-full border border-[#DDD3C8] dark:border-slate-700 px-4 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-[#F7F4F0] dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#B56535] hover:bg-[#9C542A] px-5 text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create community
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
