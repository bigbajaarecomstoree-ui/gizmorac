"use client";

import * as React from "react";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { ImagePlus, Loader2, X } from "lucide-react";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

const ART_OPTIONS = [
  "printer", "inflator", "knee-massager", "eye-massager", "bp-monitor",
  "oximeter", "keyboard", "usb-hub", "charger", "vacuum", "mount",
  "webcam", "mouse", "stand", "neck-massager",
];

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

export function CategoryForm({
  action,
  category,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  category?: Category;
  submitLabel: string;
}) {
  const c = category;
  const [image, setImage] = React.useState(c?.image ?? "");
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "image");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setImage(data.url as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} className="space-y-5">
      {c ? <input type="hidden" name="id" defaultValue={c.id} /> : null}
      <input type="hidden" name="image" value={image} />

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-semibold">Category</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input name="name" required defaultValue={c?.name} className={inputCls} placeholder="e.g. Audio &amp; Headphones" />
          </Field>
          <Field label="Slug" hint="Leave blank to auto-generate from the name">
            <input name="slug" defaultValue={c?.slug} className={inputCls} placeholder="auto" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Tagline" hint="Short line shown under the category name on the home grid">
            <input name="tagline" defaultValue={c?.tagline} className={inputCls} placeholder="A few words about this category" />
          </Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Fallback icon" hint="Shown when no image is set">
            <Select
              name="art"
              defaultValue={c?.art ?? "printer"}
              options={ART_OPTIONS.map((a) => ({ value: a, label: a }))}
              className="w-full"
              triggerClassName="h-11 bg-background"
            />
          </Field>
          <Field label="Display order" hint="Lower numbers show first (or drag to reorder)">
            <input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} className={inputCls} />
          </Field>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={c?.featured}
              className="mt-0.5 size-4 cursor-pointer accent-accent"
            />
            <span>
              <span className="block text-sm font-medium">Featured</span>
              <span className="block text-xs text-faint">Promote this category on the homepage.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3">
            <input
              type="checkbox"
              name="hidden"
              defaultChecked={c?.hidden}
              className="mt-0.5 size-4 cursor-pointer accent-accent"
            />
            <span>
              <span className="block text-sm font-medium">Hidden</span>
              <span className="block text-xs text-faint">
                Hide from the storefront (seasonal / coming-soon) without deleting.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Image</h2>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
            {uploading ? "Uploading…" : image ? "Replace image" : "Add image"}
            <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={uploading} />
          </label>
        </div>

        {image ? (
          <div className="relative inline-block">
            <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-border">
              <Image src={image} alt="" fill sizes="128px" className="object-cover" />
            </div>
            <button
              type="button"
              onClick={() => setImage("")}
              aria-label="Remove image"
              className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-border bg-surface text-muted shadow-sm hover:text-danger cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Optional. Without an image, the fallback icon is shown on the home grid.
          </p>
        )}
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </section>

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
        <a href="/admin/categories" className="text-sm text-muted hover:text-foreground">
          Cancel
        </a>
      </div>
    </form>
  );
}
