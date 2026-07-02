"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WishlistButton } from "./wishlist-button";
import { useStore } from "@/components/store/store-provider";
import { MAX_QTY } from "@/lib/checkout-shared";
import { track } from "@/lib/analytics";

export function ProductPurchase({
  id,
  name,
  price,
  stock,
}: {
  id: string;
  name: string;
  price: number;
  stock: number;
}) {
  const router = useRouter();
  const { addToCart, loggedIn } = useStore();
  const [qty, setQty] = React.useState(1);
  const max = Math.max(1, Math.min(stock, MAX_QTY));
  const outOfStock = stock <= 0;

  // This client component is reused across PDP navigations, so qty would
  // otherwise carry over (and can exceed the next product's stock).
  React.useEffect(() => {
    setQty(1);
  }, [id]);

  function trackAdd(q: number) {
    track("add_to_cart", {
      currency: "INR",
      value: price * q,
      items: [{ item_id: id, item_name: name, price, quantity: q }],
    });
  }
  function add() {
    const q = Math.min(qty, max); // never add more than stock/MAX_QTY
    addToCart(id, q, name);
    trackAdd(q);
  }
  function buyNow() {
    const q = Math.min(qty, max);
    addToCart(id, q, name);
    trackAdd(q);
    // Buy Now requires an account: guests log in first, then land on checkout.
    router.push(loggedIn ? "/checkout" : "/login?next=/checkout");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted">Quantity</span>
        <div className="flex items-center rounded-lg border border-border bg-surface">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1 || outOfStock}
            aria-label="Decrease quantity"
            className="grid h-10 w-10 place-items-center text-muted transition-colors hover:text-foreground disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <Minus size={15} />
          </button>
          <span className="w-10 text-center font-mono text-sm tabular-nums">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(max, q + 1))}
            disabled={qty >= max || outOfStock}
            aria-label="Increase quantity"
            className="grid h-10 w-10 place-items-center text-muted transition-colors hover:text-foreground disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="primary"
          size="lg"
          onClick={buyNow}
          disabled={outOfStock}
          className="w-full sm:w-auto sm:flex-1"
        >
          <Zap size={17} />
          Buy Now
        </Button>
        <Button
          variant="highlight"
          size="lg"
          onClick={add}
          disabled={outOfStock}
          className="w-full sm:w-auto sm:flex-1"
        >
          <ShoppingCart size={17} />
          Add to Cart
        </Button>
        <WishlistButton id={id} name={name} withLabel className="sm:w-auto" />
      </div>
    </div>
  );
}
