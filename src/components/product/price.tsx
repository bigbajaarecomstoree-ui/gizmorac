import { formatINR, discountPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

const PRICE_SIZE = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
} as const;

/** Amber LED-readout price with struck MRP and discount tag. */
export function Price({
  product,
  size = "md",
  className,
}: {
  product: Pick<Product, "price" | "mrp">;
  size?: keyof typeof PRICE_SIZE;
  className?: string;
}) {
  const off = discountPercent(product);
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2.5 gap-y-1", className)}>
      <span className={cn("readout font-semibold leading-none", PRICE_SIZE[size])}>
        {formatINR(product.price)}
      </span>
      {off > 0 ? (
        <>
          <span className="font-mono text-sm text-faint line-through">
            {formatINR(product.mrp)}
          </span>
          <span className="text-sm font-semibold text-success">{off}% off</span>
        </>
      ) : null}
    </div>
  );
}
