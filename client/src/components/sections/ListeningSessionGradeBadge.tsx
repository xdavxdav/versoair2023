import { formatSignedBadge, type SignedGrade } from "@shared/listening-session";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** "Verso Signed · S" for a contracted artist, "Regular" for everyone else. */
export function GradeBadge({ grade, className }: { grade: SignedGrade | null; className?: string }) {
  const label = formatSignedBadge(grade);
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap",
        label ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600",
        className,
      )}
    >
      {label ?? "Regular"}
    </Badge>
  );
}
