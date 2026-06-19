import { Wallet, Plus, Trash2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { getFinanceEntries, getBalanceAsOf } from "@/lib/data/finance";
import { addFinanceEntry, deleteFinanceEntry } from "@/lib/admin/actions";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

const inputCls =
  "h-9 rounded-lg border border-border bg-background px-2 text-sm focus:border-accent focus:outline-none";

export default async function FinancePage() {
  const [balance, entries] = await Promise.all([
    getBalanceAsOf(),
    getFinanceEntries(200),
  ]);
  const todayYMD = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-2">
        <Wallet size={22} className="text-accent" />
        <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Track cash in and out so Reports can show your true bank balance on any
        date. Start by adding your current bank balance as an{" "}
        <span className="font-medium text-foreground">“Opening balance”</span>{" "}
        entry (Money in).
      </p>

      {/* current balance */}
      <div className="mt-5 rounded-xl border border-border-bright bg-surface p-5">
        <div className="tech-label">Current cash / bank balance</div>
        <div
          className={`mt-1 text-3xl font-bold tracking-tight ${
            balance < 0 ? "text-danger" : "text-foreground"
          }`}
        >
          {formatINR(balance)}
        </div>
        <p className="mt-1 text-xs text-faint">
          Opening balance + all money in − all money out, to date.
        </p>
      </div>

      {/* add entry */}
      <form
        action={addFinanceEntry}
        className="mt-6 rounded-xl border border-border bg-surface p-5"
      >
        <div className="flex items-center gap-2">
          <Plus size={18} className="text-accent" />
          <h2 className="font-semibold">Add entry</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="flex flex-col gap-1 lg:col-span-1">
            <span className="tech-label">Date</span>
            <input type="date" name="date" defaultValue={todayYMD} max={todayYMD} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 lg:col-span-1">
            <span className="tech-label">Type</span>
            <select name="direction" defaultValue="in" className={inputCls}>
              <option value="in">Money in</option>
              <option value="out">Money out</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 lg:col-span-1">
            <span className="tech-label">Amount (₹)</span>
            <input type="number" name="amount" min={0} step={1} required placeholder="0" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 lg:col-span-1">
            <span className="tech-label">Category</span>
            <input type="text" name="category" placeholder="e.g. COD deposit" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2">
            <span className="tech-label">Note</span>
            <input type="text" name="note" placeholder="Optional" className={inputCls} />
          </label>
        </div>
        <button
          type="submit"
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
        >
          <Plus size={16} /> Add entry
        </button>
      </form>

      {/* entries */}
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
        <h2 className="border-b border-border px-5 py-4 font-semibold">
          Ledger ({entries.length})
        </h2>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-12 text-center">
            <Wallet size={28} className="text-faint" />
            <p className="mt-3 text-sm font-medium text-muted">No entries yet</p>
            <p className="mt-1 text-xs text-faint">
              Add your opening bank balance above to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entries.map((e) => {
              const isIn = e.direction === "in";
              return (
                <div key={e.id} className="flex items-center gap-4 px-5 py-3">
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                      isIn
                        ? "bg-success/10 text-success"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    {isIn ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {e.category || (isIn ? "Money in" : "Money out")}
                    </div>
                    <div className="text-xs text-faint">
                      {new Date(e.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {e.note ? ` · ${e.note}` : ""}
                    </div>
                  </div>
                  <div
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      isIn ? "text-success" : "text-danger"
                    }`}
                  >
                    {isIn ? "+" : "−"}
                    {formatINR(e.amount)}
                  </div>
                  <form action={deleteFinanceEntry}>
                    <input type="hidden" name="id" value={e.id} />
                    <button
                      type="submit"
                      aria-label="Delete entry"
                      className="shrink-0 text-faint transition-colors hover:text-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
