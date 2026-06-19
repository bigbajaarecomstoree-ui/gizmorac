"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tags,
  Boxes,
  Receipt,
  Users,
  Ticket,
  BarChart3,
  Settings,
  Store,
  LogOut,
} from "lucide-react";
import { logoutAction } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Products", href: "/admin/products", icon: Package, exact: false },
  { label: "Categories", href: "/admin/categories", icon: Tags, exact: false },
  { label: "Inventory", href: "/admin/inventory", icon: Boxes, exact: false },
  { label: "Orders", href: "/admin/orders", icon: Receipt, exact: false },
  { label: "Customers", href: "/admin/customers", icon: Users, exact: false },
  { label: "Promotions", href: "/admin/promotions", icon: Ticket, exact: false },
  { label: "Reports", href: "/admin/reports", icon: BarChart3, exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

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

      <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {NAV.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
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
          );
        })}
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
            isActive("/admin/settings", false)
              ? "bg-accent-soft text-accent-bright"
              : "text-muted hover:bg-surface-2 hover:text-foreground",
          )}
        >
          <Settings size={17} />
          Settings
        </Link>
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
