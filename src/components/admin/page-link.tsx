import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Prev/next pagination link for the admin list pages. */
export function PageLink({
  href,
  disabled,
  dir,
}: {
  href: string;
  disabled: boolean;
  dir: "prev" | "next";
}) {
  const label = dir === "prev" ? "Previous" : "Next";
  const icon = dir === "prev" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />;
  const cls =
    "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors";
  if (disabled) {
    return (
      <span className={cn(cls, "cursor-not-allowed text-faint opacity-50")} aria-disabled>
        {dir === "prev" ? icon : null}
        {label}
        {dir === "next" ? icon : null}
      </span>
    );
  }
  return (
    <Link href={href} className={cn(cls, "text-foreground hover:border-accent hover:text-accent")}>
      {dir === "prev" ? icon : null}
      {label}
      {dir === "next" ? icon : null}
    </Link>
  );
}
