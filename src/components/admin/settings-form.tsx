"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import {
  updateSettings,
  setBooleanSetting,
  type SettingsState,
  type BooleanSetting,
} from "@/lib/admin/actions";
import type { StoreSettings } from "@/lib/data/settings";
import { Button } from "@/components/ui/button";
import { PaymentGatewayCard } from "@/components/admin/payment-gateway-card";
import { cn } from "@/lib/utils";

export interface PaymentGatewayProps {
  clientIdLast4: string;
  hasClientId: boolean;
  clientVersion: string;
  env: "sandbox" | "production";
  connected: boolean;
  hasSecret: boolean;
}

type TabKey = "store" | "company" | "shipping" | "payment" | "marketing";
const SETTINGS_TABS: { key: TabKey; label: string }[] = [
  { key: "store", label: "Store" },
  { key: "company", label: "Company" },
  { key: "shipping", label: "Shipping" },
  { key: "payment", label: "Payment gateway" },
  { key: "marketing", label: "Marketing" },
];

const inputCls =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none";
const areaCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-faint focus:border-accent focus:outline-none";

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold">{title}</h2>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  hint,
  ...rest
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input name={name} defaultValue={defaultValue} className={inputCls} {...rest} />
      {hint ? <span className="mt-1 block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

function Toggle({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string;
  name: BooleanSetting;
  defaultChecked: boolean;
  hint?: string;
}) {
  const [on, setOn] = useState(defaultChecked);
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  // Flag toggles apply instantly — no separate "Save settings" click needed.
  function handleChange(next: boolean) {
    setOn(next); // optimistic
    setSaved(false);
    setFailed(false);
    startSaving(async () => {
      const res = await setBooleanSetting(name, next);
      if (res?.error) {
        setOn(!next); // revert on failure
        setFailed(true);
      } else {
        setSaved(true);
      }
    });
  }

  // Clear the "Saved" tick after a moment.
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1600);
    return () => clearTimeout(t);
  }, [saved]);

  return (
    <label className="flex cursor-pointer items-start gap-3">
      {/* animated switch: knob slides + track fills on toggle */}
      <span className="relative mt-0.5 inline-flex shrink-0 select-none">
        <input
          type="checkbox"
          name={name}
          checked={on}
          onChange={(e) => handleChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cn(
            "block h-6 w-11 rounded-full transition-colors duration-300 ease-out peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
            on ? "bg-accent" : "bg-border-bright",
          )}
        />
        <span
          className={cn(
            "pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-out",
            on ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
      <span>
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {label}
          {saving ? (
            <Loader2 size={12} className="animate-spin text-muted" aria-label="Saving" />
          ) : saved ? (
            <span className="inline-flex items-center gap-1 text-xs font-normal text-success">
              <Check size={12} /> Saved
            </span>
          ) : failed ? (
            <span className="text-xs font-normal text-danger">Couldn&apos;t save</span>
          ) : null}
        </span>
        {hint ? <span className="block text-xs text-faint">{hint}</span> : null}
      </span>
    </label>
  );
}

// A plain switch that saves with the main "Save settings" button (unlike the
// instant-save Toggle, which is limited to an allow-list of flags).
function FormToggle({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string;
  name: string;
  defaultChecked: boolean;
  hint?: string;
}) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <span className="relative mt-0.5 inline-flex shrink-0 select-none">
        <input
          type="checkbox"
          name={name}
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cn(
            "block h-6 w-11 rounded-full transition-colors duration-300 ease-out",
            on ? "bg-accent" : "bg-border-bright",
          )}
        />
        <span
          className={cn(
            "pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-out",
            on ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="block text-xs text-faint">{hint}</span> : null}
      </span>
    </label>
  );
}

