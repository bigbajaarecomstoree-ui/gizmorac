import type { Metadata } from "next";
import { getAllProducts } from "@/lib/data/queries";
import { CartView } from "@/components/cart/cart-view";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = {
  title: "Your Cart",
  description: "Review the gadgets in your GIZMORAC cart and proceed to checkout.",
  robots: { index: false },
};

export default async function CartPage() {
  const products = await getAllProducts();
  return (
    <div className="shell py-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
      <h1 className="mt-5 text-3xl font-bold tracking-tight">Your cart</h1>
      <div className="mt-8">
        <CartView products={products} />
      </div>
    </div>
  );
}
