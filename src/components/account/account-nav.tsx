"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Settings } from "lucide-react";

const TABS = [
  { href: "/account", label: "Overview", icon: LayoutGrid },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

/** Overview / Settings switcher shown on the account pages. */
export function AccountNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 rounded-xl border border-border bg-surface p-1">
      {TABS.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-accent text-on-accent"
                : "text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
