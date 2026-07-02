"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Underline tab bar that groups sibling admin pages under one sidebar entry
 * (Products|Categories, Promotions|Subscribers, Settings|Logs) without moving
 * any routes — existing URLs and bookmarks keep working.
 */
export function AdminSubnav({ tabs }: { tabs: { label: string; href: string }[] }) {
  const pathname = usePathname();

  return (
    <div className="mb-5 flex gap-1 border-b border-border">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-accent text-accent-bright"
                : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
