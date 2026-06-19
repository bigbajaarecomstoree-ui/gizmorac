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
import { cn } from "@/lib/utils";

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

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const [state, formAction, pending] = useActionState<
    SettingsState | undefined,
    FormData
  >(updateSettings, undefined);

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-2">
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

      <Card title="Shipping & payment" hint="Applied to the cart and checkout totals.">
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

      <div className="flex items-center gap-3 lg:col-span-2">
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
