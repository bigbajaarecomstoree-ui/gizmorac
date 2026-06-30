"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, BadgeCheck, Star } from "lucide-react";
import type { DeviceArt } from "@/lib/types";
import { ProductArt } from "./product-art";

export type SpotlightReview = {
  id: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  productName: string;
  productSlug: string;
  image: string | null;
  art: DeviceArt;
};

const KEY = "gizmorac.reviewSpotlightClosed";

/**
 * Floating social-proof popup (bottom-left) that rotates through real customer
 * reviews — thumbnail, stars, review snippet, author, GIZMORAC. Dismissible
 * (stays closed for the session). Desktop only; hidden on cart/checkout.
 */
export function ReviewSpotlight({ items }: { items: SpotlightReview[] }) {
  const pathname = usePathname();
  const [i, setI] = React.useState(0);
  const [show, setShow] = React.useState(false);
  const [closed, setClosed] = React.useState(true);

  React.useEffect(() => {
    if (sessionStorage.getItem(KEY)) return;
    setClosed(false);
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (closed || items.length <= 1) return;
    const id = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setI((p) => (p + 1) % items.length);
        setShow(true);
      }, 350);
    }, 7000);
    return () => clearInterval(id);
  }, [closed, items.length]);

  if (closed || items.length === 0) return null;
  if (pathname.startsWith("/checkout") || pathname.startsWith("/cart")) return null;

  const r = items[i];

  function close() {
    setClosed(true);
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={`fixed bottom-4 left-4 z-40 hidden w-72 transition-all duration-300 sm:block print:hidden ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <div className="relative flex gap-3 rounded-xl border border-border-bright bg-elevated/95 p-3 shadow-xl backdrop-blur">
        <button
          type="button"
          onClick={close}
          aria-label="Dismiss"
          className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-border bg-background text-muted shadow transition-colors hover:text-danger cursor-pointer"
        >
          <X size={13} />
        </button>

        <Link
          href={`/product/${r.productSlug}`}
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface"
          aria-label={r.productName}
        >
          {r.image ? (
            <Image src={r.image} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <ProductArt art={r.art} glyphClassName="!h-[44%]" />
          )}
        </Link>

        <div className="min-w-0">
          <div className="flex items-center gap-0.5 text-highlight">
            {Array.from({ length: 5 }).map((_, s) => (
              <Star
                key={s}
                size={12}
                className={s < Math.round(r.rating) ? "fill-current" : "text-border"}
              />
            ))}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-foreground">
            <span className="font-semibold">{r.title}</span> {r.body}
          </p>
          <Link
            href={`/product/${r.productSlug}`}
            className="mt-1 block truncate text-[0.7rem] text-muted transition-colors hover:text-accent"
          >
            {r.productName}
          </Link>
          <div className="mt-1 flex items-center gap-1.5 text-[0.7rem] text-faint">
            <span className="font-medium text-muted">{r.author}</span>
            {r.verified ? (
              <span className="inline-flex items-center gap-0.5 text-success">
                <BadgeCheck size={11} /> Verified
              </span>
            ) : null}
            <span className="ml-auto font-display text-[0.65rem] font-bold tracking-tight text-foreground/60">
              GIZMORAC
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
