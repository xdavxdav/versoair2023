// Search Modal - Pops up when clicking the search loupe icon
// Routes to /faq?search=query on submit, shows live suggestions
// Location: client/src/components/SearchModal.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  MessageCircleQuestion,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useLocation } from "wouter";

interface SearchResult {
  id: number;
  title: string;
  faqCategory: string;
  commentCount: number;
  isResolved: boolean;
  createdAt: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryColors: Record<string, string> = {
  general: "text-cyan-400",
  account: "text-blue-400",
  billing: "text-green-400",
  technical: "text-orange-400",
  business: "text-purple-400",
  platform: "text-pink-400",
};

const categoryLabels: Record<string, string> = {
  general: "General",
  account: "Account",
  billing: "Billing",
  technical: "Technical",
  business: "Business",
  platform: "Platform",
};

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Live search with debounce
  const searchFaq = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/faq/search?q=${encodeURIComponent(searchQuery)}&limit=6`,
      );
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
      }
    } catch {
      // Fallback: show empty — user can still submit to go to FAQ page
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search on input change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchFaq(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchFaq]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onClose();
      navigate(`/faq?search=${encodeURIComponent(query.trim())}`);
    } else {
      onClose();
      navigate("/faq");
    }
  };

  // Navigate to specific FAQ topic
  const goToTopic = (id: number) => {
    onClose();
    navigate(`/faq?topic=${id}`);
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] sm:pt-[15vh]"
          onClick={onClose}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-[90vw] max-w-xl mx-4 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-white/10 shadow-2xl shadow-cyan-500/10 overflow-hidden"
          >
            {/* Search Header */}
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex items-center border-b border-white/10">
                <Search className="absolute left-4 w-5 h-5 text-cyan-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search FAQ topics, questions..."
                  className="w-full bg-transparent text-white placeholder-slate-400 py-4 pl-12 pr-12 text-base focus:outline-none"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-3 p-1 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Results Area */}
            <div className="max-h-[50vh] overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex gap-1">
                    <div
                      className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              ) : results.length > 0 ? (
                <div className="py-2">
                  <p className="px-4 py-2 text-xs text-slate-500 uppercase tracking-wider">
                    FAQ Results
                  </p>
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => goToTopic(result.id)}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-start gap-3 group"
                    >
                      <MessageCircleQuestion className="w-4 h-4 mt-0.5 text-cyan-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate group-hover:text-cyan-300 transition-colors">
                          {result.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs ${categoryColors[result.faqCategory] || "text-slate-400"}`}
                          >
                            {categoryLabels[result.faqCategory] ||
                              result.faqCategory}
                          </span>
                          <span className="text-xs text-slate-500">
                            · {result.commentCount || 0} replies
                          </span>
                          {result.isResolved && (
                            <CheckCircle2 className="w-3 h-3 text-green-400" />
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors mt-1" />
                    </button>
                  ))}
                </div>
              ) : query.trim() ? (
                <div className="py-8 text-center">
                  <MessageCircleQuestion className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">
                    No matching topics found
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    Press Enter to search on the FAQ page
                  </p>
                </div>
              ) : (
                /* Empty state - show quick links */
                <div className="py-4">
                  <p className="px-4 py-2 text-xs text-slate-500 uppercase tracking-wider">
                    Quick Links
                  </p>
                  {[
                    { label: "Browse all FAQ topics", path: "/faq" },
                    { label: "Visit Community Blog", path: "/blog" },
                  ].map((link) => (
                    <button
                      key={link.path}
                      onClick={() => {
                        onClose();
                        navigate(link.path);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center gap-3 group"
                    >
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                      <span className="text-slate-300 text-sm group-hover:text-white transition-colors">
                        {link.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[10px]">
                  Enter
                </kbd>
                <span>to search</span>
                <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] ml-2">
                  Esc
                </kbd>
                <span>to close</span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  navigate("/faq");
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                <Clock className="w-3 h-3" />
                Browse FAQ
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
