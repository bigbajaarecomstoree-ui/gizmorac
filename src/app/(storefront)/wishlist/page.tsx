import type { Metadata } from "next";
import { getAllProducts } from "@/lib/data/queries";
import { WishlistView } from "@/components/cart/wishlist-view";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = {
  title: "Your Wishlist",
  description: "Products you've saved on GIZMORAC.",
  robots: { index: false },
};

export default async function WishlistPage() {
  const products = await getAllProducts();
  return (
    <div className="shell py-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Wishlist" }]} />
      <h1 className="mt-5 text-3xl font-bold tracking-tight">Your wishlist</h1>
      <p className="mt-2 text-sm text-muted">Saved gadgets, ready when you are.</p>
      <div className="mt-8">
        <WishlistView products={products} />
      </div>
    </div>
  );
}
