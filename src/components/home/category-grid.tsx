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
      <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
        {categories.map((c) => {
          const n = counts[c.slug] ?? 0;
          return (
            <Link
              key={c.slug}
              href={`/shop?category=${c.slug}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_20px_44px_-20px_rgba(109,40,217,0.45)]"
            >
              {/* image */}
              <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
                {c.image ? (
                  <Image
                    src={c.image}
                    alt={c.name}
                    fill
                    sizes="(min-width:1024px) 33vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.07]"
                  />
                ) : (
                  <ProductArt art={c.art} glyphClassName="!h-[42%] transition-colors group-hover:text-accent" />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {/* count pill */}
                <span className="absolute bottom-3 left-3 rounded-full bg-background/85 px-2.5 py-1 text-[0.6875rem] font-semibold text-foreground shadow-sm backdrop-blur">
                  {n} {n === 1 ? "product" : "products"}
                </span>

                {/* arrow badge — fills purple on hover */}
                <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-colors duration-300 group-hover:bg-accent group-hover:text-on-accent">
                  <ArrowUpRight
                    size={16}
                    className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </span>
              </div>

              {/* content */}
              <div className="p-4">
                <h3 className="text-[0.95rem] font-semibold leading-snug transition-colors group-hover:text-accent-bright sm:text-base">
                  {c.name}
                </h3>
                <p className="mt-1 line-clamp-1 text-sm text-muted">{c.tagline}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
