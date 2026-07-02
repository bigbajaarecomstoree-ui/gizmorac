import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildShopUrl, type RawParams } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageCount,
  params,
}: {
  page: number;
  pageCount: number;
  params: RawParams;
}) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <nav
      className="mt-10 flex items-center justify-center gap-1.5"
      aria-label="Pagination"
    >
      {/* At the boundary render a truly inert element — an aria-disabled link
          with a real href is still keyboard-focusable and activatable. */}
      {page === 1 ? (
        <span
          aria-disabled="true"
          aria-label="Previous page"
          className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted opacity-40"
        >
          <ChevronLeft size={16} />
        </span>
      ) : (
        <Link
          href={buildShopUrl(params, { page: page > 2 ? String(page - 1) : undefined })}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-border-bright hover:text-foreground"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </Link>
      )}

      {pages.map((p) => (
        <Link
          key={p}
          href={buildShopUrl(params, { page: p === 1 ? undefined : String(p) })}
          aria-current={p === page ? "page" : undefined}
          className={cn(
            "grid h-9 min-w-9 place-items-center rounded-lg border px-2 font-mono text-sm transition-colors",
            p === page
              ? "border-accent bg-accent-soft text-accent-bright"
              : "border-border text-muted hover:border-border-bright hover:text-foreground",
          )}
        >
          {p}
        </Link>
      ))}

      {page === pageCount ? (
        <span
          aria-disabled="true"
          aria-label="Next page"
          className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted opacity-40"
        >
          <ChevronRight size={16} />
        </span>
      ) : (
        <Link
          href={buildShopUrl(params, { page: String(page + 1) })}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-border-bright hover:text-foreground"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </Link>
      )}
    </nav>
  );
}
