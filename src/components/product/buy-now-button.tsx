"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useStore } from "@/components/store/store-provider";
import { cn } from "@/lib/utils";

/** Adds the item to the cart and jumps straight to checkout. */
export function BuyNowButton({
  id,
  name,
  qty = 1,
  label = "Buy Now",
  className,
  variant = "primary",
  size = "md",
  iconSize = 16,
}: {
  id: string;
  name: string;
  qty?: number;
  label?: string;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  iconSize?: number;
}) {
  const router = useRouter();
  const { addToCart } = useStore();
  const [loading, setLoading] = React.useState(false);

  function handle() {
    addToCart(id, qty, name);
    setLoading(true);
    router.push("/checkout");
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={handle}
      disabled={loading}
      aria-label={`Buy ${name} now`}
    >
      {loading ? <Loader2 size={iconSize} className="animate-spin" /> : <Zap size={iconSize} />}
      {label}
    </Button>
  );
}
