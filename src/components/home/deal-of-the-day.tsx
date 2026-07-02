import Image from "next/image";
import {
  Zap,
  Flame,
  Truck,
  ShieldCheck,
  RefreshCw,
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
import { Tilt } from "@/components/ui/tilt";
import { Countdown } from "./countdown";

/** End of the current day IN IST (the store's clock) — not the server's
 * timezone, which on a UTC host would end the "day" at 5:29am IST. */
function endOfTodayMs() {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30, no DST
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  ist.setUTCHours(23, 59, 59, 999);
  return ist.getTime() - IST_OFFSET_MS;
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
  // Marketing urgency counters: baselines that grow with real sales.
  const bought = 500 + sold; // "this week" social proof
  const soldToday = 40 + sold; // "today" urgency banner

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
    { icon: RefreshCw, title: "Easy Returns", sub: "Hassle free" },
  ];

  const avatarGradients = [
    "from-accent to-[#a855f7]",
    "from-highlight to-[#f59e0b]",
    "from-success to-emerald-400",
  ];

  return (
    <section className="shell py-6 sm:py-10">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_24px_64px_-44px_rgba(0,0,0,0.3)]">
        <div className="grid-ticks absolute inset-0 opacity-25" />

        <div className="relative grid items-center gap-6 p-5 sm:p-8 lg:grid-cols-2">
          {/* product showcase */}
          <Tilt className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-sm sm:max-w-lg lg:max-w-2xl">
            {deal.image ? (
              <Image
                src={deal.image}
                alt={title}
                fill
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="object-cover"
                priority
              />
            ) : (
              <ProductArt art={deal.art} glyphClassName="!h-[60%] !max-h-96 text-accent" />
            )}

            <Badge variant="accent" size="md" className="absolute left-4 top-4 font-semibold shadow-md">
              {off}% OFF
            </Badge>

            <WishlistButton
              id={deal.id}
              name={title}
              className="absolute right-4 top-4 h-10 w-10 shadow-md"
            />

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
                <p className="font-bold text-foreground">{formatCount(bought)} bought</p>
                <p className="text-faint">this week</p>
              </div>
            </div>
          </Tilt>

          {/* details */}
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1.5">
                <Zap size={13} className="text-highlight" />
                <span className="tech-label !text-white">Deal of the day</span>
              </div>
              <span className="text-sm font-semibold text-accent-bright">Limited time offer</span>
            </div>

            <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              {title}
            </h2>

            <div className="mt-2 flex items-center gap-2">
              <RatingStars rating={deal.rating} count={deal.reviewCount} size="md" />
              <span className="text-sm text-faint">Reviews</span>
            </div>

            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-3">
                <Price product={deal} size="lg" tone="ink" showDiscount={false} />
                <Badge variant="accent" size="sm" className="font-semibold">
                  {off}% OFF
                </Badge>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-success">
                You save {formatINR(savings(deal))}
              </p>
            </div>

            <div className="my-5 h-px w-full bg-border" />

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

            {/* urgency — always shown */}
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-danger/5 px-4 py-3 shadow-sm ring-1 ring-danger/20">
              <Flame size={18} className="shrink-0 text-danger" />
              <p className="text-sm font-semibold leading-snug text-foreground">
                Hurry! Over{" "}
                <span className="font-extrabold text-danger">{formatCount(soldToday)}</span>{" "}
                sold today — don&apos;t miss out!
              </p>
            </div>

            {/* countdown */}
            <div className="mt-5">
              <p className="tech-label mb-3">Offer ends in</p>
              <Countdown target={endOfTodayMs()} />
            </div>

            {/* CTAs — side by side (Add to Cart first, then Buy Now) */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <AddToCartButton
                id={deal.id}
                name={title}
                label="Add to Cart"
                variant="highlight"
                size="lg"
                iconSize={20}
                className="w-full gap-2 px-3 text-sm sm:gap-2.5 sm:px-7 sm:text-base [&_svg]:shrink-0"
              />
              <BuyNowButton
                id={deal.id}
                name={title}
                label="Buy Now"
                variant="primary"
                size="lg"
                iconSize={20}
                className="w-full gap-2 px-3 text-sm sm:gap-2.5 sm:px-7 sm:text-base [&_svg]:shrink-0"
              />
            </div>

            {/* trust row */}
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
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
              {[
                { src: "/payments/visa.svg", alt: "Visa" },
                { src: "/payments/mastercard.svg", alt: "Mastercard" },
                { src: "/payments/upi.svg", alt: "UPI" },
              ].map((p) => (
                <span
                  key={p.alt}
                  className="grid h-8 w-12 place-items-center rounded-md bg-surface px-2 ring-1 ring-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.alt} className="max-h-4 w-auto object-contain" />
                </span>
              ))}
              <span className="rounded-md bg-accent-soft px-2.5 py-1 text-center text-[0.625rem] font-bold uppercase leading-tight tracking-wide text-accent-bright ring-1 ring-accent-dim/50">
                COD
                <br />
                Available
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
