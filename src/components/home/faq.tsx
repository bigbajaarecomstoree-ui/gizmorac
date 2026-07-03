import { Plus } from "lucide-react";
import type { FaqItem } from "@/lib/types";
import { SectionHeading } from "@/components/ui/section-heading";
import { jsonLd } from "@/lib/json-ld";

export function FaqAccordion({
  items,
  description,
}: {
  items: FaqItem[];
  description?: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section id="faq" className="shell scroll-mt-24 py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      <SectionHeading
        eyebrow="Questions"
        title="Frequently asked questions"
        description={description}
      />
      <div className="mx-auto mt-10 max-w-3xl divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {items.map((f) => (
          <details key={f.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[0.95rem] font-medium transition-colors hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
              {f.q}
              <Plus
                size={18}
                className="shrink-0 text-faint transition-transform duration-200 group-open:rotate-45 group-open:text-accent"
              />
            </summary>
            <div className="px-5 pb-5 text-sm leading-relaxed text-muted">
              {f.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
