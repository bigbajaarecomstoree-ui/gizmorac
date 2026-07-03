"use client";

import { Check, Scale } from "lucide-react";
import { useStore } from "@/components/store/store-provider";
import { cn } from "@/lib/utils";

/** Add/remove a product from the compare tray — compact round icon button. */
export function CompareButton({
  slug,
  name,
  category,
  className,
}: {
  slug: string;
  name: string;
  category?: string;
  className?: string;
}) {
  const { toggleCompare, isInCompare, mounted } = useStore();
  const active = mounted && isInCompare(slug);

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
