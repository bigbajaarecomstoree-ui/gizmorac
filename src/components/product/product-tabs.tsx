"use client";

import * as React from "react";
import { Check, Plus, BadgeCheck } from "lucide-react";
import type { FaqItem, ProductSpec, Review } from "@/lib/types";
import { RatingStars } from "./rating-stars";
import { cn } from "@/lib/utils";

const ALL_TABS = ["Description", "Features", "Specifications", "FAQs", "Reviews"] as const;
type Tab = (typeof ALL_TABS)[number];

export function ProductTabs({
  description,
  features,
  specs,
  faqs,
  reviews,
  rating,
  reviewCount,
}: {
  description: string;
  features: string[];
  specs: ProductSpec[];
  faqs: FaqItem[];
  reviews: Review[];
  rating: number;
  reviewCount: number;
}) {
  const [tab, setTab] = React.useState<Tab>("Description");

  // Only show tabs that actually have content (Description + Reviews always).
  const tabs: Tab[] = ["Description"];
  if (features.length) tabs.push("Features");
  if (specs.length) tabs.push("Specifications");
  if (faqs.length) tabs.push("FAQs");
  tabs.push("Reviews");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Product details"
        className="flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            onClick={() => setTab(t)}
            className={cn(
              "relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors cursor-pointer",
              tab === t ? "text-accent" : "text-muted hover:text-foreground",
            )}
          >
            {t}
            {t === "Reviews" ? (
              <span className="ml-1.5 font-mono text-xs text-faint">
                ({reviewCount})
              </span>
            ) : null}
            {tab === t ? (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />
            ) : null}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="py-6"
      >
        {tab === "Description" ? (
          <p className="whitespace-pre-line text-[0.95rem] leading-relaxed text-muted">
            {description}
          </p>
        ) : null}

        {tab === "Features" ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-muted">
                <Check size={16} className="mt-0.5 shrink-0 text-accent" />
                {f}
              </li>
            ))}
          </ul>
        ) : null}

        {tab === "Specifications" ? (
          <div className="max-w-2xl overflow-hidden rounded-xl border border-border">
            {specs.map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  "grid grid-cols-2 gap-4 px-4 py-3 text-sm",
                  i % 2 === 0 ? "bg-surface" : "bg-surface-2/40",
                )}
              >
                <span className="text-muted">{s.label}</span>
                <span className="font-medium text-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "FAQs" ? (
          <div className="max-w-3xl divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {faqs.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-sm font-medium hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <Plus
                    size={16}
                    className="shrink-0 text-faint transition-transform group-open:rotate-45 group-open:text-accent"
                  />
                </summary>
                <div className="px-4 pb-4 text-sm leading-relaxed text-muted">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        ) : null}

        {tab === "Reviews" ? (
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-surface p-5">
              <div className="text-center">
                <div className="readout text-4xl font-bold">{rating.toFixed(1)}</div>
                <div className="mt-1 flex justify-center">
                  <RatingStars rating={rating} />
                </div>
                <div className="tech-label mt-2">{reviewCount} ratings</div>
              </div>
              <p className="flex-1 text-sm text-muted">
                Based on verified purchases. Reviews are checked before they go
                live to keep ratings genuine.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {reviews.length > 0 ? (
                reviews.map((r) => (
                  <figure
                    key={r.id}
                    className="rounded-xl border border-border bg-surface p-4"
                  >
                    <div className="flex items-center justify-between">
                      <RatingStars rating={r.rating} />
                      {r.verified ? (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <BadgeCheck size={13} /> Verified
                        </span>
                      ) : null}
                    </div>
                    <figcaption className="mt-2.5 text-sm font-semibold">
                      {r.title}
                    </figcaption>
                    <blockquote className="mt-1 text-sm leading-relaxed text-muted">
                      {r.body}
                    </blockquote>
                    <div className="mt-3 text-xs text-faint">
                      {r.author} · {r.location}
                    </div>
                  </figure>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted">
                  No reviews for this product yet. Be the first to share yours.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
