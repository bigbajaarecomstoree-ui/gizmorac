import { Sparkles } from "lucide-react";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product/product-card";

/** A titled grid of recommended products (reused for wishlist + account recs). */
export function RecommendedProducts({
  title,
  subtitle,
  products,
}: {
  title: string;
  subtitle?: string;
  products: Product[];
}) {
  if (products.length === 0) return null;
  return (
    <section>
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Sparkles size={18} className="text-accent" /> {title}
      </h2>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
