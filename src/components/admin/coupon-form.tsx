"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Trash2 } from "lucide-react";
import type { Coupon, CouponType } from "@/lib/types";
import { COUPON_TYPES } from "@/lib/data/coupons";
import { deleteCoupon } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

const inputCls =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? <Loader2 size={16} className="animate-spin" /> : null}
      {pending ? "Saving…" : label}
    </Button>
  );
}

function isoToDate(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function CouponForm({
  action,
  coupon,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  coupon?: Coupon;
  submitLabel: string;
}) {
  const c = coupon;
  const [type, setType] = React.useState<CouponType>(c?.type ?? "percent");

  const valueLabel =
    type === "percent" ? "Discount (%)" : type === "fixed" ? "Discount (₹)" : "Value";
  const valueHint =
    type === "bogo"
      ? "Not used for buy-one-get-one — the cheapest items are made free automatically."
      : type === "percent"
        ? "Percentage off the cart subtotal."
        : "Flat rupee amount off the cart subtotal.";

  return (
    <form action={action} className="space-y-5">
      {c ? <input type="hidden" name="id" defaultValue={c.id} /> : null}

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-semibold">Coupon</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" hint="Customers type this at checkout (auto-uppercased).">
            <input
              name="code"
              required
              defaultValue={c?.code}
              className={`${inputCls} uppercase`}
              placeholder="GIZMO10"
            />
          </Field>
          <Field label="Type">
            <Select
              name="type"
              value={type}
              onChange={(v) => setType(v as CouponType)}
              options={COUPON_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              className="w-full"
              triggerClassName="h-11 bg-background"
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label={valueLabel} hint={valueHint}>
            <input
              name="value"
              type="number"
              min={0}
              defaultValue={c?.value ?? 0}
              disabled={type === "bogo"}
              className={`${inputCls} disabled:opacity-50`}
            />
          </Field>
          <Field label="Min. order (₹)" hint="0 = no minimum">
            <input name="minOrder" type="number" min={0} defaultValue={c?.minOrder ?? 0} className={inputCls} />
          </Field>
          <Field label="Max discount (₹)" hint="Cap for % coupons. 0 = no cap">
            <input
              name="maxDiscount"
              type="number"
              min={0}
              defaultValue={c?.maxDiscount ?? 0}
              disabled={type !== "percent"}
              className={`${inputCls} disabled:opacity-50`}
            />
          </Field>
        </div>

        <Field label="Description" hint="Optional internal note.">
          <input name="description" defaultValue={c?.description} className={inputCls} placeholder="e.g. Launch week offer" />
        </Field>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-semibold">Limits & schedule</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Usage limit" hint="0 = unlimited">
            <input name="usageLimit" type="number" min={0} defaultValue={c?.usageLimit ?? 0} className={inputCls} />
          </Field>
          <Field label="Starts on" hint="Optional">
            <input name="startsAt" type="date" defaultValue={isoToDate(c?.startsAt)} className={inputCls} />
          </Field>
          <Field label="Expires on" hint="Optional">
            <input name="expiresAt" type="date" defaultValue={isoToDate(c?.expiresAt)} className={inputCls} />
          </Field>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={c ? c.active : true}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          Active (customers can use this coupon)
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label={submitLabel} />
        <a href="/admin/promotions" className="text-sm text-muted hover:text-foreground">
          Cancel
        </a>
        {c ? (
          <form
            action={deleteCoupon}
            className="ml-auto"
            onSubmit={(e) => {
              if (!confirm(`Delete coupon “${c.code}”?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={c.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg border border-danger/40 px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10 cursor-pointer"
            >
              <Trash2 size={15} /> Delete
            </button>
          </form>
        ) : null}
      </div>
    </form>
  );
}
