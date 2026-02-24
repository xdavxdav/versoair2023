import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };

export const SkeletonCard = () => (
  <div className="animate-pulse rounded-lg border border-slate-200 p-6">
    <div className="h-4 w-3/4 rounded bg-slate-200 mb-4"></div>
    <div className="h-8 w-1/2 rounded bg-slate-200 mb-4"></div>
    <div className="space-y-2">
      <div className="h-3 w-full rounded bg-slate-200"></div>
      <div className="h-3 w-5/6 rounded bg-slate-200"></div>
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-2">
    {/* Header */}
    <div className="grid grid-cols-5 gap-4 pb-4 border-b border-slate-200">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-4 bg-slate-200 rounded animate-pulse"></div>
      ))}
    </div>
    {/* Rows */}
    {[...Array(rows)].map((_, rowIndex) => (
      <div key={rowIndex} className="grid grid-cols-5 gap-4 py-4">
        {[...Array(5)].map((_, colIndex) => (
          <div
            key={colIndex}
            className="h-4 bg-slate-100 rounded animate-pulse"
          ></div>
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonText = ({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) => (
  <div className={`space-y-2 ${className}`}>
    {[...Array(lines)].map((_, i) => (
      <div
        key={i}
        className={`h-4 bg-slate-200 rounded animate-pulse ${
          i === lines - 1 ? "w-5/6" : "w-full"
        }`}
      ></div>
    ))}
  </div>
);
