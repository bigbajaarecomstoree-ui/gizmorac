import Link from "next/link";
import { DATE_RANGES, type DateRange } from "@/lib/data/orders";

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

/** Validate the shared ?range / ?from / ?to search params for a report page. */
export function parseDateRange(
  sp: { range?: string; from?: string; to?: string },
  fallback: DateRange = "30d",
) {
  const custom = Boolean(sp.from && sp.to && YMD.test(sp.from) && YMD.test(sp.to));
  const range: DateRange = DATE_RANGES.some((r) => r.value === sp.range)
    ? (sp.range as DateRange)
    : fallback;
  const rangeLabel = custom
    ? `${fmtYMD(sp.from)} – ${fmtYMD(sp.to)}`
    : (DATE_RANGES.find((r) => r.value === range)?.label ?? "");
  return { custom, range, rangeLabel };
}

/** Date controls shared by the report pages: preset chips + custom From/To form. */
export function DateRangeBar({
  basePath,
  defaultRange,
  range,
  custom,
  from,
  to,
  split,
  children,
}: {
  basePath: string;
  defaultRange: DateRange;
  range: DateRange;
  custom: boolean;
  from?: string;
  to?: string;
  /** Finance layout: chips outside the card, accent border + "Apply range" when custom. */
  split?: boolean;
  children?: React.ReactNode;
}) {
  // IST "today" so the date pickers can't pick a future day.
  const todayYMD = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  const chips = DATE_RANGES.map((r) => (
    <Link
      key={r.value}
      href={`${basePath}?range=${r.value}`}
      className={
        !custom && r.value === range
          ? "rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent"
          : "rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
      }
    >
      {r.label}
    </Link>
  ));

  const fields = (
    <>
      <label className="flex flex-col gap-1">
        <span className="tech-label">From</span>
        <input
          type="date"
          name="from"
          defaultValue={custom ? from : ""}
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
          defaultValue={custom ? to : ""}
          max={todayYMD}
          required
          className="h-9 rounded-lg border border-border bg-background px-2 text-sm focus:border-accent focus:outline-none"
        />
      </label>
      <button
        type="submit"
        className="h-9 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
      >
        {split ? "Apply range" : "Apply"}
      </button>
      {custom ? (
        <Link
          href={`${basePath}?range=${defaultRange}`}
          className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-muted transition-colors hover:text-foreground"
        >
          Reset
        </Link>
      ) : null}
    </>
  );

  if (split) {
    return (
      <>
        <div className="mt-5 flex flex-wrap gap-2">{chips}</div>
        <form
          method="get"
          action={basePath}
          className={`mt-3 flex flex-wrap items-end gap-3 rounded-xl border bg-surface p-3 ${
            custom ? "border-accent" : "border-border"
          }`}
        >
          {fields}
        </form>
      </>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        {chips}
        {children}
      </div>
      <form
        method="get"
        action={basePath}
        className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3"
      >
        {fields}
      </form>
    </div>
  );
}
