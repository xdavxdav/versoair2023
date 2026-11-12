import { CircleDashed, ShieldCheck } from "lucide-react";
import { businessStatusItems } from "@/lib/business-status";
import "./business-status-badges.css";

interface BusinessStatusBadgesProps {
  verified?: boolean | null;
  claimed?: boolean | null;
  // "light" keeps the light palette on pages that do not follow the dark theme.
  surface?: "auto" | "light";
  className?: string;
}

export function BusinessStatusBadges({
  verified,
  claimed,
  surface = "auto",
  className,
}: BusinessStatusBadgesProps) {
  const items = businessStatusItems({ verified, claimed });
  if (items.length === 0) return null;

  return (
    <ul
      className={`biz-status-list${className ? ` ${className}` : ""}`}
      aria-label="Listing status"
    >
      {items.map((item) => (
        <li
          key={item.key}
          className="biz-status"
          data-status={item.key}
          data-surface={surface}
          title={item.help}
        >
          {item.key === "verified" ? (
            <ShieldCheck aria-hidden="true" />
          ) : (
            <CircleDashed aria-hidden="true" />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}
