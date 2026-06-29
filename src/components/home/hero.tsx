import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star, Truck, ShieldCheck, Users } from "lucide-react";
import type { Product } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { ProductArt } from "@/components/product/product-art";
import { WishlistButton } from "@/components/product/wishlist-button";
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

const CALLOUT_TONES = {
  surface: "border-border-bright bg-surface/85",
  dark: "border-transparent bg-foreground",
  purple: "border-transparent bg-accent",
} as const;

function Callout({
  value,
  label,
  className,
  delay = 0,
  tone = "surface",
}: {
  value: string;
  label: string;
  className?: string;
  delay?: number;
  tone?: keyof typeof CALLOUT_TONES;
}) {
  const onColor = tone !== "surface";
  return (
    <div
      className={cn(
        "animate-float absolute rounded-lg border px-3 py-2 shadow-lg backdrop-blur",
        CALLOUT_TONES[tone],
        className,
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={cn("readout text-sm font-semibold leading-none", onColor && "text-white")}>
        {value}
      </div>
      <div className={cn("tech-label mt-1 !text-[0.5625rem]", onColor && "!text-white/65")}>
        {label}
      </div>
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
        "animate-float-slow group absolute w-36 overflow-hidden rounded-xl border border-border bg-surface/90 shadow-xl backdrop-blur transition-colors hover:border-border-bright",
        className,
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Heart sits above the link overlay so it toggles wishlist without navigating. */}
      <WishlistButton
        id={product.id}
        name={shortTitle(product.name)}
        className="absolute right-2 top-2 z-20 h-7 w-7 border-danger/30 bg-background/80 text-danger hover:border-danger hover:text-danger"
      />
      <Link
        href={`/product/${product.slug}`}
        aria-label={shortTitle(product.name)}
        className="block after:absolute after:inset-0 after:content-['']"
      >
        <div className="relative aspect-[4/3]">
          {product.image ? (
            <Image
              src={product.image}
              alt={shortTitle(product.name)}
              fill
              sizes="144px"
              className="object-cover"
            />
          ) : (
            <ProductArt art={product.art} />
          )}
        </div>
        <div className="p-2.5">
          <p className="truncate text-[0.7rem] font-medium text-muted">
            {shortTitle(product.name)}
          </p>
          <p className="readout mt-0.5 text-xs font-semibold text-danger">
            {formatINR(product.price)}
          </p>
        </div>
      </Link>
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
    <section className="relative flex min-h-[calc(100svh-6rem)] flex-col justify-center overflow-hidden border-b border-border">
      <div className="grid-ticks absolute inset-0 opacity-50" />
      <div className="glow-amber absolute -left-40 top-0 h-[600px] w-[600px] opacity-60" />
      <div className="glow-amber absolute -right-32 bottom-0 h-[500px] w-[500px] opacity-40" />

      <div className="shell relative grid w-full items-center gap-6 pt-5 pb-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:pt-6 lg:pb-16">
        {/* Mobile/tablet: eyebrow leads, above the showcase. Hidden on desktop,
            where the eyebrow lives inside the left column instead. */}
        <Eyebrow className="order-1 justify-self-start lg:hidden" />

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
                "group flex-1 px-3 text-sm sm:flex-initial sm:px-7 sm:text-base",
              )}
            >
              Shop Now
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/shop?sort=popular"
              className={cn(
                buttonVariants({ variant: "highlight", size: "lg" }),
                "group flex-1 px-3 text-sm sm:flex-initial sm:px-7 sm:text-base",
              )}
            >
              Best Sellers
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
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
        <div className="relative order-2 mx-auto aspect-square w-full max-w-md sm:max-w-lg lg:ml-auto lg:order-2">
          {/* main device panel */}
          <div className="absolute inset-x-6 inset-y-10 overflow-hidden rounded-3xl border border-border-bright bg-surface shadow-2xl sm:inset-x-8 sm:inset-y-4">
            {hero ? (
              hero.image ? (
                <Image
                  src={hero.image}
                  alt={shortTitle(hero.name)}
                  fill
                  sizes="(min-width: 1024px) 45vw, 90vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <ProductArt art={hero.art} glyphClassName="!h-[40%] text-accent" />
              )
            ) : null}
            {hero ? (
              <Link
                href={`/product/${hero.slug}`}
                aria-label={shortTitle(hero.name)}
                className="absolute inset-0"
              />
            ) : null}
          </div>

          {/* floating spec callouts */}
          <Callout
            value={`${off}% OFF`}
            label="Deal of the day"
            tone="dark"
            className="left-0 top-2 sm:top-10"
            delay={0}
          />
          <Callout
            value="Auto-stop"
            label="Set & forget"
            tone="purple"
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
              className="bottom-0 right-0 w-[5.5rem] sm:bottom-6 sm:-right-2 sm:w-36"
              delay={0.4}
            />
          ) : null}
          {tertiary ? (
            <MiniCard
              product={tertiary}
              className="bottom-0 left-0 w-[5.5rem] sm:bottom-0 sm:-left-6 sm:w-36 lg:hidden xl:block"
              delay={1.6}
            />
          ) : null}

          {/* hero product nameplate */}
          {hero ? (
            <Link
              href={`/product/${hero.slug}`}
              className="absolute bottom-2 left-1/2 z-10 w-36 -translate-x-1/2 rounded-xl border border-border-bright bg-background/90 p-2.5 text-center shadow-xl backdrop-blur transition-colors hover:border-accent sm:bottom-8 sm:w-56 sm:p-3"
            >
              <p className="line-clamp-2 text-xs font-medium text-muted">
                {shortTitle(hero.name)}
              </p>
              <Price product={hero} size="sm" className="mt-1 justify-center" />
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
