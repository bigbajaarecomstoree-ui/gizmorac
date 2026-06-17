"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { ORDER_STATUSES, DATE_RANGES, type DateRange } from "@/lib/data/orders";
import type { OrderStatus } from "@/lib/types";

const selectCls =
  "h-10 rounded-lg border border-border bg-background px-3 text-sm focus:border-accent focus:outline-none";

export function OrderFilters({
  status,
  range,
  q,
}: {
  status: OrderStatus | "all";
  range: DateRange;
  q: string;
}) {
  const router = useRouter();
  const [search, setSearch] = React.useState(q);

  const push = React.useCallback(
    (next: { status?: string; range?: string; q?: string }) => {
      const params = new URLSearchParams();
      const s = next.status ?? status;
      const r = next.range ?? range;
      const query = next.q ?? search;
      if (s && s !== "all") params.set("status", s);
      if (r && r !== "all") params.set("range", r);
      if (query.trim()) params.set("q", query.trim());
      const qs = params.toString();
      router.push(qs ? `/admin/orders?${qs}` : "/admin/orders");
    },
    [router, status, range, search],
  );

  const hasFilters = status !== "all" || range !== "all" || q !== "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          push({ q: search });
        }}
        className="relative flex-1 min-w-[180px]"
        role="search"
      >
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order #, name, email, phone"
          aria-label="Search orders"
          className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none"
        />
      </form>

      <select
        value={range}
        onChange={(e) => push({ range: e.target.value })}
        className={selectCls}
        aria-label="Date range"
      >
        {DATE_RANGES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      <select
        value={status}
        onChange={(e) => push({ status: e.target.value })}
        className={selectCls}
        aria-label="Order status"
      >
        <option value="all">All statuses</option>
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => router.push("/admin/orders")}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted transition-colors hover:border-danger/40 hover:text-danger cursor-pointer"
        >
          <X size={14} /> Clear
        </button>
      ) : null}
    </div>
  );
}
