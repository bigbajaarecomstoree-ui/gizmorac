"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { buildShopUrl, type RawParams } from "@/lib/shop-url";

const OPTIONS = [
  { value: "popular", label: "Most popular" },
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Highest rated" },
  { value: "discount", label: "Biggest discount" },
];

export function SortSelect({
  value,
  params,
}: {
  value: string;
  params: RawParams;
}) {
  const router = useRouter();
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) =>
          router.push(
            buildShopUrl(params, { sort: e.target.value, page: undefined }),
          )
        }
        aria-label="Sort products"
        className="h-10 cursor-pointer appearance-none rounded-lg border border-border bg-surface pl-3.5 pr-9 text-sm text-foreground focus:border-accent focus:outline-none"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint"
      />
    </div>
  );
}
