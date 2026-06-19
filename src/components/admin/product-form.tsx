"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { Product, Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { MediaUploader } from "@/components/admin/media-uploader";

const ART_OPTIONS = [
  "printer",
  "inflator",
  "knee-massager",
  "eye-massager",
  "bp-monitor",
  "oximeter",
  "keyboard",
  "usb-hub",
  "charger",
  "vacuum",
  "mount",
  "webcam",
  "mouse",
  "stand",
  "neck-massager",
];

const inputCls =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none";
const areaCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-faint focus:border-accent focus:outline-none";

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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function ProductForm({
  action,
  product,
  submitLabel,
  categories,
}: {
  action: (formData: FormData) => void | Promise<void>;
  product?: Product;
  submitLabel: string;
  categories: Category[];
}) {
  const p = product;
  return (
    <form action={action} className="grid gap-5 lg:grid-cols-2">
      {p ? <input type="hidden" name="id" defaultValue={p.id} /> : null}

      <Card title="Basics">
        <Field label="Product name">
          <input name="name" required defaultValue={p?.name} className={inputCls} placeholder="GIZMORAC …" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Slug" hint="Leave blank to auto-generate">
            <input name="slug" defaultValue={p?.slug} className={inputCls} placeholder="auto" />
          </Field>
          <Field label="SKU">
            <input name="sku" defaultValue={p?.sku} className={inputCls} placeholder="GZ-…" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <Select
              name="category"
              defaultValue={p?.category ?? categories[0]?.slug ?? ""}
              options={categories.map((c) => ({ value: c.slug, label: c.name }))}
              className="w-full"
              triggerClassName="h-11 bg-background"
            />
          </Field>
          <Field label="Fallback icon" hint="Shown until photos are uploaded">
            <Select
              name="art"
              defaultValue={p?.art ?? "printer"}
              options={ART_OPTIONS.map((a) => ({ value: a, label: a }))}
              className="w-full"
              triggerClassName="h-11 bg-background"
            />
          </Field>
        </div>
      </Card>

      <section className="rounded-xl border border-border bg-surface p-5 lg:col-span-2">
        <h2 className="mb-4 font-semibold">Media</h2>
        <MediaUploader
          defaultImages={p?.images ?? []}
          defaultVideo={p?.video ?? null}
        />
      </section>

      <Card title="Pricing & stock">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Sale price (₹)">
            <input name="price" type="number" required defaultValue={p?.price} className={inputCls} />
          </Field>
          <Field label="MRP (₹)">
            <input name="mrp" type="number" required defaultValue={p?.mrp} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Cost price (₹)" hint="Your purchase cost — used for profit">
            <input name="cost" type="number" min={0} defaultValue={p?.cost ?? 0} className={inputCls} />
          </Field>
          <div />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Stock">
            <input name="stock" type="number" defaultValue={p?.stock ?? 0} className={inputCls} />
          </Field>
          <Field label="Low-stock alert at" hint="Flag inventory at or below this">
            <input name="lowStockThreshold" type="number" defaultValue={p?.lowStockThreshold ?? 10} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Rating">
            <input name="rating" type="number" step="0.1" min="0" max="5" defaultValue={p?.rating ?? 4.5} className={inputCls} />
          </Field>
          <Field label="Reviews">
            <input name="reviewCount" type="number" defaultValue={p?.reviewCount ?? 0} className={inputCls} />
          </Field>
        </div>
        <Field label="Badges" hint="Comma separated, e.g. Best Seller, Value Pick">
          <input name="badges" defaultValue={p?.badges.join(", ")} className={inputCls} />
        </Field>
        <label className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={p ? p.active : true}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          <span>
            <span className="font-medium">Active</span> — visible on the
            storefront <span className="text-faint">(uncheck to save as draft)</span>
          </span>
        </label>
        <div className="flex flex-wrap gap-4 pt-1">
          {[
            { name: "isBestSeller", label: "Best seller", val: p?.isBestSeller },
            { name: "isFeatured", label: "Featured", val: p?.isFeatured },
            { name: "isDeal", label: "Deal of the day", val: p?.isDeal },
          ].map((f) => (
            <label key={f.name} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={f.name} defaultChecked={f.val} className="h-4 w-4 accent-[var(--color-accent)]" />
              {f.label}
            </label>
          ))}
        </div>
      </Card>

      <Card title="Description">
        <Field label="Short description">
          <textarea name="shortDescription" rows={2} defaultValue={p?.shortDescription} className={areaCls} />
        </Field>
        <Field label="Full description">
          <textarea name="description" rows={4} defaultValue={p?.description} className={areaCls} />
        </Field>
        <Field label="Highlights" hint="One per line">
          <textarea name="highlights" rows={3} defaultValue={p?.highlights.join("\n")} className={areaCls} />
        </Field>
      </Card>

      <Card title="Specs & FAQs">
        <Field label="Features" hint="One per line">
          <textarea name="features" rows={4} defaultValue={p?.features.join("\n")} className={areaCls} />
        </Field>
        <Field label="Specifications" hint="One per line — “Label: Value”">
          <textarea
            name="specs"
            rows={4}
            defaultValue={p?.specs.map((s) => `${s.label}: ${s.value}`).join("\n")}
            className={areaCls}
          />
        </Field>
        <Field label="FAQs" hint="One per line — “Question :: Answer”">
          <textarea
            name="faqs"
            rows={4}
            defaultValue={p?.faqs.map((f) => `${f.q} :: ${f.a}`).join("\n")}
            className={areaCls}
          />
        </Field>
      </Card>

      <div className="flex items-center gap-3 lg:col-span-2">
        <SubmitButton label={submitLabel} />
        <a href="/admin/products" className="text-sm text-muted hover:text-foreground">
          Cancel
        </a>
      </div>
    </form>
  );
}
