"use client";

import { useFormStatus } from "react-dom";
import {
  Loader2,
  Package,
  ImageIcon,
  IndianRupee,
  Boxes,
  Lock,
  Eye,
  FileText,
  ListChecks,
} from "lucide-react";
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
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </span>
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

function Card({
  title,
  desc,
  icon: Icon,
  children,
}: {
  title: string;
  desc?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
          <Icon size={18} />
        </span>
        <div>
          <h2 className="font-semibold leading-tight">{title}</h2>
          {desc ? <p className="mt-0.5 text-xs text-muted">{desc}</p> : null}
        </div>
      </div>
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
    <form action={action} className="mx-auto max-w-3xl space-y-5 pb-24">
      {p ? <input type="hidden" name="id" defaultValue={p.id} /> : null}

      {/* 1 — what the product is */}
      <Card
        title="Product details"
        desc="The name and category customers see."
        icon={Package}
      >
        <Field label="Product name" required>
          <input
            name="name"
            required
            defaultValue={p?.name}
            className={inputCls}
            placeholder="e.g. GIZMORAC Wireless Mouse"
          />
        </Field>
        <Field label="Category" required>
          <Select
            name="category"
            defaultValue={p?.category ?? categories[0]?.slug ?? ""}
            options={categories.map((c) => ({ value: c.slug, label: c.name }))}
            className="w-full"
            triggerClassName="h-11 bg-background"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU" hint="Your own product code (optional).">
            <input name="sku" defaultValue={p?.sku} className={inputCls} placeholder="e.g. GZ-MOUSE-01" />
          </Field>
          <Field label="Web link (slug)" hint="Leave blank — created automatically from the name.">
            <input name="slug" defaultValue={p?.slug} className={inputCls} placeholder="auto" />
          </Field>
        </div>
        <Field
          label="Placeholder icon"
          hint="A line drawing shown ONLY until you upload a real photo below."
        >
          <Select
            name="art"
            defaultValue={p?.art ?? "printer"}
            options={ART_OPTIONS.map((a) => ({ value: a, label: a }))}
            className="w-full"
            triggerClassName="h-11 bg-background"
          />
        </Field>
      </Card>

      {/* 2 — media */}
      <Card
        title="Photos & video"
        desc="Up to 7 photos and one video. The first photo is the main image."
        icon={ImageIcon}
      >
        <MediaUploader defaultImages={p?.images ?? []} defaultVideo={p?.video ?? null} />
      </Card>

      {/* 3 — pricing (customer-facing) */}
      <Card
        title="Pricing"
        desc="What customers pay. The discount badge is calculated from MRP automatically."
        icon={IndianRupee}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Selling price (₹)" required hint="The price the customer pays.">
            <input name="price" type="number" min={0} required defaultValue={p?.price} className={inputCls} placeholder="e.g. 1499" />
          </Field>
          <Field label="MRP (₹)" required hint="Original price — shown struck-through.">
            <input name="mrp" type="number" min={0} required defaultValue={p?.mrp} className={inputCls} placeholder="e.g. 2499" />
          </Field>
        </div>
      </Card>

      {/* 4 — inventory */}
      <Card title="Inventory" desc="Stock on hand and when to be warned." icon={Boxes}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Stock (units available)">
            <input name="stock" type="number" min={0} defaultValue={p?.stock ?? 0} className={inputCls} />
          </Field>
          <Field label="Low-stock alert at" hint="Flag the product when stock falls to this number.">
            <input name="lowStockThreshold" type="number" min={0} defaultValue={p?.lowStockThreshold ?? 10} className={inputCls} />
          </Field>
          <Field label="Warranty (months)" hint="0 = no warranty. Buyers see a “Warranty claim” button only within this window.">
            <input name="warrantyMonths" type="number" min={0} defaultValue={p?.warrantyMonths ?? 0} className={inputCls} />
          </Field>
        </div>
      </Card>

      {/* 5 — internal cost & tax */}
      <Card
        title="Cost & tax — internal only"
        desc="🔒 Never shown to customers or on receipts. Used for your profit (P&L) and GST filing."
        icon={Lock}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Cost price (₹)" hint="What you pay per unit.">
            <input name="cost" type="number" min={0} defaultValue={p?.cost ?? 0} className={inputCls} />
          </Field>
          <Field label="HSN code" hint="For GST filing.">
            <input name="hsn" type="text" defaultValue={p?.hsn ?? ""} placeholder="e.g. 8518" className={inputCls} />
          </Field>
          <Field label="GST rate %" hint="For GST filing.">
            <input name="gstRate" type="number" min={0} step={0.5} defaultValue={p?.gstRate ?? 18} className={inputCls} />
          </Field>
        </div>
      </Card>

      {/* shipping package — drives Shiprocket rates & labels per order */}
      <Card
        title="Shipping package"
        desc="Per-unit packed size & weight. Used to auto-calculate each order's package for Shiprocket."
        icon={Package}
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Weight (kg)" hint="Packed, per unit.">
            <input name="weightKg" type="number" min={0.01} step={0.01} defaultValue={p?.weightKg ?? 0.5} className={inputCls} />
          </Field>
          <Field label="Length (cm)">
            <input name="lengthCm" type="number" min={1} defaultValue={p?.lengthCm ?? 15} className={inputCls} />
          </Field>
          <Field label="Breadth (cm)">
            <input name="breadthCm" type="number" min={1} defaultValue={p?.breadthCm ?? 12} className={inputCls} />
          </Field>
          <Field label="Height (cm)">
            <input name="heightCm" type="number" min={1} defaultValue={p?.heightCm ?? 5} className={inputCls} />
          </Field>
        </div>
      </Card>

      {/* 6 — visibility & placement */}
      <Card
        title="Visibility & placement"
        desc="Whether the product is live, and where it's featured."
        icon={Eye}
      >
        <label className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          <span>
            <span className="font-medium">Active</span> — saving publishes it to the
            storefront.{" "}
            <span className="text-faint">Uncheck to save as a hidden draft.</span>
          </span>
        </label>

        <div>
          <p className="mb-2 text-sm font-medium">Feature on the home page</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { name: "isBestSeller", label: "Best seller", val: p?.isBestSeller },
              { name: "isFeatured", label: "Featured", val: p?.isFeatured },
              { name: "isDeal", label: "Deal of the day", val: p?.isDeal },
            ].map((f) => (
              <label
                key={f.name}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              >
                <input type="checkbox" name={f.name} defaultChecked={f.val} className="h-4 w-4 accent-[var(--color-accent)]" />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        <Field label="Badges" hint="Small labels on the product card. Comma separated, e.g. Best Seller, New">
          <input name="badges" defaultValue={p?.badges.join(", ")} className={inputCls} placeholder="Best Seller, New" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Star rating (0–5)" hint="Shown as stars on the product.">
            <input name="rating" type="number" step="0.1" min="0" max="5" defaultValue={p?.rating ?? 4.5} className={inputCls} />
          </Field>
          <Field label="Number of reviews">
            <input name="reviewCount" type="number" min={0} defaultValue={p?.reviewCount ?? 0} className={inputCls} />
          </Field>
        </div>
      </Card>

      {/* 7 — description */}
      <Card
        title="Description"
        desc="The text customers read about this product."
        icon={FileText}
      >
        <Field label="Short description" hint="One line shown under the title.">
          <textarea name="shortDescription" rows={2} defaultValue={p?.shortDescription} className={areaCls} placeholder="A pocket-sized speaker with deep bass." />
        </Field>
        <Field label="Full description" hint="The detailed description on the product page.">
          <textarea name="description" rows={5} defaultValue={p?.description} className={areaCls} />
        </Field>
        <Field label="Highlights" hint="Key selling points — write one per line.">
          <textarea name="highlights" rows={3} defaultValue={p?.highlights.join("\n")} className={areaCls} placeholder={"12-hour battery\nIPX5 splash resistant\nBluetooth 5.3"} />
        </Field>
      </Card>

      {/* 8 — specs & faqs */}
      <Card
        title="Specifications & FAQs"
        desc="Optional extra detail shown in tabs on the product page."
        icon={ListChecks}
      >
        <Field label="Features" hint="Write one per line.">
          <textarea name="features" rows={4} defaultValue={p?.features.join("\n")} className={areaCls} />
        </Field>
        <Field label="Specifications" hint="One per line, as “Label: Value” — e.g. Battery: 2000mAh">
          <textarea
            name="specs"
            rows={4}
            defaultValue={p?.specs.map((s) => `${s.label}: ${s.value}`).join("\n")}
            className={areaCls}
            placeholder={"Battery: 2000mAh\nWeight: 220g"}
          />
        </Field>
        <Field label="FAQs" hint="One per line, as “Question :: Answer”">
          <textarea
            name="faqs"
            rows={4}
            defaultValue={p?.faqs.map((f) => `${f.q} :: ${f.a}`).join("\n")}
            className={areaCls}
            placeholder={"Is it waterproof? :: It is IPX5 splash resistant.\nWarranty? :: 1 year."}
          />
        </Field>
      </Card>

      {/* sticky save bar */}
      <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-end gap-3 border-t border-border bg-background/90 px-1 py-3 backdrop-blur">
        <a href="/admin/products" className="text-sm text-muted transition-colors hover:text-foreground">
          Cancel
        </a>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
