import { BadgeCheck, Quote, RefreshCw, PackageCheck, Truck, ShieldCheck } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { RatingStars } from "@/components/product/rating-stars";
import { getRecentReviews } from "@/lib/data/customer-reviews";

const PROMISES = [
  { icon: RefreshCw, title: "7-day replacement", sub: "Damaged or defective? We replace it." },
  { icon: PackageCheck, title: "Tested before dispatch", sub: "Every unit checked before it ships." },
  { icon: Truck, title: "PAN-India COD", sub: "Pay on delivery, almost everywhere." },
  { icon: ShieldCheck, title: "Secure payments", sub: "UPI / cards on a protected checkout." },
];

export async function Reviews() {
  // Real customer reviews appear here once they exist; until then, an honest
  // promise block. Never fabricated testimonials — no fake social proof, ever.
  const reviews = await getRecentReviews(6);

  if (reviews.length === 0) {
    return (
      <section className="border-y border-border bg-surface/30">
        <div className="shell py-8 sm:py-12">
          <SectionHeading
            eyebrow="Our promise"
            title="What every order comes with"
            description="No inflated numbers — just the guarantees behind each GIZMORAC purchase."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map((p) => (
              <div
                key={p.title}
                className="flex flex-col items-center rounded-xl border border-border bg-surface p-6 text-center"
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-accent">
                  <p.icon size={20} strokeWidth={1.75} />
                </span>
                <p className="mt-4 font-semibold">{p.title}</p>
                <p className="mt-1 text-sm text-muted">{p.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-y border-border bg-surface/30">
      <div className="shell py-8 sm:py-12">
        <SectionHeading
          eyebrow="From our customers"
          title="What buyers are saying"
          description="Reviews from verified GIZMORAC orders."
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
