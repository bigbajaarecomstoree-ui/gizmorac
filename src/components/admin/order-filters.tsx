"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { ORDER_STATUSES, DATE_RANGES, type DateRange } from "@/lib/data/orders";
import { Select, type SelectOption } from "@/components/ui/select";
import type { OrderStatus } from "@/lib/types";

const DEFAULT_SIZE = 100;

const RANGE_OPTIONS: SelectOption[] = DATE_RANGES.map((r) => ({
  value: r.value,
  label: r.label,
}));
const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "All statuses" },
  ...ORDER_STATUSES.map((s) => ({ value: s, label: s })),
];

function buildUrl(parts: {
  status?: string;
  range?: string;
  q?: string;
  size?: number;
}) {
  const params = new URLSearchParams();
  if (parts.status && parts.status !== "all") params.set("status", parts.status);
  if (parts.range && parts.range !== "all") params.set("range", parts.range);
  if (parts.q && parts.q.trim()) params.set("q", parts.q.trim());
  if (parts.size && parts.size !== DEFAULT_SIZE) params.set("size", String(parts.size));
  const qs = params.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
}

export function OrderFilters({
  status,
  range,
  q,
  size,
}: {
  status: OrderStatus | "all";
  range: DateRange;
  q: string;
  size: number;
}) {
  const router = useRouter();
  const [search, setSearch] = React.useState(q);
  const hasFilters = status !== "all" || range !== "all" || q.trim() !== "";
  // Set when "Clear filters" resets everything, so the search debounce below
  // doesn't re-push the now-stale status/range and undo the reset.
  const suppressDebounce = React.useRef(false);

  const [prevQ, setPrevQ] = React.useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    setSearch(q);
  }

  React.useEffect(() => {
    if (suppressDebounce.current) {
      suppressDebounce.current = false;
      return;
    }
    const trimmed = search.trim();
    if (trimmed === q) return;
    const handle = setTimeout(
      () => router.push(buildUrl({ status, range, q: trimmed, size })),
      300,
    );
    return () => clearTimeout(handle);
  }, [search, q, status, range, size, router]);

  function clearAll() {
    suppressDebounce.current = true;
    setSearch("");
    router.push("/admin/orders");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.push(buildUrl({ status, range, q: search, size }));
        }}
        className="relative min-w-[180px] flex-1"
        role="search"
      >
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order #, name, email, phone"
          aria-label="Search orders"
          className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-9 text-sm placeholder:text-faint focus:border-accent focus:outline-none"
        />
        {search ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              router.push(buildUrl({ status, range, q: "", size }));
            }}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-faint transition-colors hover:text-foreground"
          >
            <X size={15} />
          </button>
        ) : null}
      </form>

      <Select
        options={RANGE_OPTIONS}
        value={range}
        onChange={(r) => router.push(buildUrl({ status, range: r, q: search, size }))}
        ariaLabel="Date range"
      />

      <Select
        options={STATUS_OPTIONS}
        value={status}
        onChange={(s) => router.push(buildUrl({ status: s, range, q: search, size }))}
        ariaLabel="Order status"
      />

      {hasFilters ? (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted transition-colors hover:border-danger hover:text-danger"
        >
          <X size={15} /> Clear filters
        </button>
      ) : null}
    </div>
  );
}

const SIZE_OPTIONS = (sizes: number[]): SelectOption[] =>
  sizes.map((n) => ({ value: String(n), label: String(n) }));

/** Rows-per-page selector for the bottom of the orders list. */
export function OrdersPageSize({
  status,
  range,
  q,
  size,
  sizes,
}: {
  status: OrderStatus | "all";
  range: DateRange;
  q: string;
  size: number;
  sizes: number[];
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 whitespace-nowrap text-sm text-muted">
      Show
      <Select
        options={SIZE_OPTIONS(sizes)}
        value={String(size)}
        onChange={(v) => router.push(buildUrl({ status, range, q, size: Number(v) }))}
        ariaLabel="Orders per page"
      />
      per page
    </label>
  );
}
