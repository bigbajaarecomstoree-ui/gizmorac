"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, ChevronDown, Package, Ticket, Tags, Boxes } from "lucide-react";

const ITEMS = [
  { label: "New product", href: "/admin/products/new", icon: Package },
  { label: "New promotion", href: "/admin/promotions/new", icon: Ticket },
  { label: "New category", href: "/admin/categories/new", icon: Tags },
  { label: "Manage inventory", href: "/admin/inventory", icon: Boxes },
];

/** Top-right "Create" dropdown — one entry point for the common add actions. */
export function DashboardCreateMenu() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
      >
        <Plus size={16} /> Create
        <ChevronDown size={14} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-border bg-surface py-1 text-sm shadow-lg"
          >
            {ITEMS.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-surface-2"
              >
                <it.icon size={15} className="text-muted" /> {it.label}
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
