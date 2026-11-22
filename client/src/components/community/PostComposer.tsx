import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import Monogram from "./Monogram";
import { uploadCommunityPostPhoto } from "@/lib/communities";

interface PostComposerProps {
  communityName: string;
  userName: string;
  onSubmit: (payload: { body: string; image_url?: string }) => Promise<void>;
}

export default function PostComposer({
  communityName,
  userName,
  onSubmit,
}: PostComposerProps) {
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const canPost = (body.trim().length > 0 || imageUrl.length > 0) && !uploading && !submitting;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const url = await uploadCommunityPostPhoto(file);
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload photo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canPost) return;
    setError("");
    setSubmitting(true);
    try {
      await onSubmit({ body: body.trim(), image_url: imageUrl || undefined });
      setBody("");
      setImageUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish post.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[#E6DFD6] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs"
    >
      <div className="flex items-start gap-3">
        <Monogram name={userName} size="md" />
        <div className="flex-1 min-w-0">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Share something with ${communityName}…`}
            rows={3}
            maxLength={4000}
            className="w-full resize-none bg-transparent text-base sm:text-sm leading-relaxed text-[#1A202C] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />

          {imageUrl && (
            <div className="relative mt-2.5 inline-block max-w-full overflow-hidden rounded-xl border border-[#E6DFD6] dark:border-slate-700 bg-[#F7F4F0] dark:bg-slate-800">
              <img
                src={imageUrl}
                alt="Attached preview"
                className="max-h-64 max-w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                aria-label="Remove attached photo"
                className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {error && (
            <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="mt-3 pt-3 border-t border-[#F0EAE2] dark:border-slate-800 flex items-center justify-between gap-2">
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploading || submitting}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-[#F7F4F0] dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#B56535]" />
                ) : (
                  <ImagePlus className="h-4 w-4 text-[#B56535] dark:text-amber-400" />
                )}
                {uploading ? "Uploading…" : "Photo"}
              </button>
            </div>

            <button
              type="submit"
              disabled={!canPost}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#B56535] hover:bg-[#9C542A] px-4 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Post
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
