import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductArt } from "@/components/product/product-art";
import { getVisibleCategories, getCategoryCounts } from "@/lib/data/queries";

export async function CategoryGrid() {
  const [categories, counts] = await Promise.all([
    getVisibleCategories(),
    getCategoryCounts(),
  ]);

  return (
    <section className="shell py-8 sm:py-12">
      <SectionHeading
        eyebrow="Browse"
        title="Shop by category"
        description="From health monitors to desk upgrades — find exactly what you need."
        href="/shop"
        hrefLabel="All products"
      />
      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/shop?category=${c.slug}`}
            className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border bg-surface p-4 transition-all hover:border-border-bright hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
          >
            <ArrowUpRight
              size={16}
              className="absolute right-3 top-3 text-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
            />
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border sm:h-20 sm:w-20">
              {c.image ? (
                <Image
                  src={c.image}
                  alt={c.name}
                  fill
                  sizes="80px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <ProductArt art={c.art} glyphClassName="!h-[44%] group-hover:text-accent" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="pr-5 text-[0.95rem] font-semibold leading-snug">{c.name}</h3>
              <p className="mt-1 line-clamp-1 text-xs text-muted">{c.tagline}</p>
              <p className="tech-label mt-2">{counts[c.slug]} products</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
