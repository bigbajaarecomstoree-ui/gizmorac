import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/format";

const SIZES = { sm: 13, md: 15, lg: 18 } as const;

export function RatingStars({
  rating,
  count,
  size = "sm",
  className,
}: {
  rating: number;
  count?: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const px = SIZES[size];
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className="relative inline-flex"
        role="img"
        aria-label={`Rated ${rating} out of 5`}
      >
        <span className="flex text-border-bright">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={px} strokeWidth={1.5} className="shrink-0" />
          ))}
        </span>
        <span
          className="absolute inset-y-0 left-0 flex overflow-hidden text-highlight"
          style={{ width: `${pct}%` }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={px}
              strokeWidth={1.5}
              fill="currentColor"
              className="shrink-0"
            />
          ))}
        </span>
      </span>
      <span className="text-xs text-muted">
        <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
        {typeof count === "number" ? (
          <span className="text-faint"> ({formatCount(count)})</span>
        ) : null}
      </span>
    </div>
  );
}
