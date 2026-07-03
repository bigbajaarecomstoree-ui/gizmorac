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
import { LandingPopup } from "@/components/promo/landing-popup";
import { Reveal } from "@/components/motion/motion-primitives";
import { siteFaqs } from "@/lib/data/faqs";
import { getSettings } from "@/lib/data/settings";
import { SITE } from "@/lib/constants";
import { jsonLd } from "@/lib/json-ld";

export default async function HomePage() {
  const settings = await getSettings();
  const showLandingPopup =
    settings.landingPopupEnabled &&
    Boolean(
      settings.landingPopupTitle ||
        settings.landingPopupMessage ||
        settings.landingPopupCode,
    );

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
      <Reveal><MarketplaceStrip /></Reveal>
      <WhyChoose />
      <CategoryGrid />
      <BestSellers />
      <Reveal><DealOfTheDay /></Reveal>
      <FeaturedProducts />
      <Reveal><Reviews /></Reveal>
      <Reveal>
        <FaqAccordion
          items={siteFaqs}
          description="Everything you need to know about ordering, shipping and support."
        />
      </Reveal>
      <Reveal><Newsletter /></Reveal>
      {showLandingPopup ? (
        <LandingPopup
          title={settings.landingPopupTitle}
          message={settings.landingPopupMessage}
          code={settings.landingPopupCode}
        />
      ) : null}
    </>
  );
}
