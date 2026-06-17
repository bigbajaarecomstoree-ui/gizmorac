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
      <Link
        href={buildShopUrl(params, { page: page > 2 ? String(page - 1) : undefined })}
        aria-disabled={page === 1}
        className={cn(
          "grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-border-bright hover:text-foreground",
          page === 1 && "pointer-events-none opacity-40",
        )}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </Link>

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

      <Link
        href={buildShopUrl(params, { page: String(page + 1) })}
        aria-disabled={page === pageCount}
        className={cn(
          "grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-border-bright hover:text-foreground",
          page === pageCount && "pointer-events-none opacity-40",
        )}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </Link>
    </nav>
  );
}
