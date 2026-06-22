import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AccountNav } from "@/components/account/account-nav";
import { ProfileForm } from "@/components/account/profile-form";
import { AccountSettings } from "@/components/account/account-settings";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");

  return (
    <div className="shell py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "My account", href: "/account" },
          { label: "Settings" },
        ]}
      />

      <div className="mx-auto mt-6 max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
          <p className="mt-1 text-sm text-muted">
            Your details, email preferences and account.
          </p>
        </div>

        <div className="sm:max-w-sm">
          <AccountNav />
        </div>

        <div>
          <h2 className="text-lg font-semibold">Profile &amp; address</h2>
          <p className="mt-1 text-sm text-muted">Saved details speed up checkout.</p>
          <div className="mt-4 rounded-xl border border-border bg-surface p-5">
            <ProfileForm customer={customer} />
          </div>
        </div>

        <AccountSettings marketingOptIn={customer.marketingOptIn} />
      </div>
    </div>
  );
}
