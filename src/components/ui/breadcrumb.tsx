import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SITE } from "@/lib/constants";
import { jsonLd } from "@/lib/json-ld";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${SITE.url}${c.href}` } : {}),
    })),
  };

  return (
    <nav aria-label="Breadcrumb">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-faint">
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            {c.href ? (
              <Link href={c.href} className="transition-colors hover:text-accent">
                {c.label}
              </Link>
            ) : (
              <span className="text-muted" aria-current="page">
                {c.label}
              </span>
            )}
            {i < items.length - 1 ? <ChevronRight size={14} /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
