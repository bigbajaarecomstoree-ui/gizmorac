import { SectionHeading } from "@/components/ui/section-heading";
import { ProductGrid } from "@/components/product/product-grid";
import { getBestSellers } from "@/lib/data/queries";

export async function BestSellers() {
  const products = await getBestSellers(4);
  return (
    <section className="shell py-8 sm:py-12">
      <SectionHeading
        eyebrow="Most loved"
        title="Best sellers"
        description="The gadgets our customers reach for again and again."
        href="/shop?sort=popular"
      />
      <ProductGrid products={products} className="mt-10" animate />
    </section>
  );
}
