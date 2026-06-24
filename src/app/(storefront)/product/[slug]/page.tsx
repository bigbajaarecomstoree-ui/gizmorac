import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, ShieldCheck, RotateCcw, Banknote } from "lucide-react";
import {
  getProductBySlug,
  getProductSlugs,
  getRelatedProducts,
  getReviews,
  getCategoryBySlug,
} from "@/lib/data/queries";
import { getDbReviewsForSlug } from "@/lib/data/customer-reviews";
import { discountPercent, savings, formatINR, shortTitle } from "@/lib/format";
import { SITE } from "@/lib/constants";
import { jsonLd } from "@/lib/json-ld";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Price } from "@/components/product/price";
import { RatingStars } from "@/components/product/rating-stars";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPurchase } from "@/components/product/product-purchase";
import { SocialProof } from "@/components/product/social-proof";
import { PincodeChecker } from "@/components/product/pincode-checker";
import { ProductTabs } from "@/components/product/product-tabs";
import { ProductGrid } from "@/components/product/product-grid";
import { SectionHeading } from "@/components/ui/section-heading";
import { TrackRecentlyViewed, RecentlyViewed } from "@/components/account/recently-viewed";
import { TrackEvent } from "@/components/analytics/track-event";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  const url = `/product/${product.slug}`;
  return {
    title: product.name,
    description: product.shortDescription,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: product.name,
      description: product.shortDescription,
      url,
    },
  };
}

const TRUST = [
  { icon: ShieldCheck, label: "Warranty included" },
  { icon: RotateCcw, label: "7-day replacement" },
  { icon: Banknote, label: "COD available" },
];

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, allReviews, dbReviews, category] = await Promise.all([
    getRelatedProducts(product, 4),
    getReviews(50),
    getDbReviewsForSlug(product.slug),
    getCategoryBySlug(product.category),
  ]);

  // Real customer reviews (from delivered orders) first, then any seeded ones.
  const productReviews = [
    ...dbReviews,
    ...allReviews.filter((r) => r.productSlug === product.slug),
  ];
  const off = discountPercent(product);
  const inStock = product.stock > 0;
  const lowStock = inStock && product.stock <= 10;

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${SITE.url}/product/${product.slug}`,
    },
  };

  return (
    <div className="shell py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(productSchema) }}
      />
      <TrackRecentlyViewed
        item={{ slug: product.slug, name: product.name, image: product.image ?? null, price: product.price }}
      />
      <TrackEvent
        name="view_item"
        params={{
          currency: "INR",
          value: product.price,
          items: [{ item_id: product.id, item_name: product.name, price: product.price, quantity: 1 }],
        }}
      />

      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          ...(category
            ? [{ label: category.name, href: `/shop?category=${category.slug}` }]
            : []),
          { label: shortTitle(product.name) },
        ]}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery
          art={product.art}
          name={product.name}
          images={product.images}
          video={product.video}
          off={off}
          badges={product.badges}
        />

        <div>
          <p className="tech-label">{product.brand}</p>
          <h1 className="mt-1.5 text-2xl font-bold leading-tight sm:text-3xl">
            {product.name}
          </h1>

          <div className="mt-3">
            <RatingStars rating={product.rating} count={product.reviewCount} size="md" />
          </div>

          <div className="mt-5 border-y border-border py-5">
            <Price product={product} size="lg" />
            {off > 0 ? (
              <p className="mt-1.5 text-sm text-success">
                You save {formatINR(savings(product))} · inclusive of all taxes
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-faint">Inclusive of all taxes</p>
            )}
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span
                className={`h-2 w-2 rounded-full ${
                  inStock ? "bg-success" : "bg-danger"
                }`}
              />
              {inStock ? (
                lowStock ? (
                  <span className="text-accent-bright">
                    Only {product.stock} left in stock
                  </span>
                ) : (
                  <span className="text-success">In stock</span>
                )
              ) : (
                <span className="text-danger">Out of stock</span>
              )}
            </div>

            <SocialProof seed={product.slug} />
          </div>

          <p className="mt-5 text-[0.95rem] leading-relaxed text-muted">
            {product.shortDescription}
          </p>

          <ul className="mt-4 space-y-2">
            {product.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2.5 text-sm">
                <Check size={16} className="mt-0.5 shrink-0 text-accent" />
                <span className="text-foreground">{h}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7">
            <ProductPurchase id={product.id} name={shortTitle(product.name)} price={product.price} stock={product.stock} />
          </div>

          <div className="mt-6">
            <PincodeChecker />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {TRUST.map((t) => (
              <div
                key={t.label}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-3 text-center"
              >
                <t.icon size={18} className="text-accent" />
                <span className="text-[0.6875rem] leading-tight text-muted">
                  {t.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="mt-14">
        <ProductTabs
          description={product.description}
          features={product.features}
          specs={product.specs}
          faqs={product.faqs}
          reviews={productReviews}
          rating={product.rating}
          reviewCount={product.reviewCount}
        />
      </div>

      {/* related */}
      {related.length > 0 ? (
        <div className="mt-16">
          <SectionHeading
            eyebrow="You may also like"
            title="Related products"
            href={category ? `/shop?category=${category.slug}` : "/shop"}
          />
          <ProductGrid products={related} className="mt-8 lg:grid-cols-4" />
        </div>
      ) : null}

      {/* recently viewed (excludes the current product) */}
      <div className="mt-16">
        <RecentlyViewed excludeSlug={product.slug} limit={6} />
      </div>
    </div>
  );
}
