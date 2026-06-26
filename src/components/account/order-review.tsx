"use client";

import * as React from "react";
import { Star, Loader2, CheckCircle2, Pencil } from "lucide-react";
import { submitReview } from "@/lib/storefront/actions";
import { cn } from "@/lib/utils";

interface ExistingReview {
  rating: number;
  title: string;
  body: string;
}

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

function StarInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = React.useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-3">
      <div className="flex" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="p-0.5 text-highlight transition-transform hover:scale-110 cursor-pointer"
          >
            <Star
              size={28}
              strokeWidth={1.5}
              className={cn(n <= shown ? "fill-current" : "text-border-bright")}
            />
          </button>
        ))}
      </div>
      {shown ? (
        <span className="text-sm font-medium text-muted">{LABELS[shown]}</span>
      ) : null}
    </div>
  );
}

export function OrderItemReview({
  orderNumber,
  productId,
  productName,
  existing,
}: {
  orderNumber: string;
  productId: string;
  productName: string;
  existing?: ExistingReview | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState(existing?.rating ?? 0);
  const [title, setTitle] = React.useState(existing?.title ?? "");
  const [body, setBody] = React.useState(existing?.body ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<ExistingReview | null>(existing ?? null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) {
      setError("Please tap a star to rate.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await submitReview({ orderNumber, productId, rating, title, body });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSaved({ rating, title, body });
    setOpen(false);
  }

  // Already reviewed and not editing → compact summary with an edit button.
  if (saved && !open) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-success">
            <CheckCircle2 size={16} /> You rated {productName}
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-accent cursor-pointer"
          >
            <Pencil size={12} /> Edit
          </button>
        </div>
        <div className="mt-1.5 flex text-highlight">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={15}
              strokeWidth={1.5}
              className={cn(n <= saved.rating ? "fill-current" : "text-border-bright")}
            />
          ))}
        </div>
        {saved.body ? (
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{saved.body}</p>
        ) : null}
      </div>
    );
  }

  // Not yet reviewed and form closed → prompt.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3.5 py-3 text-left text-sm transition-colors hover:border-accent cursor-pointer"
      >
        <span>
          <span className="font-medium">Rate &amp; review</span>
          <span className="ml-1 text-muted">— {productName}</span>
        </span>
        <span className="flex text-border-bright">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={16} strokeWidth={1.5} />
          ))}
        </span>
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-background p-4">
      <p className="text-sm font-medium">{productName}</p>
      <p className="mt-0.5 text-xs text-muted">How was it? Your review helps other shoppers.</p>

      <div className="mt-3">
        <StarInput value={rating} onChange={setRating} />
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        placeholder="Add a headline (optional)"
        className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Share your experience (optional)"
        className="mt-2 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />

      {error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : null}
          {saved ? "Update review" : "Submit review"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
