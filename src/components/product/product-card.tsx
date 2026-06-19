import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { discountPercent } from "@/lib/format";
import { ProductArt } from "./product-art";
import { RatingStars } from "./rating-stars";
import { Price } from "./price";
import { AddToCartButton } from "./add-to-cart-button";
import { BuyNowButton } from "./buy-now-button";
import { WishlistButton } from "./wishlist-button";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }: { product: Product }) {
  const off = discountPercent(product);
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
          <WishlistButton id={product.id} name={product.name} />
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
        <h3 className="text-[0.95rem] font-semibold leading-snug text-foreground">
          <Link
            href={`/product/${product.slug}`}
            className="transition-colors after:absolute after:inset-0 after:content-[''] hover:text-accent-bright"
          >
            {product.name}
          </Link>
        </h3>

        <RatingStars rating={product.rating} count={product.reviewCount} />

        <Price product={product} size="sm" className="mt-0.5" />

        <div className="relative z-20 mt-auto flex gap-2 pt-2">
          <BuyNowButton
            id={product.id}
            name={product.name}
            label="Buy Now"
            variant="primary"
            size="sm"
            className="flex-1"
          />
          <AddToCartButton
            id={product.id}
            name={product.name}
            variant="surface"
            size="sm"
            iconOnly
            className="w-11 shrink-0 px-0"
          />
        </div>
      </div>
    </article>
  );
}
