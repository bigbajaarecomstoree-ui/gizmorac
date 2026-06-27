import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  hrefLabel = "View all",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-xl">
        {eyebrow ? (
          <div className="mb-3 flex items-center gap-2.5">
            <span className="h-px w-7 bg-accent" />
            <span className="tech-label !text-accent-bright">{eyebrow}</span>
          </div>
        ) : null}
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        {description ? (
          <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-accent-bright transition-colors hover:text-accent"
        >
          {hrefLabel}
          <ArrowRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </Link>
      ) : null}
    </div>
  );
}
