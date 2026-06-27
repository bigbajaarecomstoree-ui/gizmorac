import Link from "next/link";
import { Zap, Flame } from "lucide-react";
import { getDealOfTheDay } from "@/lib/data/queries";
import { getUnitsSoldForProduct } from "@/lib/data/orders";
import { discountPercent, savings, shortTitle } from "@/lib/format";
import { ProductArt } from "@/components/product/product-art";
import { Price } from "@/components/product/price";
import { RatingStars } from "@/components/product/rating-stars";
import { BuyNowButton } from "@/components/product/buy-now-button";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "./countdown";
import { formatINR } from "@/lib/format";

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

  return (
    <section className="shell py-8 sm:py-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent-soft/70 via-surface to-highlight/15 ring-1 ring-accent/15 shadow-[0_30px_80px_-45px_rgba(109,40,217,0.55)]">
        <div className="grid-ticks absolute inset-0 opacity-25" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-highlight/25 blur-3xl" />

        <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-2">
          {/* product */}
          <div className="relative mx-auto aspect-square w-full max-w-xl overflow-hidden rounded-2xl border border-border-bright bg-gradient-to-br from-surface to-accent-soft/60 shadow-sm">
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="h-2/3 w-2/3 rounded-full bg-accent/10 blur-3xl" />
            </div>
            <ProductArt
              art={deal.art}
              glyphClassName="!h-[48%] !max-h-64 text-accent"
            />
            <Badge
              variant="accent"
              size="md"
              className="absolute left-4 top-4 font-semibold shadow-md"
            >
              {off}% OFF
            </Badge>
          </div>

          {/* details */}
          <div className="flex flex-col">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1.5">
              <Zap size={13} className="text-highlight" />
              <span className="tech-label !text-white">Deal of the day</span>
            </div>

            <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              {title}
            </h2>

            <div className="mt-3">
              <RatingStars rating={deal.rating} count={deal.reviewCount} size="md" />
            </div>

            <div className="mt-5">
              <Price product={deal} size="lg" />
              <p className="mt-1.5 text-sm font-medium text-success">
                You save {formatINR(savings(deal))}
              </p>
            </div>

            <div className="my-6 h-px w-full bg-border" />

            {/* limited stock — driven by real inventory */}
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-muted">Selling fast</span>
              <span className="font-mono font-semibold text-accent-bright">
                {claimed}% claimed
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-border">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-highlight transition-[width] duration-500"
                style={{ width: `${claimed}%` }}
              />
            </div>

            <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-sm ring-1 ring-accent-dim/60">
              <Flame size={18} className="shrink-0 text-accent" />
              {remaining > 0 ? (
                <p className="text-sm font-semibold leading-snug text-accent-bright">
                  Hurry! Only{" "}
                  <span className="readout align-middle text-lg font-extrabold">
                    {remaining}
                  </span>{" "}
                  left in stock — valid till stock lasts.
                </p>
              ) : (
                <p className="text-sm font-semibold text-accent-bright">
                  Out of stock — this deal has sold out.
                </p>
              )}
            </div>

            {/* countdown */}
            <div className="mt-6">
              <p className="tech-label mb-3">Offer ends in</p>
              <Countdown target={endOfTodayMs()} />
            </div>

            {/* CTAs */}
            <div className="mt-7 flex flex-wrap gap-3">
              <BuyNowButton
                id={deal.id}
                name={title}
                label="Buy Now"
                variant="primary"
                size="lg"
              />
              <AddToCartButton
                id={deal.id}
                name={title}
                label="Add to Cart"
                variant="highlight"
                size="lg"
              />
              <Link
                href={`/product/${deal.slug}`}
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                View details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
