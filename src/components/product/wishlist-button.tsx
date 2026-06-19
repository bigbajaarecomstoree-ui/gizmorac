"use client";

import { Heart } from "lucide-react";
import { useStore } from "@/components/store/store-provider";
import { cn } from "@/lib/utils";

export function WishlistButton({
  id,
  name,
  className,
  withLabel = false,
}: {
  id: string;
  name: string;
  className?: string;
  withLabel?: boolean;
}) {
  const { isInWishlist, toggleWishlist, mounted } = useStore();
  const active = mounted && isInWishlist(id);

  if (withLabel) {
    return (
      <button
        type="button"
        onClick={() => toggleWishlist(id, name)}
        aria-pressed={active}
        className={cn(
          "inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius)] border px-7 text-base font-medium transition-colors cursor-pointer",
          active
            ? "border-accent/50 bg-accent-soft text-accent-bright"
            : "border-border-bright text-foreground hover:border-accent hover:text-accent",
          className,
        )}
      >
        <Heart size={17} fill={active ? "currentColor" : "none"} />
        {active ? "Wishlisted" : "Wishlist"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggleWishlist(id, name)}
      aria-pressed={active}
      aria-label={active ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full border border-border bg-background/70 text-muted backdrop-blur transition-colors hover:border-accent hover:text-accent cursor-pointer",
        active && "border-accent/50 bg-accent-soft text-accent-bright",
        className,
      )}
    >
      <Heart size={16} fill={active ? "currentColor" : "none"} />
    </button>
  );
}
