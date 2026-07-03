"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function WhatsAppButton({ href }: { href: string }) {
  const pathname = usePathname();
  // On cart/checkout the mobile sticky checkout bar lives at the bottom, so hide
  // this floating button on mobile there to avoid two stacked CTAs (keep it on desktop).
  const onCheckoutFlow = pathname === "/cart" || pathname.startsWith("/checkout");
  // The PDP's sticky buy bar is full-width at every breakpoint, so the float
  // would sit on top of it once the bar slides in — hide it there entirely.
  if (pathname.startsWith("/product/")) return null;
  // Use a button (not an <a href>) so the wa.me URL isn't revealed in the
  // browser status bar on hover. Opens WhatsApp in a new tab on click.
  return (
    <button
      type="button"
      onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
      aria-label="Chat with us on WhatsApp"
      className={cn(
        "group fixed bottom-5 right-5 z-50 cursor-pointer items-center gap-2.5 rounded-full border border-success/40 bg-success/15 py-3 pl-3 pr-4 text-success backdrop-blur transition-all hover:bg-success/25 hover:shadow-[0_0_24px_-6px_rgba(52,211,153,0.6)]",
        onCheckoutFlow ? "hidden lg:flex" : "flex",
      )}
    >
      <MessageCircle size={20} className="shrink-0" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-300 group-hover:max-w-[120px] group-hover:opacity-100">
        Chat with us
      </span>
    </button>
  );
}
