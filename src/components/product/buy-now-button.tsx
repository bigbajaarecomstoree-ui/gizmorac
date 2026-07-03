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
  className,
  size = "md",
  iconSize = 16,
}: {
  id: string;
  name: string;
  className?: string;
  size?: ButtonProps["size"];
  iconSize?: number;
}) {
  const router = useRouter();
  const { addToCart, loggedIn } = useStore();
  const [loading, setLoading] = React.useState(false);

  function handle() {
    addToCart(id, 1, name);
    setLoading(true);
    // Buy Now requires an account: send guests to log in, then on to checkout.
    router.push(loggedIn ? "/checkout" : "/login?next=/checkout");
  }

  return (
    <Button
      variant="primary"
      size={size}
      className={cn(className)}
      onClick={handle}
      disabled={loading}
      aria-label={`Buy ${name} now`}
    >
      {loading ? <Loader2 size={iconSize} className="animate-spin" /> : <Zap size={iconSize} />}
      Buy Now
    </Button>
  );
}
