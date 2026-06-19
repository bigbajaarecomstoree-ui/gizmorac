"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WishlistButton } from "./wishlist-button";
import { useStore } from "@/components/store/store-provider";
import { MAX_QTY } from "@/lib/checkout-shared";

export function ProductPurchase({
  id,
  name,
  stock,
}: {
  id: string;
  name: string;
  stock: number;
}) {
  const router = useRouter();
  const { addToCart } = useStore();
  const [qty, setQty] = React.useState(1);
  const max = Math.max(1, Math.min(stock, MAX_QTY));
  const outOfStock = stock <= 0;

  function add() {
    addToCart(id, qty, name);
  }
  function buyNow() {
    addToCart(id, qty, name);
    router.push("/cart");
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
          variant="outline"
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
