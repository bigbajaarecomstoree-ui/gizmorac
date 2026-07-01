import type { Product } from "@/lib/types";
import { ProductCard } from "./product-card";
import { Stagger, StaggerItem } from "@/components/motion/motion-primitives";
import { cn } from "@/lib/utils";

export function ProductGrid({
  products,
  className,
  animate = false,
}: {
  products: Product[];
  className?: string;
  /** Cascade the cards in on scroll (used on the landing page). */
  animate?: boolean;
}) {
  const gridCls = cn("grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4", className);

  if (!animate) {
    return (
      <div className={gridCls}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    );
  }

  return (
    <Stagger className={gridCls}>
      {products.map((p) => (
        <StaggerItem key={p.id} className="h-full">
          <ProductCard product={p} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
