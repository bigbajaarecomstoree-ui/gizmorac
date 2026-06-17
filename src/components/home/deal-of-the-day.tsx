import Link from "next/link";
import { Zap } from "lucide-react";
import { getDealOfTheDay } from "@/lib/data/queries";
import { discountPercent, savings } from "@/lib/format";
import { ProductArt } from "@/components/product/product-art";
import { Price } from "@/components/product/price";
import { RatingStars } from "@/components/product/rating-stars";
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
  // Simulated limited-stock urgency, clamped to a believable 60-92% range.
  const claimed = Math.max(60, Math.min(92, 100 - Math.round((deal.stock / 120) * 100)));

  return (
    <section className="shell py-8 sm:py-20">
      <div className="relative overflow-hidden rounded-2xl border border-border-bright bg-surface">
        <div className="grid-ticks absolute inset-0 opacity-40" />
        <div className="glow-amber absolute -right-20 -top-20 h-96 w-96 opacity-50" />

        <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-2">
          {/* product */}
          <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background">
            <ProductArt art={deal.art} sku={deal.sku} glyphClassName="text-accent" />
            <Badge
              variant="accent"
              size="md"
              className="absolute left-4 top-4 font-semibold"
            >
              {off}% OFF
            </Badge>
          </div>

          {/* details */}
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent-dim/40 bg-accent-soft px-3 py-1.5">
              <Zap size={13} className="text-accent-bright" />
              <span className="tech-label !text-accent-bright">Deal of the day</span>
            </div>

            <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
              {deal.name}
            </h2>

            <div className="mt-3">
              <RatingStars rating={deal.rating} count={deal.reviewCount} size="md" />
            </div>

            <Price product={deal} size="lg" className="mt-5" />
            <p className="mt-1 text-sm text-success">
              You save {formatINR(savings(deal))}
            </p>

            {/* limited stock */}
            <div className="mt-6 max-w-sm">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted">Selling fast</span>
                <span className="font-mono text-accent-bright">{claimed}% claimed</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent-dim to-accent"
                  style={{ width: `${claimed}%` }}
                />
              </div>
            </div>

            {/* countdown */}
            <div className="mt-7">
              <p className="tech-label mb-3">Offer ends in</p>
              <Countdown target={endOfTodayMs()} />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <AddToCartButton
                id={deal.id}
                name={deal.name}
                label="Add to Cart"
                variant="primary"
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
