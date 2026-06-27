import {
  Zap,
  Flame,
  Truck,
  ShieldCheck,
  RotateCcw,
  Lock,
  IndianRupee,
  Users,
  Sparkles,
} from "lucide-react";
import { getDealOfTheDay } from "@/lib/data/queries";
import { getUnitsSoldForProduct } from "@/lib/data/orders";
import {
  discountPercent,
  savings,
  shortTitle,
  formatCount,
  formatINR,
} from "@/lib/format";
import { ProductArt } from "@/components/product/product-art";
import { Price } from "@/components/product/price";
import { RatingStars } from "@/components/product/rating-stars";
import { BuyNowButton } from "@/components/product/buy-now-button";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { WishlistButton } from "@/components/product/wishlist-button";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "./countdown";

function endOfTodayMs() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export async function DealOfTheDay() {
  const deal = await getDealOfTheDay();
  if (!deal) return null;

  const off = discountPercent(deal);
  const title = shortTitle(deal.name);

  // Real stock-based urgency: % claimed = units sold of the (sold + remaining) total.
  const sold = await getUnitsSoldForProduct(deal.id);
  const remaining = deal.stock;
  const total = sold + remaining;
  const claimed = total > 0 ? Math.round((sold / total) * 100) : remaining === 0 ? 100 : 0;

  const warranty =
    deal.warrantyMonths >= 12
      ? `${Math.round(deal.warrantyMonths / 12)} Year Warranty`
      : deal.warrantyMonths > 0
        ? `${deal.warrantyMonths}-Month Warranty`
        : "Quality Assured";
  const feats = (deal.highlights.length ? deal.highlights : deal.features).slice(0, 3);

  const trust = [
    { icon: Truck, title: "Free Delivery", sub: "Pan India" },
    { icon: ShieldCheck, title: warranty, sub: "Guaranteed" },
    { icon: RotateCcw, title: "Easy Returns", sub: "Hassle free" },
  ];

  const avatarGradients = [
    "from-accent to-[#a855f7]",
    "from-highlight to-[#f59e0b]",
    "from-success to-emerald-400",
  ];

  return (
    <section className="shell py-8 sm:py-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent-soft/70 via-surface to-highlight/15 ring-1 ring-accent/15 shadow-[0_30px_80px_-45px_rgba(109,40,217,0.55)]">
        <div className="grid-ticks absolute inset-0 opacity-25" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-highlight/25 blur-3xl" />

        <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-2">
          {/* product showcase */}
          <div className="relative mx-auto aspect-square w-full max-w-xl overflow-hidden rounded-2xl border border-border-bright bg-gradient-to-br from-surface to-accent-soft/60 shadow-sm">
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="h-2/3 w-2/3 rounded-full bg-accent/10 blur-3xl" />
            </div>
            <ProductArt art={deal.art} glyphClassName="!h-[46%] !max-h-64 text-accent" />

            <Badge variant="accent" size="md" className="absolute left-4 top-4 font-semibold shadow-md">
              {off}% OFF
            </Badge>

            {/* floating feature callouts (from the product's real highlights) */}
            {feats.length > 0 ? (
              <div className="absolute right-3 top-1/2 hidden w-44 -translate-y-1/2 flex-col gap-2.5 lg:flex">
                {feats.map((f) => (
                  <span
                    key={f}
                    className="flex items-center gap-2 rounded-xl bg-surface/90 px-3 py-2 text-xs font-medium text-foreground shadow-md ring-1 ring-border backdrop-blur"
                  >
                    <Sparkles size={13} className="shrink-0 text-accent" />
                    <span className="line-clamp-1">{f}</span>
                  </span>
                ))}
              </div>
            ) : null}

            {/* social proof */}
            {sold > 0 ? (
              <div className="absolute bottom-3 left-3 flex items-center gap-2.5 rounded-2xl bg-surface/90 px-3 py-2 shadow-md ring-1 ring-border backdrop-blur">
                <div className="flex -space-x-2">
                  {avatarGradients.map((g, i) => (
                    <span
                      key={i}
                      className={`h-6 w-6 rounded-full bg-gradient-to-br ${g} ring-2 ring-surface`}
                    />
                  ))}
                </div>
                <div className="text-xs leading-tight">
                  <p className="font-bold text-foreground">{formatCount(sold)} bought</p>
                  <p className="text-faint">recently</p>
                </div>
              </div>
            ) : null}
          </div>

          {/* details */}
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1.5">
                <Zap size={13} className="text-highlight" />
                <span className="tech-label !text-white">Deal of the day</span>
              </div>
              <span className="text-sm font-semibold text-accent-bright">Limited time offer</span>
            </div>

            <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight sm:text-4xl">
              {title}
            </h2>

            <div className="mt-3 flex items-center gap-2">
              <RatingStars rating={deal.rating} count={deal.reviewCount} size="md" />
              <span className="text-sm text-faint">Reviews</span>
            </div>

            <div className="mt-5">
              <Price product={deal} size="lg" />
              <p className="mt-1.5 text-sm font-semibold text-success">
                You save {formatINR(savings(deal))}
              </p>
            </div>

            <div className="my-6 h-px w-full bg-border" />

            {/* claimed progress + live stock */}
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-border">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-highlight transition-[width] duration-500"
                style={{ width: `${claimed}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-muted">{claimed}% claimed</span>
              {remaining > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-danger">
                  <Flame size={13} /> Only {remaining} left in stock
                </span>
              ) : (
                <span className="font-semibold text-danger">Sold out</span>
              )}
            </div>

            {/* urgency */}
            {sold > 0 ? (
              <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-sm ring-1 ring-accent-dim/60">
                <Flame size={18} className="shrink-0 text-accent" />
                <p className="text-sm font-semibold leading-snug text-accent-bright">
                  Hurry! Over{" "}
                  <span className="text-lg font-extrabold">{formatCount(sold)}</span> already
                  sold — don&apos;t miss out!
                </p>
              </div>
            ) : null}

            {/* countdown */}
            <div className="mt-6">
              <p className="tech-label mb-3">Offer ends in</p>
              <Countdown target={endOfTodayMs()} />
            </div>

            {/* CTAs */}
            <div className="mt-7 flex flex-wrap items-stretch gap-3">
              <BuyNowButton id={deal.id} name={title} label="Buy Now" variant="primary" size="lg" />
              <AddToCartButton id={deal.id} name={title} label="Add to Cart" variant="highlight" size="lg" />
              <WishlistButton
                id={deal.id}
                name={title}
                className="h-12 w-12 rounded-[var(--radius)] border-border-bright"
              />
            </div>

            {/* trust row */}
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-5">
              {trust.map((t) => (
                <div key={t.title} className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                    <t.icon size={17} />
                  </span>
                  <div className="min-w-0 text-xs">
                    <p className="truncate font-semibold text-foreground">{t.title}</p>
                    <p className="truncate text-faint">{t.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* bottom trust strip */}
        <div className="relative border-t border-border bg-surface/50 px-6 py-4 sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
            <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
              {[
                { icon: Lock, title: "Secure Checkout", sub: "100% protected" },
                { icon: IndianRupee, title: "Pay on Delivery", sub: "Available" },
                { icon: Users, title: "Trusted by 10,000+", sub: "Happy customers" },
              ].map((t) => (
                <div key={t.title} className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
                    <t.icon size={16} />
                  </span>
                  <div className="text-xs leading-tight">
                    <p className="font-semibold text-foreground">{t.title}</p>
                    <p className="text-faint">{t.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {["UPI", "Cards", "COD"].map((m) => (
                <span
                  key={m}
                  className="rounded-md bg-surface px-2.5 py-1 text-[0.6875rem] font-bold text-muted ring-1 ring-border"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
