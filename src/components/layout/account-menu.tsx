"use client";

import * as React from "react";
import Link from "next/link";
import { User, Settings, LayoutGrid, Heart, LogOut, ChevronDown } from "lucide-react";
import { logoutAction } from "@/lib/customer/actions";

const ITEM =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground";

/** Header account control: a Login link when signed out, an avatar dropdown
 *  (My account · Settings · Wishlist · Log out) when signed in. */
export function AccountMenu({ name }: { name?: string | null }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!name) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        aria-label="Log in"
      >
        <User size={18} />
        <span className="hidden sm:inline">Login</span>
      </Link>
    );
  }

  const parts = name.trim().split(/\s+/);
  const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  const first = parts[0];
  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <span className="grid size-8 place-items-center rounded-full bg-accent text-xs font-bold text-on-accent">
          {initials.toUpperCase()}
        </span>
        <span className="hidden max-w-24 truncate sm:inline">Hi, {first}</span>
        <ChevronDown
          size={15}
          className={`hidden shrink-0 transition-transform sm:inline ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-[60] mt-2 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-xl"
        >
          <div className="mb-1 border-b border-border px-3 py-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="text-xs text-faint">Welcome back</p>
          </div>
          <Link href="/account" onClick={close} className={ITEM}>
            <LayoutGrid size={16} /> My account
          </Link>
          <Link href="/account/settings" onClick={close} className={ITEM}>
            <Settings size={16} /> Settings
          </Link>
          <Link href="/wishlist" onClick={close} className={ITEM}>
            <Heart size={16} /> Wishlist
          </Link>
          <div className="my-1 border-t border-border" />
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
            >
              <LogOut size={16} /> Log out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
