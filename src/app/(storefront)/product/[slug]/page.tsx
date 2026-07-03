import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Flame } from "lucide-react";
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
import { ProductTrust } from "@/components/product/product-trust";
import { ShareButton } from "@/components/product/share-button";
import { CompareButton } from "@/components/product/compare-button";
import { StickyBuyBar } from "@/components/product/sticky-buy-bar";
import { SocialProof } from "@/components/product/social-proof";
import { PincodeChecker } from "@/components/product/pincode-checker";
import { ProductAssurance } from "@/components/product/product-assurance";
import { ProductBenefits } from "@/components/product/product-benefits";
import { ValueCompare } from "@/components/product/value-compare";
import { BundleAdd } from "@/components/product/bundle-add";
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

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, allReviews, dbReviews, category] = await Promise.all([
    getRelatedProducts(product, 3),
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
    // pb-24: reserve room for the fixed sticky buy bar so it never overlays
    // the last content/footer at max scroll (the cart page does the same).
    <div className="shell pb-24 pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(productSchema) }}
      />
      <TrackRecentlyViewed slug={product.slug} />
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

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-12">
        <div className="relative mx-auto w-full max-w-[420px]">
          {/* key: remount on product change so the active slide/zoom state
              doesn't leak across client-side navigation between PDPs. */}
          <ProductGallery
            key={product.slug}
            art={product.art}
            name={product.name}
            images={product.images}
            video={product.video}
            off={off}
            badges={product.badges}
          />
          {/* Amazon-style: compact share + compare icons on the image corner. */}
          <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
            <ShareButton title={product.name} />
            <CompareButton
              slug={product.slug}
              name={shortTitle(product.name)}
              category={product.category}
            />
          </div>
        </div>

        <div>
          <p className="tech-label">{product.brand}</p>
          <h1 className="mt-2.5 text-pretty text-xl font-semibold leading-snug sm:text-2xl">
            {product.name}
          </h1>

          <div className="mt-3">
            <RatingStars rating={product.rating} count={product.reviewCount} size="md" />
          </div>

          <ProductAssurance warrantyMonths={product.warrantyMonths} />

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
                  <span className="inline-flex items-center gap-1.5 font-medium text-accent-bright">
                    <Flame size={14} className="text-danger" />
                    Selling fast — only {product.stock} left
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

          <div id="pdp-purchase" className="mt-6">
            <ProductPurchase id={product.id} name={shortTitle(product.name)} price={product.price} stock={product.stock} />
          </div>

          <div className="mt-4">
            <PincodeChecker />
          </div>

          <p className="mt-6 text-[0.95rem] leading-relaxed text-muted">
            {product.shortDescription}
          </p>

          <div className="mt-5">
            <ProductBenefits highlights={product.highlights} />
          </div>

          <div className="mt-6">
            <ProductTrust warrantyMonths={product.warrantyMonths} />
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="mt-14">
        <ProductTabs
          description={product.description}
          features={product.features}
          specs={product.specs}
          inTheBox={product.inTheBox ?? []}
          faqs={product.faqs}
          reviews={productReviews}
          rating={product.rating}
          reviewCount={product.reviewCount}
        />
      </div>

      {/* complete your setup — honest cross-sell */}
      {related.length > 0 ? (
        <div className="mx-auto mt-12 max-w-3xl">
          <BundleAdd
            items={[product, ...related].slice(0, 3).map((p) => ({
              id: p.id,
              slug: p.slug,
              name: p.name,
              price: p.price,
              image: p.image ?? null,
              art: p.art,
            }))}
          />
        </div>
      ) : null}

      {/* why GIZMORAC — value comparison */}
      <div className="mt-16 text-center">
        <p className="tech-label !text-accent-bright">Why GIZMORAC</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Buy with confidence
        </h2>
        <div className="mt-8">
          <ValueCompare />
        </div>
      </div>

      {/* related */}
      {related.length > 0 ? (
        <div className="mt-16">
          <SectionHeading
            eyebrow="You may also like"
            title="Related products"
            href={category ? `/shop?category=${category.slug}` : "/shop"}
          />
          <ProductGrid products={related} className="mt-8 lg:grid-cols-3" />
        </div>
      ) : null}

      {/* recently viewed (excludes the current product) */}
      <div className="mt-16">
        <RecentlyViewed excludeSlug={product.slug} limit={4} />
      </div>

      {/* mobile sticky buy bar */}
      <StickyBuyBar
        id={product.id}
        name={product.name}
        price={product.price}
        mrp={product.mrp}
        stock={product.stock}
        art={product.art}
        image={product.image ?? null}
      />
    </div>
  );
}
