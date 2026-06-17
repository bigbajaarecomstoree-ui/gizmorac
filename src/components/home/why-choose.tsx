import { BadgeCheck, Truck, Headset, ShieldCheck } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";

const REASONS = [
  {
    icon: BadgeCheck,
    title: "Quality tested",
    body: "Every product is inspected and tested before it leaves our warehouse.",
  },
  {
    icon: Truck,
    title: "Fast shipping",
    body: "PAN India delivery with tracking on every order, big or small.",
  },
  {
    icon: Headset,
    title: "Dedicated support",
    body: "Quick help over WhatsApp and email, from real humans who care.",
  },
  {
    icon: ShieldCheck,
    title: "Warranty protection",
    body: "Eligible products are covered by genuine manufacturer warranty.",
  },
];

export function WhyChoose() {
  return (
    <section className="shell py-8 sm:py-20">
      <SectionHeading
        eyebrow="Why GIZMORAC"
        title="Built on trust, shipped with care"
        description="The little things that make buying gadgets from us feel effortless."
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {REASONS.map((r) => (
          <div
            key={r.title}
            className="group rounded-xl border border-border bg-surface p-6 transition-colors hover:border-border-bright"
          >
            <span className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-surface-2 text-accent transition-colors group-hover:border-accent/40">
              <r.icon size={20} />
            </span>
            <h3 className="mt-4 text-base font-semibold">{r.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{r.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
