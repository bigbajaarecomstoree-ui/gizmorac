import type { Metadata } from "next";
import { getAllProducts } from "@/lib/data/queries";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getLastPaymentMethod } from "@/lib/data/orders";
import { getSettings } from "@/lib/data/settings";
import { getPhonePeConfig } from "@/lib/phonepe";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your GIZMORAC order.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [products, customer, settings, phonepe] = await Promise.all([
    getAllProducts(),
    getCurrentCustomer(),
    getSettings(),
    getPhonePeConfig(),
  ]);
  const preferredMethod = customer
    ? await getLastPaymentMethod(customer.id, customer.email)
    : "";

  return (
    <div className="shell py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Cart", href: "/cart" },
          { label: "Checkout" },
        ]}
      />
      <h1 className="mt-5 text-3xl font-bold tracking-tight">Checkout</h1>
      <div className="mt-8">
        <CheckoutView
          products={products}
          customer={customer}
          freeShippingThreshold={settings.freeShippingThreshold}
          shippingFee={settings.shippingFee}
          codEnabled={settings.codEnabled}
          phonepeEnabled={phonepe.configured}
          preferredMethod={preferredMethod || undefined}
        />
      </div>
    </div>
  );
}
