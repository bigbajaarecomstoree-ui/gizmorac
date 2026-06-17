import { StoreProvider } from "@/components/store/store-provider";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { getCurrentCustomer } from "@/lib/customer-auth";

export default async function StorefrontLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const customer = await getCurrentCustomer();

  return (
    <StoreProvider>
      <div className="flex min-h-full flex-col">
        <SiteHeader
          customerName={customer ? customer.fullName.split(" ")[0] : null}
        />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <WhatsAppButton />
      </div>
    </StoreProvider>
  );
}
