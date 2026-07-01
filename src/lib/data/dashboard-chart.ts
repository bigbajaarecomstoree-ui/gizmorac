import { prisma } from "@/lib/prisma";
import { NON_REVENUE } from "./revenue";

// Sales chart for the admin dashboard. One server query builds every
// (metric × range) series up-front so the client can toggle instantly.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const YEAR = 365 * DAY;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export type ChartMetric = "revenue" | "orders";
export type ChartRange = "7d" | "30d" | "week" | "month" | "12m" | "ytd";

export const CHART_METRICS: { value: ChartMetric; label: string }[] = [
  { value: "revenue", label: "Revenue" },
  { value: "orders", label: "Orders" },
];

export const CHART_RANGES: { value: ChartRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "12m", label: "Last 12 months" },
  { value: "ytd", label: "Year to date" },
];

export interface ChartBucket {
  label: string;
  value: number;
  /** Bucket that contains "now" (today / current month) — rendered muted. */
  partial: boolean;
  /** Bucket entirely in the future (this week/month) — no bar drawn. */
  future: boolean;
}

export interface ChartSeries {
  buckets: ChartBucket[];
  total: number;
  /** Immediately-preceding equal-length window (for the % delta). */
  prevTotal: number;
  /** Same window one year earlier; null when there's no prior-year data. */
  yoyTotal: number | null;
  granularity: "day" | "month";
}

export type DashboardChart = {
  ranges: Record<ChartRange, Record<ChartMetric, ChartSeries>>;
  generatedAt: string;
};

interface Datum {
  t: number;
  total: number;
  counted: boolean; // revenue-eligible (not cancelled/returned/refunded)
}

// --- IST calendar helpers (UTC instants of IST midnights) ---
function istParts(ms: number) {
  const d = new Date(ms + IST_OFFSET_MS);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth(),
    d: d.getUTCDate(),
    wd: d.getUTCDay(),
  };
}
const dayStart = (y: number, m: number, d: number) =>
  Date.UTC(y, m, d) - IST_OFFSET_MS;
const monthStart = (y: number, m: number) => Date.UTC(y, m, 1) - IST_OFFSET_MS;
const daysInMonth = (y: number, m: number) =>
  new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

function sumWindow(
  data: Datum[],
  start: number,
  end: number,
  metric: ChartMetric,
): number {
  let s = 0;
  for (const o of data) {
    if (o.t >= start && o.t < end) {
      s += metric === "revenue" ? (o.counted ? o.total : 0) : 1;
    }
  }
  return s;
}

function dailyBuckets(
  data: Datum[],
  metric: ChartMetric,
  firstDay: { y: number; m: number; d: number },
  count: number,
  markFuture: boolean,
): ChartBucket[] {
  const today = istParts(Date.now());
  const todayStart = dayStart(today.y, today.m, today.d);
  const out: ChartBucket[] = [];
  for (let i = 0; i < count; i++) {
    const ds = dayStart(firstDay.y, firstDay.m, firstDay.d + i);
    const p = istParts(ds);
    const future = markFuture && ds > todayStart;
    const partial = ds === todayStart;
    out.push({
      label: `${MONTHS[p.m]} ${p.d}`,
      value: future ? 0 : sumWindow(data, ds, ds + DAY, metric),
      partial,
      future,
    });
  }
  return out;
}

function monthlyBuckets(
  data: Datum[],
  metric: ChartMetric,
  first: { y: number; m: number },
  count: number,
): ChartBucket[] {
  const today = istParts(Date.now());
  const curMonth = monthStart(today.y, today.m);
  const out: ChartBucket[] = [];
  for (let i = 0; i < count; i++) {
    const y = first.y + Math.floor((first.m + i) / 12);
    const m = (((first.m + i) % 12) + 12) % 12;
    const ms = monthStart(y, m);
    const me = monthStart(m === 11 ? y + 1 : y, (m + 1) % 12);
    const future = ms > curMonth;
    out.push({
      label: m === 0 ? `${MONTHS[m]} '${String(y).slice(2)}` : MONTHS[m],
      value: future ? 0 : sumWindow(data, ms, me, metric),
      partial: ms === curMonth,
      future,
    });
  }
  return out;
}

function buildSeries(
  data: Datum[],
  metric: ChartMetric,
  range: ChartRange,
): ChartSeries {
  const t = istParts(Date.now());
  const todayEnd = dayStart(t.y, t.m, t.d) + DAY;

  let buckets: ChartBucket[];
  let start: number;
  let granularity: "day" | "month" = "day";

  switch (range) {
    case "7d":
      start = dayStart(t.y, t.m, t.d - 6);
      buckets = dailyBuckets(data, metric, { y: t.y, m: t.m, d: t.d - 6 }, 7, false);
      break;
    case "30d":
      start = dayStart(t.y, t.m, t.d - 29);
      buckets = dailyBuckets(data, metric, { y: t.y, m: t.m, d: t.d - 29 }, 30, false);
      break;
    case "week": {
      const fromMon = (t.wd + 6) % 7; // days since Monday
      start = dayStart(t.y, t.m, t.d - fromMon);
      buckets = dailyBuckets(data, metric, { y: t.y, m: t.m, d: t.d - fromMon }, 7, true);
      break;
    }
    case "month":
      start = monthStart(t.y, t.m);
      buckets = dailyBuckets(data, metric, { y: t.y, m: t.m, d: 1 }, daysInMonth(t.y, t.m), true);
      break;
    case "12m": {
      let sy = t.y;
      let sm = t.m - 11;
      while (sm < 0) {
        sm += 12;
        sy -= 1;
      }
      start = monthStart(sy, sm);
      buckets = monthlyBuckets(data, metric, { y: sy, m: sm }, 12);
      granularity = "month";
      break;
    }
    case "ytd":
    default:
      start = monthStart(t.y, 0);
      buckets = monthlyBuckets(data, metric, { y: t.y, m: 0 }, t.m + 1);
      granularity = "month";
      break;
  }

  const end = todayEnd;
  const len = end - start;
  const total = sumWindow(data, start, end, metric);
  const prevTotal = sumWindow(data, start - len, start, metric);
  const yoyRaw = sumWindow(data, start - YEAR, end - YEAR, metric);

  return {
    buckets,
    total,
    prevTotal,
    yoyTotal: yoyRaw > 0 ? yoyRaw : null,
    granularity,
  };
}

export async function getDashboardChart(): Promise<DashboardChart> {
  // 26 months covers the widest range (last 12 months) plus its full prior-year
  // window (YoY reaches back ~23 months) with a clean margin so the earliest YoY
  // bucket is never truncated.
  const since = new Date(Date.now() - 26 * 31 * DAY);
  const rows = await prisma.order.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, total: true, status: true },
  });
  const data: Datum[] = rows.map((r) => ({
    t: r.createdAt.getTime(),
    total: r.total,
    counted: !NON_REVENUE.includes(r.status),
  }));

  const ranges = {} as DashboardChart["ranges"];
  for (const { value: range } of CHART_RANGES) {
    ranges[range] = {
      revenue: buildSeries(data, "revenue", range),
      orders: buildSeries(data, "orders", range),
    };
  }

  const generatedAt = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  return { ranges, generatedAt };
}
