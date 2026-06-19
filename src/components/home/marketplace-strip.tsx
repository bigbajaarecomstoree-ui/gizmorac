import Image from "next/image";
import { Star } from "lucide-react";
import { TRUST_STATS } from "@/lib/constants";
import { CountUp } from "./count-up";

const STATS = [
  { value: TRUST_STATS.orders, label: "Orders delivered" },
  { value: TRUST_STATS.reviews, label: "Verified reviews" },
  { value: `${TRUST_STATS.rating}+`, label: "Average rating" },
];

export function MarketplaceStrip() {
  return (
    <section className="border-b border-border bg-surface/30">
      <div className="shell py-8 sm:py-12">
        <p className="text-center text-sm font-medium text-muted">
          Trusted by thousands across India
        </p>

        <div className="mt-6 flex flex-col items-center gap-2.5">
          <Image
            src="/amazon-logo.png"
            alt="Amazon"
            width={6110}
            height={2047}
            unoptimized
            className="h-[47px] w-auto object-contain"
          />
          <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1">
            <Star size={13} className="fill-accent text-accent" />
            <span className="readout text-xs font-semibold">4.6</span>
          </span>
        </div>

        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border">
          {STATS.map((s) => (
            <div key={s.label} className="bg-background px-4 py-6 text-center">
              <div className="readout text-lg font-bold sm:text-3xl">
                <CountUp value={String(s.value)} />
              </div>
              <div className="tech-label mt-2 !text-[0.5625rem] sm:!text-[0.6875rem]">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
