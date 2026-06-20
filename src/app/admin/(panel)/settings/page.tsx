import { Settings as SettingsIcon } from "lucide-react";
import { getSettings } from "@/lib/data/settings";
import { getPhonePeConfig } from "@/lib/phonepe";
import { SettingsForm } from "@/components/admin/settings-form";
import { PaymentGatewayCard } from "@/components/admin/payment-gateway-card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, phonepe] = await Promise.all([getSettings(), getPhonePeConfig()]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-2">
        <SettingsIcon size={22} className="text-accent" />
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Store-wide configuration. Changes apply to the storefront instantly.
      </p>

      <div className="mt-6">
        <SettingsForm settings={settings} />
      </div>

      <div className="mt-5">
        <PaymentGatewayCard
          clientId={phonepe.clientId}
          clientVersion={phonepe.clientVersion}
          env={phonepe.env}
          connected={phonepe.connected}
          hasSecret={Boolean(phonepe.clientSecret)}
        />
      </div>
    </div>
  );
}
