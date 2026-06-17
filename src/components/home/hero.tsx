import Link from "next/link";
import { ArrowRight, Star, Truck, ShieldCheck, Users } from "lucide-react";
import type { Product } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { ProductArt } from "@/components/product/product-art";
import { Price } from "@/components/product/price";
import { formatINR, discountPercent } from "@/lib/format";
import { TRUST_STATS } from "@/lib/constants";
import { getProductBySlug } from "@/lib/data/queries";
import { cn } from "@/lib/utils";

const HERO_SLUGS = [
  "gizmorac-aeropump-150-tyre-inflator",
  "gizmorac-labelpro-x1-thermal-printer",
  "gizmorac-releaf-knee-pro-massager",
];

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
          {product.name.replace("GIZMORAC ", "")}
        </p>
        <p className="readout mt-0.5 text-xs font-semibold">
          {formatINR(product.price)}
        </p>
      </div>
    </div>
  );
}

export async function Hero() {
  const trio = await Promise.all(HERO_SLUGS.map((s) => getProductBySlug(s)));
  const [hero, secondary, tertiary] = trio.filter(Boolean) as Product[];
  const off = hero ? discountPercent(hero) : 0;

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="grid-ticks absolute inset-0 opacity-50" />
      <div className="glow-amber absolute -left-40 top-0 h-[600px] w-[600px] opacity-60" />
      <div className="glow-amber absolute -right-32 bottom-0 h-[500px] w-[500px] opacity-40" />

      <div className="shell relative grid items-center gap-12 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
        {/* Left: thesis */}
        <div className="animate-rise">
          <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-border bg-surface/60 px-3.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
            <span className="tech-label !text-muted">Precision gadgets · Made for India</span>
          </div>

          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Smart gadgets that make everyday life{" "}
            <span className="text-accent">easier</span>.
          </h1>

          <p className="mt-5 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Premium gadgets designed for productivity, health, travel and everyday
            convenience — tested before dispatch, shipped across India.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/shop" className={buttonVariants({ size: "lg" })}>
              Shop Now
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/shop?sort=popular"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Explore Best Sellers
            </Link>
          </div>

          <dl className="mt-10 grid max-w-md grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
            {TRUST.map((t) => (
              <div key={t.label} className="bg-surface/80 px-3 py-4 text-center">
                <t.icon size={16} className="mx-auto mb-1.5 text-accent" />
                <dt className="text-sm font-semibold text-foreground">{t.value}</dt>
                <dd className="tech-label mt-0.5 !text-[0.5625rem]">{t.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Hero device showcase — leads on mobile (order-first), sits on the right
            on desktop. Cards shrink + spread out on mobile to avoid overlap;
            desktop keeps the original floating layout via the sm: overrides. */}
        <div className="relative order-first mx-auto aspect-square w-full max-w-md sm:max-w-lg lg:order-none">
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
              <p className="text-xs font-medium text-muted">
                {hero.name.replace("GIZMORAC ", "")}
              </p>
              <Price product={hero} size="sm" className="mt-1 justify-center" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
