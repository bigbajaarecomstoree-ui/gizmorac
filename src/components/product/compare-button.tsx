"use client";

import { Check, Scale } from "lucide-react";
import { useStore } from "@/components/store/store-provider";
import { cn } from "@/lib/utils";

/**
 * Add/remove a product from the compare tray. `icon` variant is a compact round
 * button (for product cards); `label` variant is a full button (for the PDP).
 */
export function CompareButton({
  slug,
  name,
  category,
  variant = "label",
  className,
}: {
  slug: string;
  name: string;
  category?: string;
  variant?: "label" | "icon";
  className?: string;
}) {
  const { toggleCompare, isInCompare, mounted } = useStore();
  const active = mounted && isInCompare(slug);

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          toggleCompare(slug, name, category);
        }}
        aria-pressed={active}
        aria-label={active ? `Remove ${name} from compare` : `Add ${name} to compare`}
        title="Compare"
        className={cn(
          "grid h-9 w-9 place-items-center rounded-full border border-border bg-background/70 text-muted backdrop-blur transition-colors hover:border-accent hover:text-accent cursor-pointer",
          active && "border-accent/50 bg-accent-soft text-accent-bright",
          className,
        )}
      >
        {active ? <Check size={16} /> : <Scale size={16} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggleCompare(slug, name, category)}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-2 rounded-[var(--radius)] border px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer",
        active
          ? "border-accent/50 bg-accent-soft text-accent-bright"
          : "border-border-bright text-muted hover:border-accent hover:text-accent",
        className,
      )}
    >
      {active ? <Check size={16} /> : <Scale size={16} />}
      {active ? "Comparing" : "Compare"}
    </button>
  );
}