export function SettingsForm({
  settings,
  phonepe,
}: {
  settings: StoreSettings;
  phonepe: PaymentGatewayProps;
}) {
  const [state, formAction, pending] = useActionState<
    SettingsState | undefined,
    FormData
  >(updateSettings, undefined);
  const [tab, setTab] = useState<TabKey>("store");

  // Inactive panels stay mounted (hidden with CSS) so every field is still
  // submitted on Save, no matter which tab is open.
  const panel = (key: TabKey, twoCol: boolean) =>
    cn("grid gap-5", twoCol && "lg:grid-cols-2", tab !== key && "hidden");

  return (
    <form action={formAction}>
      {/* tab bar */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SETTINGS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* STORE */}
      <div className={panel("store", true)}>
        <Card title="Store details" hint="Shown across the storefront and in customer contact.">
          <Field label="Store name" name="storeName" defaultValue={settings.storeName} />
          <Field
            label="Support email"
            name="supportEmail"
            type="email"
            defaultValue={settings.supportEmail}
            placeholder="support@gizmorac.com"
          />
          <Field
            label="Support phone"
            name="supportPhone"
            defaultValue={settings.supportPhone}
            placeholder="+91 99999 99999"
          />
          <Field
            label="WhatsApp number"
            name="whatsappNumber"
            defaultValue={settings.whatsappNumber}
            hint="Digits with country code, e.g. 919876543210. Powers the chat button."
            inputMode="numeric"
          />
        </Card>

        <Card title="Announcement bar" hint="The strip at the very top of every page.">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Message</span>
            <textarea
              name="announcementText"
              rows={3}
              defaultValue={settings.announcementText}
              className={areaCls}
              placeholder="Free shipping over ₹999 · COD available"
            />
          </label>
          <Toggle
            label="Show announcement bar"
            name="announcementEnabled"
            defaultChecked={settings.announcementEnabled}
            hint="Hide it to remove the top strip entirely."
          />
          <Toggle
            label="Scroll the message"
            name="announcementScroll"
            defaultChecked={settings.announcementScroll}
            hint="On: text slides right → left. Off: text stays centered."
          />
        </Card>

        <Card
          title="Social media"
          hint="Paste full profile links. Each icon appears in the footer only when its link is filled in."
        >
          <Field
            label="Instagram"
            name="instagramUrl"
            type="url"
            defaultValue={settings.instagramUrl}
            placeholder="https://instagram.com/gizmorac"
          />
          <Field
            label="Facebook"
            name="facebookUrl"
            type="url"
            defaultValue={settings.facebookUrl}
            placeholder="https://facebook.com/gizmorac"
          />
          <Field
            label="YouTube"
            name="youtubeUrl"
            type="url"
            defaultValue={settings.youtubeUrl}
            placeholder="https://youtube.com/@gizmorac"
          />
          <Field
            label="X (Twitter)"
            name="twitterUrl"
            type="url"
            defaultValue={settings.twitterUrl}
            placeholder="https://x.com/gizmorac"
          />
        </Card>
      </div>

      {/* COMPANY */}
      <div className={panel("company", false)}>
        <Card
          title="Company details"
          hint="Your registered business identity. Updates everywhere automatically — footer, policies and the GST tax invoice. (Contact email & phone come from the Store tab.)"
        >
          <Field
            label="Registered / legal name"
            name="legalName"
            defaultValue={settings.legalName}
            placeholder="BIG BAJAAR ECOM STOREE"
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Registered address</span>
            <textarea
              name="companyAddress"
              rows={3}
              defaultValue={settings.companyAddress}
              className={areaCls}
              placeholder="Plot No. 33, Block A, Mohan Cooperative Industrial Estate, New Delhi, Delhi - 110044, India"
            />
            <span className="mt-1 block text-xs text-faint">
              Shown in the footer and as the &ldquo;Sold By&rdquo; address on invoices.
            </span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="State"
              name="companyState"
              defaultValue={settings.companyState}
              hint="Used to split IGST vs CGST/SGST on invoices."
              placeholder="Delhi"
            />
            <Field
              label="GST state code"
              name="companyStateCode"
              defaultValue={settings.companyStateCode}
              hint="First 2 digits of the GSTIN (e.g. 07)."
              inputMode="numeric"
              maxLength={2}
              placeholder="07"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="PAN"
              name="companyPan"
              defaultValue={settings.companyPan}
              placeholder="ABEFB8495P"
            />
            <Field
              label="GSTIN"
              name="companyGstin"
              defaultValue={settings.companyGstin}
              placeholder="07ABEFB8495P1ZL"
            />
          </div>
        </Card>
      </div>

      {/* SHIPPING */}
      <div className={panel("shipping", false)}>
        <Card title="Shipping & Cash on Delivery" hint="Applied to the cart and checkout totals.">
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Free shipping over (₹)"
              name="freeShippingThreshold"
              type="number"
              min={0}
              defaultValue={settings.freeShippingThreshold}
            />
            <Field
              label="Shipping fee (₹)"
              name="shippingFee"
              type="number"
              min={0}
              defaultValue={settings.shippingFee}
            />
          </div>
          <Toggle
            label="Cash on Delivery available"
            name="codEnabled"
            defaultChecked={settings.codEnabled}
            hint="Turn off to pause new orders until online payments are live."
          />
        </Card>
      </div>

      {/* PAYMENT GATEWAY — its own dedicated tab */}
      <div className={panel("payment", false)}>
        <PaymentGatewayCard
          clientIdLast4={phonepe.clientIdLast4}
          hasClientId={phonepe.hasClientId}
          clientVersion={phonepe.clientVersion}
          env={phonepe.env}
          connected={phonepe.connected}
          hasSecret={phonepe.hasSecret}
        />
      </div>

      {/* MARKETING */}
      <div className={panel("marketing", true)}>
        <Card
          title="Landing offer popup"
          hint="A welcome popup shown once per visit on the home page, with a promo code customers can copy."
        >
          <FormToggle
            label="Show landing popup"
            name="landingPopupEnabled"
            defaultChecked={settings.landingPopupEnabled}
            hint="Turn on to greet visitors with your current offer."
          />
          <Field
            label="Title"
            name="landingPopupTitle"
            defaultValue={settings.landingPopupTitle}
            placeholder="Welcome to GIZMORAC 🎉"
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Message</span>
            <textarea
              name="landingPopupMessage"
              rows={2}
              defaultValue={settings.landingPopupMessage}
              className={areaCls}
              placeholder="Get 10% off your first order. Use the code below at checkout."
            />
          </label>
          <Field
            label="Promo code"
            name="landingPopupCode"
            defaultValue={settings.landingPopupCode}
            hint="The code shown with a copy button. Create the matching coupon in Promotions."
            placeholder="WELCOME10"
          />
        </Card>

        <Card
          title="Promo popups (auto discounts)"
          hint="Instant rupee discounts nudged via popups while customers browse — applied automatically at checkout, no code needed."
        >
          <FormToggle
            label="Browsing nudge popup"
            name="browseOfferEnabled"
            defaultChecked={settings.browseOfferEnabled}
            hint="Shows after a set time of browsing with a 'Claim now' button."
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Browsing discount (₹)"
              name="browseOfferAmount"
              type="number"
              min={0}
              defaultValue={settings.browseOfferAmount}
              hint="Flat amount off at checkout (e.g. 100–150)."
            />
            <Field
              label="Show after (seconds)"
              name="browseOfferDelay"
              type="number"
              min={1}
              max={3600}
              defaultValue={settings.browseOfferDelay}
              hint="Browsing time before it pops up (e.g. 25)."
            />
          </div>
          <hr className="border-border" />
          <FormToggle
            label="Cart-waiting popup"
            name="cartOfferEnabled"
            defaultChecked={settings.cartOfferEnabled}
            hint="Shows after items sit in the cart a while — stacks on any coupon."
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Cart discount (₹)"
              name="cartOfferAmount"
              type="number"
              min={0}
              defaultValue={settings.cartOfferAmount}
              hint="Extra amount off, on top of any coupon."
            />
            <Field
              label="Show after (seconds)"
              name="cartOfferDelay"
              type="number"
              min={1}
              max={3600}
              defaultValue={settings.cartOfferDelay}
              hint="Time items wait in cart before it pops up (e.g. 60)."
            />
          </div>
        </Card>
      </div>

      {/* save bar — always visible, saves every tab at once */}
      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : null}
          Save settings
        </Button>
        {state?.ok ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-success">
            <Check size={16} /> Saved
          </span>
        ) : null}
        {state?.error ? (
          <span className="text-sm text-danger" role="alert">{state.error}</span>
        ) : null}
      </div>
    </form>
  );
}
