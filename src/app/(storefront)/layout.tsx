import { StoreProvider } from "@/components/store/store-provider";
import { ContentGuard } from "@/components/layout/content-guard";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { CompareTray } from "@/components/product/compare-tray";
import { PromoPopups } from "@/components/promo/promo-popups";
import { Analytics } from "@/components/analytics/analytics";
import { PresencePinger } from "@/components/analytics/presence-pinger";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getSettings, whatsappLink } from "@/lib/data/settings";
import { getVisibleCategories, getProductsBySlugs } from "@/lib/data/queries";
import { getRecentReviews } from "@/lib/data/customer-reviews";
import { shortTitle } from "@/lib/format";
import { ReviewSpotlight, type SpotlightReview } from "@/components/product/review-spotlight";

export default async function StorefrontLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [customer, settings, categories, realReviews] = await Promise.all([
    getCurrentCustomer(),
    getSettings(),
    getVisibleCategories(),
    getRecentReviews(12),
  ]);

  const waHref = whatsappLink(settings.whatsappNumber);

  // Floating review spotlight — REAL customer reviews only. Empty until genuine
  // reviews exist, at which point ReviewSpotlight self-hides (no fake proof).
  const reviewPool = realReviews.filter((r) => r.productSlug);
  const reviewProducts = await getProductsBySlugs([
    ...new Set(reviewPool.map((r) => r.productSlug as string)),
  ]);
  const productBySlug = new Map(reviewProducts.map((p) => [p.slug, p]));
  const spotlight: SpotlightReview[] = reviewPool
    .map((r) => {
      const p = productBySlug.get(r.productSlug as string);
      if (!p) return null;
      return {
        id: r.id,
        author: r.author,
        rating: r.rating,
        title: r.title,
        body: r.body,
        verified: r.verified,
        productName: shortTitle(p.name),
        productSlug: p.slug,
        image: p.image ?? null,
        art: p.art,
      };
    })
    .filter((x): x is SpotlightReview => x !== null)
    .slice(0, 10);

  return (
    <StoreProvider loggedIn={Boolean(customer)}>
      <ContentGuard />
      <div className="content-guard flex min-h-full flex-col">
        <SiteHeader
          customerName={customer ? customer.fullName.split(" ")[0] : null}
          announcement={
            settings.announcementEnabled && settings.announcementText.trim()
              ? settings.announcementText
              : null
          }
          announcementScroll={settings.announcementScroll}
        />
        <main className="flex-1">{children}</main>
        <SiteFooter
          whatsappHref={waHref}
          categories={categories}
          instagramUrl={settings.instagramUrl}
          facebookUrl={settings.facebookUrl}
          youtubeUrl={settings.youtubeUrl}
          twitterUrl={settings.twitterUrl}
          legalName={settings.legalName}
          companyAddress={settings.companyAddress}
          supportPhone={settings.supportPhone}
          supportEmail={settings.supportEmail}
        />
        <WhatsAppButton href={waHref} />
        <CompareTray />
        <ReviewSpotlight items={spotlight} />
        <Analytics />
        <PresencePinger />
        <PromoPopups
          browse={{
            enabled: settings.browseOfferEnabled,
            amount: settings.browseOfferAmount,
            delaySec: settings.browseOfferDelay,
          }}
          cart={{
            enabled: settings.cartOfferEnabled,
            amount: settings.cartOfferAmount,
            delaySec: settings.cartOfferDelay,
          }}
        />
      </div>
    </StoreProvider>
  );
}
