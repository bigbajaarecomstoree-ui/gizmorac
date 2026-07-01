import { SectionHeading } from "@/components/ui/section-heading";
import { ProductGrid } from "@/components/product/product-grid";
import { getFeaturedProducts } from "@/lib/data/queries";

export async function FeaturedProducts() {
  const products = await getFeaturedProducts(4);
  if (products.length === 0) return null;
  return (
    <section className="border-y border-border bg-surface/30">
      <div className="shell py-8 sm:py-12">
        <SectionHeading
          eyebrow="Hand-picked"
          title="Featured products"
          description="A curated edit of gadgets worth a closer look."
          href="/shop"
        />
        <ProductGrid products={products} className="mt-10" animate />
      </div>
    </section>
  );
}
