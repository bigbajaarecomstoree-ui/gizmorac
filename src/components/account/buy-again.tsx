"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2 } from "lucide-react";
import { useStore } from "@/components/store/store-provider";

/** Re-add a past order's items to the cart and jump to checkout review. */
export function BuyAgainButton({
  items,
}: {
  items: { id: string; qty: number }[];
}) {
  const { addToCart } = useStore();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  function buyAgain() {
    if (busy || items.length === 0) return;
    setBusy(true);
    for (const it of items) addToCart(it.id, it.qty);
    router.push("/cart");
  }

  return (
    <button
      type="button"
      onClick={buyAgain}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-60 cursor-pointer"
    >
      {busy ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <RotateCcw size={14} />
      )}
      Buy again
    </button>
  );
}
