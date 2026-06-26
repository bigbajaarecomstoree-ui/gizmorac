import { StoreProvider } from "@/components/store/store-provider";
import { ContentGuard } from "@/components/layout/content-guard";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { PromoPopups } from "@/components/promo/promo-popups";
import { Analytics } from "@/components/analytics/analytics";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getSettings, whatsappLink } from "@/lib/data/settings";
import { getVisibleCategories } from "@/lib/data/queries";

export default async function StorefrontLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [customer, settings, categories] = await Promise.all([
    getCurrentCustomer(),
    getSettings(),
    getVisibleCategories(),
  ]);

  const waHref = whatsappLink(settings.whatsappNumber);

  return (
    <StoreProvider>
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
        <Analytics />
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
