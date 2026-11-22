import React from "react";
import { memberInitials } from "@/lib/communities";

interface MonogramProps {
  name?: string | null;
  size?: "sm" | "md";
}

export default function Monogram({ name, size = "md" }: MonogramProps) {
  const dims =
    size === "sm"
      ? "h-7 w-7 text-[11px]"
      : "h-9 w-9 text-xs";

  return (
    <span
      translate="no"
      aria-hidden="true"
      className={`notranslate shrink-0 inline-flex items-center justify-center rounded-full border border-[#E6DCD2] dark:border-slate-700 bg-[#F7F4F0] dark:bg-slate-800 text-[#1A202C] dark:text-slate-100 font-semibold tracking-tight select-none ${dims}`}
    >
      {memberInitials(name)}
    </span>
  );
}
