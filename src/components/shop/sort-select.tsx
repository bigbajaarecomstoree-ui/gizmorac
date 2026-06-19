"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
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
    <Select
      options={OPTIONS}
      value={value}
      onChange={(sort) =>
        router.push(buildShopUrl(params, { sort, page: undefined }), {
          scroll: false,
        })
      }
      ariaLabel="Sort products"
      align="end"
    />
  );
}
