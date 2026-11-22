import React, { useState } from "react";
import { Check, Loader2 } from "lucide-react";

interface JoinButtonProps {
  isMember: boolean;
  loading?: boolean;
  onToggle: (e: React.MouseEvent) => void;
  size?: "sm" | "md";
}

export default function JoinButton({
  isMember,
  loading = false,
  onToggle,
  size = "md",
}: JoinButtonProps) {
  const [hovered, setHovered] = useState(false);

  const sizeClass =
    size === "sm"
      ? "h-9 px-3.5 text-xs"
      : "h-10 px-4 text-sm";

  if (isMember) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors cursor-pointer disabled:opacity-60 border ${
          hovered
            ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
            : "border-[#DDD3C8] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#1A202C] dark:text-slate-100 hover:bg-[#FAF6F1]"
        } ${sizeClass}`}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : hovered ? (
          "Leave"
        ) : (
          <>
            <Check className="h-3.5 w-3.5 text-[#B56535] dark:text-amber-400" />
            Joined
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={onToggle}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors cursor-pointer disabled:opacity-60 bg-[#B56535] hover:bg-[#9C542A] text-white shadow-xs ${sizeClass}`}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Join"}
    </button>
  );
}
