"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronRight, Heart, Menu, Search, Settings, ShoppingCart, User, X } from "lucide-react";
import { useStore } from "@/components/store/store-provider";
import { AccountMenu } from "@/components/layout/account-menu";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Shop All", href: "/shop" },
  { label: "Health", href: "/shop?category=health-devices" },
  { label: "Office", href: "/shop?category=office-solutions" },
  { label: "Car", href: "/shop?category=car-accessories" },
  { label: "Deals", href: "/shop?sort=discount" },
];

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[0.625rem] font-semibold text-on-accent">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function SiteHeader({
  customerName,
  announcement,
  announcementScroll = false,
}: {
  customerName?: string | null;
  announcement?: string | null;
  announcementScroll?: boolean;
}) {
  const router = useRouter();
  const { cartCount, wishlistCount, mounted } = useStore();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-50">
      {/* announcement strip — marquee (right→left) when scrolling is on, else centered */}
      {announcement ? (
        <div className="bg-accent text-on-accent">
          {announcementScroll ? (
            <div className="h-8 overflow-hidden">
              <div className="animate-marquee inline-block whitespace-nowrap pl-[100%] leading-8 will-change-transform">
                <span className="tech-label !text-on-accent">{announcement}</span>
              </div>
            </div>
          ) : (
            <div className="shell flex h-8 items-center justify-center">
              <p className="tech-label !text-on-accent truncate text-center">{announcement}</p>
            </div>
          )}
        </div>
      ) : null}

      <div
        className={cn(
          "border-b border-black/10 bg-highlight transition-shadow duration-300",
          scrolled ? "shadow-md" : "",
        )}
      >
        <div className="shell flex h-16 items-center gap-2 sm:gap-4">
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-foreground/80 hover:bg-black/5 hover:text-foreground lg:hidden cursor-pointer"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link href="/" className="flex shrink-0 items-center gap-1" aria-label="GIZMORAC home">
            <Image
              src="/logo.png"
              alt=""
              width={523}
              height={586}
              priority
              className="hidden h-9 w-auto object-contain min-[380px]:block"
            />
            <span className="font-display text-lg font-bold tracking-tight">
              GIZMO<span className="text-accent">RAC</span>
            </span>
          </Link>

          <nav className="ml-2 hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-black/5 hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <form
            onSubmit={submitSearch}
            className="ml-auto hidden max-w-xs flex-1 items-center md:flex"
            role="search"
          >
            <div className="relative w-full">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search gadgets…"
                aria-label="Search products"
                className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-0">
            <AccountMenu name={customerName} />
            <Link
              href="/wishlist"
              className="relative grid h-10 w-10 place-items-center rounded-lg text-foreground/80 transition-colors hover:bg-black/5 hover:text-foreground"
              aria-label="Wishlist"
            >
              <Heart size={20} />
              {mounted ? <CountBadge count={wishlistCount} /> : null}
            </Link>
            <Link
              href="/cart"
              className="relative grid h-10 w-10 place-items-center rounded-lg text-foreground/80 transition-colors hover:bg-black/5 hover:text-foreground"
              aria-label="Cart"
            >
              <ShoppingCart size={20} />
              {mounted ? <CountBadge count={cartCount} /> : null}
            </Link>
          </div>
        </div>
      </div>

      {/* mobile menu */}
      {open ? (
        <div className="border-b border-border bg-background lg:hidden">
          <div className="shell flex flex-col gap-1 py-4">
            <form onSubmit={submitSearch} className="mb-2" role="search">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
                />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search gadgets…"
                  aria-label="Search products"
                  className="h-11 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none"
                />
              </div>
            </form>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground"
              >
                {item.label}
                <ChevronRight size={16} className="text-faint" />
              </Link>
            ))}
            <Link
              href={customerName ? "/account" : "/login"}
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center justify-between rounded-lg border-t border-border px-3 py-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                <User size={16} />
                {customerName ? `Hi, ${customerName} — My account` : "Login / Sign up"}
              </span>
              <ChevronRight size={16} className="text-faint" />
            </Link>
            {customerName ? (
              <Link
                href="/account/settings"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground"
              >
                <span className="flex items-center gap-2">
                  <Settings size={16} /> Settings
                </span>
                <ChevronRight size={16} className="text-faint" />
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
