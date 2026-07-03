"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Receipt,
  LifeBuoy,
  BarChart3,
  Megaphone,
  Settings,
  Store,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { logoutAction } from "@/lib/admin/actions";
import { LiveVisitorsBadge } from "@/components/admin/live-visitors";
import { cn } from "@/lib/utils";

// Owner-specified structure (2026-07-03): six top-level jobs, everything else a
// child. Sections are a collapsible accordion — clicking a parent toggles its
// children open/closed with a smooth height animation; the section you're in
// opens automatically. No route moves: grouping is nav-only via `match`.
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
  {
    label: "Orders",
    href: "/admin/orders",
    icon: Receipt,
    match: ["/admin/orders", "/admin/cod"],
    children: [{ label: "COD & RTO", href: "/admin/cod" }],
  },
  {
    label: "Products",
    href: "/admin/products",
    icon: Package,
    match: ["/admin/products", "/admin/inventory", "/admin/categories"],
    children: [
      { label: "Inventory", href: "/admin/inventory" },
      { label: "Categories", href: "/admin/categories" },
    ],
  },
  {
    label: "Report",
    href: "/admin/reports",
    icon: BarChart3,
    match: ["/admin/reports", "/admin/finance", "/admin/customers"],
    children: [
      { label: "Finance", href: "/admin/finance" },
      { label: "GST", href: "/admin/reports/gst" },
      { label: "Sales", href: "/admin/reports" },
      { label: "Customer", href: "/admin/customers" },
    ],
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
  { label: "Support", href: "/admin/support", icon: LifeBuoy },
];

// Pinned in the footer, but part of the same accordion (owns /admin/logs).
const SETTINGS: NavItem = {
  label: "Settings",
  href: "/admin/settings",
  icon: Settings,
  match: ["/admin/settings", "/admin/logs"],
  children: [{ label: "Logs", href: "/admin/logs" }],
};

function matches(item: NavItem, pathname: string): boolean {
  return item.exact
    ? pathname === item.href
    : (item.match ?? [item.href]).some((m) => pathname.startsWith(m));
}

// The active child is the longest matching prefix, so nested hrefs like Sales
// (/admin/reports) vs GST (/admin/reports/gst) never both light up.
function childActiveHref(children: NavChild[], pathname: string): string | null {
  const best = children
    .filter((c) => pathname.startsWith(c.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return best?.href ?? null;
}

/** A top-level entry plus its collapsible children (Fragment so it flattens
 * into the mobile strip / desktop column of the parent nav). */
function NavGroup({
  item,
  pathname,
  open,
  onToggle,
}: {
  item: NavItem;
  pathname: string;
  open: boolean;
  onToggle: (key: string) => void;
}) {
  const active = matches(item, pathname);
  const kids = item.children ?? [];
  const hasKids = kids.length > 0;
  const activeChild = hasKids ? childActiveHref(kids, pathname) : null;

  return (
    <>
      <Link
        href={item.href}
        onClick={hasKids ? () => onToggle(item.href) : undefined}
        aria-expanded={hasKids ? open : undefined}
        className={cn(
          "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-accent-soft text-accent-bright"
            : "text-muted hover:bg-surface-2 hover:text-foreground",
        )}
      >
        <item.icon size={17} />
        {item.label}
        {hasKids ? (
          <ChevronDown
            size={15}
            aria-hidden
            className={cn(
              "ml-auto hidden shrink-0 transition-transform duration-200 md:block",
              open && "rotate-180",
            )}
          />
        ) : null}
      </Link>

      {hasKids ? (
        // Grid-rows 0fr→1fr gives a smooth open/close without measuring height.
        // `contents` on mobile lets the children flow into the horizontal strip.
        <div
          className={cn(
            "contents md:grid md:transition-[grid-template-rows] md:duration-200 md:ease-out",
            open ? "md:[grid-template-rows:1fr]" : "md:[grid-template-rows:0fr]",
          )}
        >
          <div className="contents md:flex md:flex-col md:gap-1 md:overflow-hidden">
            {kids.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className={cn(
                  "flex items-center whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:py-2 md:pl-10",
                  activeChild === c.href
                    ? "bg-accent-soft text-accent-bright md:bg-transparent"
                    : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function AdminNav() {
  const pathname = usePathname();

  // Which section's children are expanded (accordion — one at a time). Seeded
  // to the section you land in; opening one closes the others.
  const activeKey =
    [...NAV, SETTINGS].find((it) => matches(it, pathname))?.href ?? null;
  const [openKey, setOpenKey] = useState<string | null>(activeKey);

  // Auto-open the section when you navigate INTO a new one (but leave manual
  // toggles alone while you stay within the same section).
  const prevActive = useRef(activeKey);
  useEffect(() => {
    if (activeKey && activeKey !== prevActive.current) setOpenKey(activeKey);
    prevActive.current = activeKey;
  }, [activeKey]);

  const toggle = (key: string) =>
    setOpenKey((prev) => (prev === key ? null : key));

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

      <nav className="flex gap-1 overflow-x-auto md:min-h-0 md:flex-1 md:flex-col md:overflow-y-auto md:overflow-x-hidden">
        {NAV.map((item) => (
          <NavGroup
            key={item.href}
            item={item}
            pathname={pathname}
            open={openKey === item.href}
            onToggle={toggle}
          />
        ))}
        {/* Logs lives under Settings on desktop; keep it directly reachable in
            the mobile strip (the Settings block below is desktop-only). */}
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
        <NavGroup
          item={SETTINGS}
          pathname={pathname}
          open={openKey === SETTINGS.href}
          onToggle={toggle}
        />
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
