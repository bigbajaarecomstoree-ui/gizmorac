import { Hero } from "@/components/home/hero";
import { MarketplaceStrip } from "@/components/home/marketplace-strip";
import { WhyChoose } from "@/components/home/why-choose";
import { CategoryGrid } from "@/components/home/category-grid";
import { BestSellers } from "@/components/home/best-sellers";
import { FeaturedProducts } from "@/components/home/featured-products";
import { DealOfTheDay } from "@/components/home/deal-of-the-day";
import { Reviews } from "@/components/home/reviews";
import { FaqAccordion } from "@/components/home/faq";
import { Newsletter } from "@/components/home/newsletter";
import { getSiteFaqs } from "@/lib/data/queries";
import { SITE } from "@/lib/constants";
import { jsonLd } from "@/lib/json-ld";

export default async function HomePage() {
  const faqs = await getSiteFaqs();

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(orgSchema) }}
      />
      <Hero />
      <MarketplaceStrip />
      <WhyChoose />
      <CategoryGrid />
      <BestSellers />
      <DealOfTheDay />
      <FeaturedProducts />
      <Reviews />
      <FaqAccordion
        items={faqs}
        description="Everything you need to know about ordering, shipping and support."
        withSchema
      />
      <Newsletter />
    </>
  );
}
