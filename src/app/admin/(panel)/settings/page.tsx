import { Settings as SettingsIcon } from "lucide-react";
import { getSettings } from "@/lib/data/settings";
import { getPhonePeConfig } from "@/lib/phonepe";
import { getShiprocketConfig } from "@/lib/shiprocket";
import { SettingsForm } from "@/components/admin/settings-form";
import { CodSettingsForm } from "@/components/admin/cod-settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, phonepe, shiprocket] = await Promise.all([
    getSettings(),
    getPhonePeConfig(),
    getShiprocketConfig(),
  ]);

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
        <SettingsForm
          settings={settings}
          phonepe={{
            clientIdLast4: phonepe.clientId ? phonepe.clientId.slice(-4) : "",
            hasClientId: Boolean(phonepe.clientId),
            clientVersion: phonepe.clientVersion,
            env: phonepe.env,
            connected: phonepe.connected,
            hasSecret: Boolean(phonepe.clientSecret),
          }}
          shiprocket={{
            email: shiprocket.email,
            hasPassword: Boolean(shiprocket.password),
            pickup: shiprocket.pickup,
            connected: shiprocket.connected,
          }}
        />
      </div>

      <div className="mt-6">
        <CodSettingsForm settings={settings} />
      </div>
    </div>
  );
}
