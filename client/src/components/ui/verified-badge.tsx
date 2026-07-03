import { CheckCircle } from "lucide-react";

interface VerifiedBadgeProps {
  size?: "sm" | "md";
  verifiedAt?: string | Date | null;
  createdAt?: string | Date | null;
  className?: string;
}

/**
 * Verso Air purple verified badge.
 * - `sm`: inline with business name on search cards (16px icon)
 * - `md`: below business name on detail page (20px icon + full text + date)
 *
 * Shows "Verified in under 24h" speed badge when applicable.
 * Subtle pulse animation for listings verified < 7 days ago.
 */
export default function VerifiedBadge({
  size = "sm",
  verifiedAt,
  createdAt,
  className = "",
}: VerifiedBadgeProps) {
  const verifiedDate = verifiedAt ? new Date(verifiedAt) : null;
  const createdDate = createdAt ? new Date(createdAt) : null;

  // Check if verified within last 7 days (for pulse animation)
  const isRecent =
    verifiedDate &&
    Date.now() - verifiedDate.getTime() < 7 * 24 * 60 * 60 * 1000;

  // Check if verification took under 24h (speed badge)
  const verifiedFast =
    verifiedDate &&
    createdDate &&
    verifiedDate.getTime() - createdDate.getTime() < 24 * 60 * 60 * 1000;

  const formattedDate = verifiedDate
    ? verifiedDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  if (size === "sm") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/30 text-xs font-medium ${isRecent ? "animate-pulse" : ""} ${className}`}
        title={
          formattedDate
            ? `Verified by Verso Air · ${formattedDate}`
            : "Verified by Verso Air"
        }
      >
        <CheckCircle className="h-3.5 w-3.5 text-[#7C3AED]" />
        Verified
      </span>
    );
  }

  // md size — full detail display
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/30 w-fit ${isRecent ? "animate-pulse" : ""}`}
      >
        <CheckCircle className="h-5 w-5 text-[#7C3AED]" />
        <span className="text-sm font-semibold text-[#A78BFA]">
          Verified by Verso Air
        </span>
        {formattedDate && (
          <span className="text-xs text-gray-400">· {formattedDate}</span>
        )}
      </div>
      {verifiedFast && (
        <span className="text-xs text-emerald-400 ml-1">
          ⚡ Verified in under 24h
        </span>
      )}
    </div>
  );
}
