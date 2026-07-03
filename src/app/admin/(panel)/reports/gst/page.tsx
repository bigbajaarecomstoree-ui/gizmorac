import { Download, FileSpreadsheet } from "lucide-react";
import { INDIA_STATES } from "@/lib/india-states";
import { DateRangeBar, parseDateRange } from "@/components/admin/date-range-bar";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ range?: string; from?: string; to?: string }>;

// GST filing export, extracted from the Sales report page into its own menu
// destination. Same date-range idiom as /admin/reports; defaults to "This
// month" because GSTR-1 is filed monthly.
export default async function GstReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const { custom, range, rangeLabel } = parseDateRange(sp, "month");

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
      <DateRangeBar
        basePath="/admin/reports/gst"
        defaultRange="month"
        range={range}
        custom={custom}
        from={sp.from}
        to={sp.to}
      />

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
