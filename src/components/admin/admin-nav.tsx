"use client";

import { Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Receipt,
  Users,
  LifeBuoy,
  BarChart3,
  Wallet,
  HandCoins,
  Megaphone,
  Settings,
  Store,
  LogOut,
} from "lucide-react";
import { logoutAction } from "@/lib/admin/actions";
import { LiveVisitorsBadge } from "@/components/admin/live-visitors";
import { cn } from "@/lib/utils";

// Frequency-first ordering (council-reviewed): the daily jobs — orders, COD
// verification, stock, tickets — live in the top five slots; weekly money +
// occasional catalog/marketing below. Sibling pages are grouped under one
// entry Shopify-style: the section auto-expands its children in the sidebar
// while you are inside it (no click tax — the parent link both navigates and
// reveals). No route moves: Products also owns /admin/categories, Marketing =
// promotions + subscribers, and Settings (pinned below) owns /admin/logs.
// Rule for future items: no new top-level entry unless it is a new DAILY job —
// otherwise it lands as a child (drafts → under Orders, WhatsApp → Support).
type NavChild = { label: string; href: string };
type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  match?: string[];
  children?: NavChild[];
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Orders", href: "/admin/orders", icon: Receipt },
  { label: "COD & RTO", href: "/admin/cod", icon: HandCoins },
  { label: "Inventory", href: "/admin/inventory", icon: Boxes },
  { label: "Support", href: "/admin/support", icon: LifeBuoy },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Finance", href: "/admin/finance", icon: Wallet },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  {
    label: "Products",
    href: "/admin/products",
    icon: Package,
    match: ["/admin/products", "/admin/categories"],
    children: [{ label: "Categories", href: "/admin/categories" }],
  },
  {
    label: "Marketing",
    href: "/admin/promotions",
    icon: Megaphone,
    match: ["/admin/promotions", "/admin/subscribers"],
    children: [
      { label: "Promotions", href: "/admin/promotions" },
      { label: "Subscribers", href: "/admin/subscribers" },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  const isActive = (item: Pick<NavItem, "href" | "exact" | "match">) =>
    item.exact
      ? pathname === item.href
      : (item.match ?? [item.href]).some((m) => pathname.startsWith(m));

  return (
    <div className="flex h-full flex-col gap-1 p-4">
      <Link href="/admin" className="mb-4 flex items-center gap-2 px-2">
        <Image src="/logo.png" alt="" width={523} height={586} className="h-7 w-auto" />
        <span className="font-display text-base font-bold tracking-tight">
          GIZMO<span className="text-accent">RAC</span>
        </span>
        <span className="ml-1 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-faint">
          Admin
        </span>
      </Link>

      <LiveVisitorsBadge />

      {/* min-h-0 lets this flex child shrink below its content height so the
          list scrolls inside the h-screen sidebar instead of clipping the
          pinned utilities (View store / Settings / Log out) on short screens. */}
      <nav className="flex gap-1 overflow-x-auto md:min-h-0 md:flex-1 md:flex-col md:overflow-y-auto md:overflow-x-hidden">
        {NAV.map((item) => {
          const active = isActive(item);
          return (
            <Fragment key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-soft text-accent-bright"
                    : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <item.icon size={17} />
                {item.label}
              </Link>
              {/* Shopify-style sub-items: plain strip links on mobile; on
                  desktop an indented child list that only shows while the
                  section is active (auto-expand, no extra click). */}
              {item.children?.map((c) => {
                const childActive = pathname.startsWith(c.href);
                return (
                  <Link
                    key={c.label}
                    href={c.href}
                    className={cn(
                      "flex items-center whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:py-2 md:pl-10",
                      active ? "md:flex" : "md:hidden",
                      childActive
                        ? "bg-accent-soft text-accent-bright md:bg-transparent"
                        : "text-muted hover:bg-surface-2 hover:text-foreground",
                    )}
                  >
                    {c.label}
                  </Link>
                );
              })}
            </Fragment>
          );
        })}
        {/* Logs lives under Settings on desktop; keep it directly reachable
            in the mobile strip (Settings block below is desktop-only). */}
        <Link
          href="/admin/logs"
          className={cn(
            "flex items-center whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:hidden",
            pathname.startsWith("/admin/logs")
              ? "bg-accent-soft text-accent-bright"
              : "text-muted hover:bg-surface-2 hover:text-foreground",
          )}
        >
          Logs
        </Link>
      </nav>

      <div className="mt-auto hidden flex-col gap-1 border-t border-border pt-3 md:flex">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Store size={17} />
          View store
        </Link>
        <Link
          href="/admin/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive({ href: "/admin/settings", match: ["/admin/settings", "/admin/logs"] })
              ? "bg-accent-soft text-accent-bright"
              : "text-muted hover:bg-surface-2 hover:text-foreground",
          )}
        >
          <Settings size={17} />
          Settings
        </Link>
        {/* Auto-expanded child while inside the Settings section. */}
        {(pathname.startsWith("/admin/settings") || pathname.startsWith("/admin/logs")) && (
          <Link
            href="/admin/logs"
            className={cn(
              "flex items-center whitespace-nowrap rounded-lg px-3 py-2 pl-10 text-sm font-medium transition-colors",
              pathname.startsWith("/admin/logs")
                ? "text-accent-bright"
                : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            Logs
          </Link>
        )}
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-danger/10 hover:text-danger cursor-pointer"
          >
            <LogOut size={17} />
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
