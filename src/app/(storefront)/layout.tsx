import { StoreProvider } from "@/components/store/store-provider";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getSettings, whatsappLink } from "@/lib/data/settings";
import { getCategories } from "@/lib/data/queries";

export default async function StorefrontLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [customer, settings, categories] = await Promise.all([
    getCurrentCustomer(),
    getSettings(),
    getCategories(),
  ]);

  const waHref = whatsappLink(settings.whatsappNumber);

  return (
    <StoreProvider>
      <div className="flex min-h-full flex-col">
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
          supportEmail={settings.supportEmail}
          supportPhone={settings.supportPhone}
          categories={categories}
        />
        <WhatsAppButton href={waHref} />
      </div>
    </StoreProvider>
  );
}
