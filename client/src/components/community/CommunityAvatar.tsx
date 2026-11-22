import React from "react";

interface CommunityAvatarProps {
  emoji?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES: Record<NonNullable<CommunityAvatarProps["size"]>, string> = {
  sm: "h-9 w-9 rounded-xl text-[15px]",
  md: "h-11 w-11 rounded-2xl text-[17px]",
  lg: "h-14 w-14 rounded-2xl text-[22px]",
};

export default function CommunityAvatar({
  emoji,
  name,
  size = "md",
}: CommunityAvatarProps) {
  const mark = (emoji || "").trim() || (name?.[0]?.toUpperCase() ?? "◇");
  return (
    <div
      translate="no"
      aria-hidden="true"
      className={`notranslate shrink-0 inline-flex items-center justify-center border border-[#E6DCD2] dark:border-slate-700 bg-[#FAF6F1] dark:bg-slate-800 text-[#B56535] dark:text-amber-300 font-semibold select-none ${SIZE_CLASSES[size]}`}
    >
      {mark}
    </div>
  );
}
