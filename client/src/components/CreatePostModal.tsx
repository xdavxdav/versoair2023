// CreatePostModal Component
// Location: client/src/components/CreatePostModal.tsx

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, Smile, Tag } from "lucide-react";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (postData: {
    content: string;
    imageUrls?: string[];
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
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

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
        tags: tags.length > 0 ? tags : undefined,
      });
      setContent("");
      setTags([]);
      setTagInput("");
      onClose();
    }
  };

  const isValid = content.trim().length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-white/10 font-handstyle">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-xl font-semibold text-white font-handstyle">
                  Create Post
                </h2>
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Text Input */}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind? Share your thoughts, ideas, or stories..."
                  disabled={isLoading}
                  rows={6}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 resize-none disabled:opacity-50 font-handstyle"
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
                      className="flex-1 bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 disabled:opacity-50 font-handstyle"
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

                {/* Character Count */}
                <div className="text-xs text-slate-400 text-right font-handstyle">
                  {content.length} characters
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-white/10 bg-slate-900/50">
                <div className="flex gap-2">
                  <button
                    disabled={isLoading}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Add image"
                  >
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  </button>
                  <button
                    disabled={isLoading}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Add emoji"
                  >
                    <Smile className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="px-4 py-2 text-slate-300 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 font-handstyle"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!isValid || isLoading}
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
