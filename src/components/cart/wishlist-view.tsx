"use client";

import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { useStore } from "@/components/store/store-provider";
import { ProductCard } from "@/components/product/product-card";
import { buttonVariants } from "@/components/ui/button";

export function WishlistView({
  products,
  recommended = [],
}: {
  products: Product[];
  recommended?: Product[];
}) {
  const { wishlist, mounted } = useStore();

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-muted">Loading your wishlist…</div>;
  }

  const saved = products.filter((p) => wishlist.includes(p.id));

  if (saved.length === 0) {
    return (
      <div>
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <Heart size={36} className="text-faint" />
          <h2 className="mt-4 text-xl font-semibold">Your wishlist is empty</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted">
            Tap the heart on any product to save it here for later.
          </p>
          <Link href="/shop" className={`${buttonVariants()} mt-6`}>
            Browse products
            <ArrowRight size={16} />
          </Link>
        </div>
        {recommended.length > 0 ? (
          <div className="mt-10">
            <h2 className="text-lg font-semibold">You may like</h2>
            <p className="mt-1 text-sm text-muted">Popular picks to get you started.</p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {recommended.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
      {saved.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
