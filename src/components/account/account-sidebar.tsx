"use client";

import Link from "next/link";
import { LayoutGrid, Package, Gift, Heart, Settings, LogOut } from "lucide-react";
import { logoutAction } from "@/lib/customer/actions";

const LINKS = [
  { href: "/account", label: "Overview", icon: LayoutGrid },
  { href: "/account#orders", label: "Orders", icon: Package },
  { href: "/account#rewards", label: "Rewards", icon: Gift },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

/** Sticky account navigation — vertical sidebar on desktop, scroller on mobile. */
export function AccountSidebar() {
  return (
    <nav className="lg:sticky lg:top-24">
      <ul className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1 lg:flex-col lg:overflow-visible">
        {LINKS.map((l) => (
          <li key={l.href} className="lg:w-full">
            <Link
              href={l.href}
              className="flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <l.icon size={16} /> {l.label}
            </Link>
          </li>
        ))}
        <li className="lg:mt-1 lg:w-full lg:border-t lg:border-border lg:pt-1">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-danger/10 hover:text-danger"
            >
              <LogOut size={16} /> Log out
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
