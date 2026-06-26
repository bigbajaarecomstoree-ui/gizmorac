import Link from "next/link";
import { ArrowRight, Star, Truck, ShieldCheck, Users } from "lucide-react";
import type { Product } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { ProductArt } from "@/components/product/product-art";
import { Price } from "@/components/product/price";
import { formatINR, discountPercent, shortTitle } from "@/lib/format";
import { TRUST_STATS } from "@/lib/constants";
import { getDealOfTheDay, getBestSellers } from "@/lib/data/queries";
import { cn } from "@/lib/utils";

const TRUST = [
  { icon: Users, value: TRUST_STATS.customers, label: "Customers" },
  { icon: Star, value: `${TRUST_STATS.rating}★`, label: "Rating" },
  { icon: Truck, value: "PAN India", label: "Shipping" },
  { icon: ShieldCheck, value: "Secure", label: "Checkout" },
];

function Callout({
  value,
  label,
  className,
  delay = 0,
}: {
  value: string;
  label: string;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "animate-float absolute rounded-lg border border-border-bright bg-surface/85 px-3 py-2 shadow-lg backdrop-blur",
        className,
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="readout text-sm font-semibold leading-none">{value}</div>
      <div className="tech-label mt-1 !text-[0.5625rem]">{label}</div>
    </div>
  );
}

function MiniCard({
  product,
  className,
  delay = 0,
}: {
  product: Product;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "animate-float-slow absolute w-36 overflow-hidden rounded-xl border border-border bg-surface/90 shadow-xl backdrop-blur",
        className,
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="aspect-[4/3]">
        <ProductArt art={product.art} />
      </div>
      <div className="p-2.5">
        <p className="truncate text-[0.7rem] font-medium text-muted">
          {shortTitle(product.name)}
        </p>
        <p className="readout mt-0.5 text-xs font-semibold">
          {formatINR(product.price)}
        </p>
      </div>
    </div>
  );
}

function Eyebrow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full border border-accent bg-accent px-3.5 py-1.5",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-on-accent shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
      <span className="tech-label !text-on-accent whitespace-nowrap !text-[0.5625rem] !tracking-[0.12em] sm:!text-[0.6875rem] sm:!tracking-[0.22em]">
        Precision gadgets · Made for India
      </span>
    </div>
  );
}

export async function Hero() {
  // Lead with the real Deal of the Day, backed by best-sellers for the floating
  // mini-cards. (Falls back gracefully if nothing is flagged yet.)
  const [deal, bestSellers] = await Promise.all([
    getDealOfTheDay(),
    getBestSellers(6),
  ]);
  const hero = deal ?? bestSellers[0] ?? null;
  const rest = bestSellers.filter((p) => p.id !== hero?.id);
  const [secondary, tertiary] = rest;
  const off = hero ? discountPercent(hero) : 0;

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="grid-ticks absolute inset-0 opacity-50" />
      <div className="glow-amber absolute -left-40 top-0 h-[600px] w-[600px] opacity-60" />
      <div className="glow-amber absolute -right-32 bottom-0 h-[500px] w-[500px] opacity-40" />

      <div className="shell relative grid items-center gap-6 pt-5 pb-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:pt-6 lg:pb-16">
        {/* Mobile/tablet: eyebrow leads, above the showcase. Hidden on desktop,
            where the eyebrow lives inside the left column instead. */}
        <Eyebrow className="order-1 lg:hidden" />

        {/* Left: thesis */}
        <div className="order-3 animate-rise lg:order-1">
          <Eyebrow className="mb-5 hidden lg:inline-flex" />

          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Smart gadgets that make everyday life{" "}
            <span className="text-accent">easier</span>.
          </h1>

          <p className="mt-5 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Premium gadgets designed for productivity, health, travel and everyday
            convenience — tested before dispatch, shipped across India.
          </p>

          <div className="mt-8 flex items-center gap-3">
            <Link
              href="/shop"
              className={cn(
                buttonVariants({ size: "lg" }),
                "flex-1 px-3 text-sm sm:flex-initial sm:px-7 sm:text-base",
              )}
            >
              Shop Now
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/shop?sort=popular"
              className={cn(
                buttonVariants({ variant: "highlight", size: "lg" }),
                "flex-1 px-3 text-sm sm:flex-initial sm:px-7 sm:text-base",
              )}
            >
              Best Sellers
              <ArrowRight size={18} />
            </Link>
          </div>

          <dl className="mt-10 grid max-w-md grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
            {TRUST.map((t) => (
              <div key={t.label} className="bg-surface/80 px-3 py-4 text-center">
                <t.icon
                  size={16}
                  className={cn(
                    "mx-auto mb-1.5",
                    t.label === "Rating" ? "text-highlight" : "text-accent",
                  )}
                />
                <dt className="text-sm font-semibold text-foreground">{t.value}</dt>
                <dd className="tech-label mt-0.5 !text-[0.5625rem]">{t.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Hero device showcase — sits between the eyebrow and the copy on
            mobile/tablet (order-2), and on the right on desktop. Cards shrink +
            spread out on mobile to avoid overlap; desktop keeps the original
            floating layout via the sm: overrides. */}
        <div className="relative order-2 mx-auto aspect-square w-full max-w-md sm:max-w-lg lg:order-2">
          {/* main device panel */}
          <div className="absolute inset-x-6 inset-y-10 overflow-hidden rounded-3xl border border-border-bright bg-surface shadow-2xl sm:inset-x-8 sm:inset-y-4">
            {hero ? <ProductArt art={hero.art} glyphClassName="!h-[40%] text-accent" /> : null}
          </div>

          {/* floating spec callouts */}
          <Callout
            value={`${off}% OFF`}
            label="Deal of the day"
            className="left-0 top-2 sm:top-10"
            delay={0}
          />
          <Callout
            value="Auto-stop"
            label="Set & forget"
            className="right-0 top-14 sm:right-2 sm:top-24"
            delay={1.2}
          />
          <Callout
            value="USB-C"
            label="Cordless"
            className="hidden bottom-24 left-2 sm:block"
            delay={0.6}
          />

          {/* floating product cards */}
          {secondary ? (
            <MiniCard
              product={secondary}
              className="right-0 top-[33%] w-24 sm:top-auto sm:-right-2 sm:bottom-6 sm:w-36"
              delay={0.4}
            />
          ) : null}
          {tertiary ? (
            <MiniCard
              product={tertiary}
              className="left-0 top-[30%] w-24 sm:top-auto sm:-left-6 sm:bottom-0 sm:w-36 lg:hidden xl:block"
              delay={1.6}
            />
          ) : null}

          {/* hero product nameplate */}
          {hero ? (
            <div className="absolute bottom-1 left-1/2 w-44 -translate-x-1/2 rounded-xl border border-border-bright bg-background/90 p-3 text-center shadow-xl backdrop-blur sm:bottom-8 sm:w-56">
              <p className="line-clamp-2 text-xs font-medium text-muted">
                {shortTitle(hero.name)}
              </p>
              <Price product={hero} size="sm" className="mt-1 justify-center" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
