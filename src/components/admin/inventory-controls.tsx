"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Select } from "@/components/ui/select";

/** Search box with live (debounced) filtering + a dedicated Clear button. */
export function InventoryControls({
  q,
  status,
  size,
}: {
  q: string;
  status: string;
  size: number;
}) {
  const router = useRouter();
  const [search, setSearch] = React.useState(q);

  // Re-sync the box when the URL's q changes externally (e.g. back button).
  const [prevQ, setPrevQ] = React.useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    setSearch(q);
  }

  const urlFor = React.useCallback(
    (query: string) => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (status && status !== "all") params.set("status", status);
      if (size !== 25) params.set("size", String(size));
      const qs = params.toString();
      return qs ? `/admin/inventory?${qs}` : "/admin/inventory";
    },
    [status, size],
  );

  // Live search: push the filtered URL ~300ms after typing stops. Clearing the
  // box (search === "") resets back to the full list automatically.
  React.useEffect(() => {
    const trimmed = search.trim();
    if (trimmed === q) return;
    const handle = setTimeout(() => router.push(urlFor(trimmed)), 300);
    return () => clearTimeout(handle);
  }, [search, q, urlFor, router]);

  // Full reset clears the search *and* any active status-card filter.
  const resetHref = size !== 25 ? `/admin/inventory?size=${size}` : "/admin/inventory";
  const showClear = search.trim() !== "" || (status && status !== "all");

  return (
    <div className="flex items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.push(urlFor(search));
        }}
        className="relative min-w-0 flex-1"
        role="search"
      >
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or SKU"
          aria-label="Search inventory"
          className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none"
        />
      </form>

      {showClear ? (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            router.push(resetHref);
          }}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted transition-colors hover:border-danger/40 hover:text-danger cursor-pointer"
        >
          <X size={14} /> Clear
        </button>
      ) : null}
    </div>
  );
}

/** Rows-per-page selector, rendered at the bottom of the list. */
export function InventoryPageSize({
  q,
  status,
  size,
  sizes,
}: {
  q: string;
  status: string;
  size: number;
  sizes: number[];
}) {
  const router = useRouter();

  function go(next: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status && status !== "all") params.set("status", status);
    if (next !== 25) params.set("size", String(next));
    const qs = params.toString();
    router.push(qs ? `/admin/inventory?${qs}` : "/admin/inventory");
  }

  return (
    <label className="flex items-center gap-2 whitespace-nowrap text-sm text-muted">
      Show
      <Select
        options={sizes.map((n) => ({ value: String(n), label: String(n) }))}
        value={String(size)}
        onChange={(v) => go(Number(v))}
        ariaLabel="Rows per page"
      />
      per page
    </label>
  );
}
