import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CompareView } from "@/components/product/compare-view";

export const metadata: Metadata = {
  title: "Compare products",
  description: "Compare GIZMORAC gadgets side by side — price, rating, warranty and specs.",
  robots: { index: false },
};

export default function ComparePage() {
  return (
    <div className="shell py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Compare" },
        ]}
      />
      <h1 className="mt-5 text-3xl font-bold tracking-tight">Compare products</h1>
      <p className="mt-2 text-sm text-muted">Side-by-side specs to help you pick the right gadget.</p>
      <div className="mt-8">
        <CompareView />
      </div>
    </div>
  );
}
