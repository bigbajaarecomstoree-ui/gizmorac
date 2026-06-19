import { BadgeCheck, Quote } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { RatingStars } from "@/components/product/rating-stars";
import { getReviews } from "@/lib/data/queries";

export async function Reviews() {
  const reviews = await getReviews(6);

  return (
    <section className="border-y border-border bg-surface/30">
      <div className="shell py-8 sm:py-12">
        <SectionHeading
          eyebrow="Real customers"
          title="Loved across the country"
          description="Verified reviews from gadget buyers in every corner of India."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <figure
              key={r.id}
              className="flex flex-col rounded-xl border border-border bg-surface p-5"
            >
              <div className="flex items-center justify-between">
                <RatingStars rating={r.rating} />
                <Quote size={20} className="text-border-bright" />
              </div>
              <figcaption className="mt-4 font-semibold">{r.title}</figcaption>
              <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                {r.body}
              </blockquote>
              <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 font-display text-sm font-semibold text-accent">
                  {r.author.charAt(0)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    {r.author}
                    {r.verified ? (
                      <BadgeCheck size={14} className="text-success" />
                    ) : null}
                  </div>
                  <div className="text-xs text-faint">{r.location}</div>
                </div>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
