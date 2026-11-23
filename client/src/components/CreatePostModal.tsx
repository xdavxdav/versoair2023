// CreatePostModal Component
// Location: client/src/components/CreatePostModal.tsx

"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, Smile, Tag, Loader2 } from "lucide-react";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { authenticatedFetch } from "@/lib/auth";

const QUICK_EMOJIS = ["🔥", "✨", "👏", "❤️", "🎵", "💼", "🚀", "🙌"];

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (postData: {
    content: string;
    imageUrls?: string[];
    videoUrl?: string;
    allowMediaDownload?: boolean;
    tags?: string[];
  }) => void;
  isLoading?: boolean;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  useScrollLock(isOpen);
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [allowMediaDownload, setAllowMediaDownload] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleUploadPostImage = async (file: File) => {
    setUploadError(null);
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image is too large (max 5 MB).");
      return;
    }
    if (imageUrls.length >= 4) {
      setUploadError("You can attach up to 4 images per post.");
      return;
    }
    setUploadingImage(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await authenticatedFetch("/api/profile/post-media", {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json?.url) {
        throw new Error(json?.message || "Failed to upload image.");
      }
      setImageUrls((prev) => [...prev, json.url]);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Could not upload image.",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit({
        content: content.trim(),
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        tags: tags.length > 0 ? tags : undefined,
        allowMediaDownload,
      });
      setContent("");
      setTags([]);
      setTagInput("");
      setImageUrls([]);
      setUploadError(null);
      setShowEmojiBar(false);
      setAllowMediaDownload(false);
      onClose();
    }
  };

  const isValid = content.trim().length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop + Scrollable Overlay (z-[60] clears mobile bottom nav & header) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Modal Container — scrollable viewport on smartphones & small screens */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-[61] flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[88dvh] flex flex-col overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-white/10 font-handstyle"
            >
              {/* Header */}
              <div className="shrink-0 flex items-center justify-between px-4 py-3.5 sm:p-5 border-b border-white/10">
                <h2 className="text-lg sm:text-xl font-semibold text-white font-handstyle">
                  Create Post
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  aria-label="Close"
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-slate-300" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] p-4 sm:p-6 space-y-4">
                {/* Text Input */}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind? Share your thoughts, ideas, or stories..."
                  disabled={isLoading}
                  rows={5}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-[16px] text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 resize-none disabled:opacity-50 font-handstyle"
                />

                {/* Tags Input */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Add tags (e.g., #design, #technology)"
                      disabled={isLoading}
                      className="flex-1 min-w-0 bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-[16px] text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 disabled:opacity-50 font-handstyle"
                    />
                    <button
                      onClick={handleAddTag}
                      disabled={!tagInput.trim() || isLoading}
                      className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-lg text-cyan-300 hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                    >
                      <Tag className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Tags Display */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <motion.div
                          key={tag}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-1 bg-cyan-500/20 border border-cyan-500/50 rounded-full px-3 py-1"
                        >
                          <span className="text-cyan-300 text-sm font-handstyle">
                            #{tag}
                          </span>
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            disabled={isLoading}
                            className="text-cyan-400 hover:text-cyan-200 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Attached Photos Preview */}
                {uploadError && (
                  <p role="alert" className="text-xs text-rose-400">
                    {uploadError}
                  </p>
                )}
                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {imageUrls.map((url, idx) => (
                      <div key={url} className="relative rounded-xl overflow-hidden border border-white/10">
                        <img src={url} alt={`Attachment ${idx + 1}`} className="h-28 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() =>
                            setImageUrls((prev) => prev.filter((item) => item !== url))
                          }
                          aria-label="Remove attachment"
                          className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {showEmojiBar && (
                  <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-800/80 border border-white/10 p-2">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setContent((prev) => `${prev}${emoji}`)}
                        className="h-8 w-8 rounded-lg hover:bg-white/10 text-base flex items-center justify-center"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void handleUploadPostImage(file);
                  }}
                />

                {/* Character Count */}
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={allowMediaDownload}
                    onChange={(event) =>
                      setAllowMediaDownload(event.target.checked)
                    }
                    disabled={isLoading}
                    className="h-4 w-4 accent-cyan-500"
                  />
                  Allow visitors to download this post's media
                </label>

                <div className="text-xs text-slate-400 text-right font-handstyle">
                  {content.length} characters
                </div>
              </div>

              {/* Footer — pinned inside modal flex column so Post & Cancel stay reachable */}
              <div className="shrink-0 flex items-center justify-between px-4 py-3.5 sm:p-5 border-t border-white/10 bg-slate-900/80">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isLoading || uploadingImage || imageUrls.length >= 4}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Add image"
                    aria-label="Add image"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-300" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmojiBar((prev) => !prev)}
                    disabled={isLoading}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Add emoji"
                    aria-label="Add emoji"
                  >
                    <Smile className="w-5 h-5 text-slate-300" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="px-4 py-2 text-slate-300 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 font-handstyle"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!isValid || isLoading || uploadingImage}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-handstyle"
                  >
                    {isLoading ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreatePostModal;
