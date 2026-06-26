import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { discountPercent, shortTitle } from "@/lib/format";
import { ProductArt } from "./product-art";
import { RatingStars } from "./rating-stars";
import { Price } from "./price";
import { AddToCartButton } from "./add-to-cart-button";
import { BuyNowButton } from "./buy-now-button";
import { WishlistButton } from "./wishlist-button";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }: { product: Product }) {
  const off = discountPercent(product);
  const title = shortTitle(product.name);
  const outOfStock = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 10;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all duration-300 hover:border-border-bright hover:shadow-[0_14px_34px_-16px_rgba(0,0,0,0.22)]">
      <div className="relative aspect-square overflow-hidden">
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <ProductArt
              art={product.art}
              glyphClassName="!h-[52%] !max-h-44 group-hover:text-accent"
            />
          )}
        </div>

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {off > 0 ? (
            <Badge variant="accent" size="sm" className="font-semibold">
              {off}% OFF
            </Badge>
          ) : null}
          {product.badges.includes("Best Seller") ? (
            <Badge variant="soft">Best Seller</Badge>
          ) : null}
        </div>

        <div className="absolute right-3 top-3 z-20">
          <WishlistButton id={product.id} name={title} />
        </div>

        {outOfStock ? (
          <div className="absolute inset-x-0 bottom-0 bg-background/80 py-1.5 text-center text-xs font-medium text-danger backdrop-blur">
            Out of stock
          </div>
        ) : lowStock ? (
          <div className="absolute inset-x-0 bottom-0 bg-background/70 py-1.5 text-center text-[0.6875rem] font-medium text-accent-bright backdrop-blur">
            Only {product.stock} left
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <h3 className="line-clamp-2 text-[0.95rem] font-semibold leading-snug text-foreground">
          <Link
            href={`/product/${product.slug}`}
            title={product.name}
            className="transition-colors after:absolute after:inset-0 after:content-[''] hover:text-accent-bright"
          >
            {title}
          </Link>
        </h3>

        <RatingStars rating={product.rating} count={product.reviewCount} />

        <Price product={product} size="sm" className="mt-0.5" />

        {/* On the narrow 2-col mobile grid the buttons stack so neither is
            clipped; from sm up (wider cards) they sit side by side. */}
        <div className="relative z-20 mt-auto flex flex-col gap-2 pt-2 sm:flex-row">
          <BuyNowButton
            id={product.id}
            name={title}
            label="Buy Now"
            variant="primary"
            size="sm"
            className="w-full sm:flex-1"
          />
          {/* mobile: full-width with label */}
          <AddToCartButton
            id={product.id}
            name={title}
            variant="highlight"
            size="sm"
            className="w-full sm:hidden"
          />
          {/* sm+: compact icon-only square */}
          <AddToCartButton
            id={product.id}
            name={title}
            variant="highlight"
            size="sm"
            iconOnly
            className="hidden sm:inline-flex sm:w-11 sm:shrink-0 sm:px-0"
          />
        </div>
      </div>
    </article>
  );
}
