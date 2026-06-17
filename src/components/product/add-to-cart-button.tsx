"use client";

import * as React from "react";
import { Check, ShoppingCart } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useStore } from "@/components/store/store-provider";
import { cn } from "@/lib/utils";

export function AddToCartButton({
  id,
  name,
  qty = 1,
  label = "Add to Cart",
  className,
  variant = "surface",
  size = "md",
}: {
  id: string;
  name: string;
  qty?: number;
  label?: string;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const { addToCart } = useStore();
  const [added, setAdded] = React.useState(false);

  function handle() {
    addToCart(id, qty, name);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={handle}
      aria-label={`Add ${name} to cart`}
    >
      {added ? <Check size={16} /> : <ShoppingCart size={16} />}
      {added ? "Added" : label}
    </Button>
  );
}
