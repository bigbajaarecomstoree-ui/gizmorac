import Link from "next/link";
import { Download, FileSpreadsheet } from "lucide-react";
import { DATE_RANGES, type DateRange } from "@/lib/data/orders";
import { INDIA_STATES } from "@/lib/india-states";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ range?: string; from?: string; to?: string }>;

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function fmtYMD(ymd?: string): string {
  if (!ymd || !YMD.test(ymd)) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// GST filing export, extracted from the Sales report page into its own menu
// destination. Same date-range idiom as /admin/reports; defaults to "This
// month" because GSTR-1 is filed monthly.
export default async function GstReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const custom = Boolean(sp.from && sp.to && YMD.test(sp.from) && YMD.test(sp.to));
  const range: DateRange = DATE_RANGES.some((r) => r.value === sp.range)
    ? (sp.range as DateRange)
    : "month";

  const rangeLabel = custom
    ? `${fmtYMD(sp.from)} – ${fmtYMD(sp.to)}`
    : (DATE_RANGES.find((r) => r.value === range)?.label ?? "");

  // IST "today" so the date pickers can't pick a future day.
  const todayYMD = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-2">
        <FileSpreadsheet size={22} className="text-accent" />
        <h1 className="text-2xl font-bold tracking-tight">GST filing export</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Line-item sales with HSN, taxable value &amp; CGST/SGST/IGST · {rangeLabel}
      </p>

      {/* Date controls: presets + custom range, same bar as the Sales report */}
      <div className="mt-5 rounded-xl border border-border bg-surface p-3">
        <div className="flex flex-wrap items-center gap-2">
          {DATE_RANGES.map((r) => (
            <Link
              key={r.value}
              href={`/admin/reports/gst?range=${r.value}`}
              className={
                !custom && r.value === range
                  ? "rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent"
                  : "rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
              }
            >
              {r.label}
            </Link>
          ))}
        </div>

        <form
          method="get"
          action="/admin/reports/gst"
          className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3"
        >
          <label className="flex flex-col gap-1">
            <span className="tech-label">From</span>
            <input
              type="date"
              name="from"
              defaultValue={custom ? sp.from : ""}
              max={todayYMD}
              required
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm focus:border-accent focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="tech-label">To</span>
            <input
              type="date"
              name="to"
              defaultValue={custom ? sp.to : ""}
              max={todayYMD}
              required
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm focus:border-accent focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="h-9 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          >
            Apply
          </button>
          {custom ? (
            <Link
              href="/admin/reports/gst?range=month"
              className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-muted transition-colors hover:text-foreground"
            >
              Reset
            </Link>
          ) : null}
        </form>
      </div>

      {/* Export form — posts the chosen window + seller state to the CSV API */}
      <form
        method="get"
        action="/api/admin/reports/gst"
        className="mt-3 rounded-xl border border-border bg-surface p-5"
      >
        <div className="flex items-center gap-2">
          <Download size={18} className="text-accent" />
          <h2 className="font-semibold">Download for GSTR-1</h2>
        </div>
        <p className="mt-1 text-sm text-muted">
          Uses each product&apos;s own GST rate for the selected date range —
          ready to hand to your accountant.
        </p>

        {custom ? (
          <>
            <input type="hidden" name="from" value={sp.from} />
            <input type="hidden" name="to" value={sp.to} />
          </>
        ) : (
          <input type="hidden" name="range" value={range} />
        )}

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="tech-label">Your registered state</span>
            <select
              name="sellerState"
              required
              defaultValue=""
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm focus:border-accent focus:outline-none"
            >
              <option value="" disabled>
                Select state…
              </option>
              {INDIA_STATES.map((s) => (
                <option key={s.code} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          >
            <Download size={16} /> Download GST CSV
          </button>
        </div>
        <p className="mt-3 text-xs text-faint">
          Prices are GST-inclusive; taxable value is back-calculated using each
          product&apos;s HSN &amp; GST rate (set per product). Intra-state orders
          (same as your state) split into CGST+SGST, others as IGST. Set HSN/rate
          on products for accurate filing.
        </p>
      </form>
    </div>
  );
}
