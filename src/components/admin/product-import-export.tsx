"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  Download,
  Upload,
  FileSpreadsheet,
  Loader2,
  Check,
  TriangleAlert,
  Store,
} from "lucide-react";
import {
  importProducts,
  importAmazonListings,
  type ImportResult,
} from "@/lib/admin/actions";

const btn =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent cursor-pointer";

function ResultMessage({ state }: { state: ImportResult | undefined }) {
  if (!state) return null;
  const errs = state.errors ?? [];
  if (state.error) {
    return (
      <p
        className="mt-3 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
        role="alert"
      >
        <TriangleAlert size={15} /> {state.error}
      </p>
    );
  }
  const total = (state.created ?? 0) + (state.updated ?? 0);
  return (
    <div className="mt-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm">
      <p className="flex items-center gap-2 font-medium text-success">
        <Check size={15} />
        Imported {state.created ?? 0} new and {state.updated ?? 0} updated
        product{total === 1 ? "" : "s"}
        {state.skipped ? ` (${state.skipped} rows skipped)` : ""}.
      </p>
      {errs.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-danger">
          {errs.map((e, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <TriangleAlert size={12} className="mt-0.5 shrink-0" />
              {e}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ProductImportExport() {
  const [csvState, csvAction, csvPending] = useActionState<
    ImportResult | undefined,
    FormData
  >(importProducts, undefined);
  const [azState, azAction, azPending] = useActionState<
    ImportResult | undefined,
    FormData
  >(importAmazonListings, undefined);

  const csvFormRef = React.useRef<HTMLFormElement>(null);
  const csvFileRef = React.useRef<HTMLInputElement>(null);
  const azFormRef = React.useRef<HTMLFormElement>(null);
  const azFileRef = React.useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <a href="/api/admin/products/sample" download className={btn}>
          <FileSpreadsheet size={15} /> Sample file
        </a>
        <a href="/api/admin/products/export" download className={btn}>
          <Download size={15} /> Export
        </a>

        <form ref={csvFormRef} action={csvAction}>
          <input
            ref={csvFileRef}
            type="file"
            name="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={() => csvFormRef.current?.requestSubmit()}
          />
          <button
            type="button"
            onClick={() => csvFileRef.current?.click()}
            disabled={csvPending}
            className={`${btn} disabled:opacity-60`}
          >
            {csvPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Upload size={15} />
            )}
            {csvPending ? "Importing…" : "Import CSV"}
          </button>
        </form>

        <form ref={azFormRef} action={azAction}>
          <input
            ref={azFileRef}
            type="file"
            name="file"
            accept=".txt,.tsv,.csv,text/plain,text/tab-separated-values"
            className="hidden"
            onChange={() => azFormRef.current?.requestSubmit()}
          />
          <button
            type="button"
            onClick={() => azFileRef.current?.click()}
            disabled={azPending}
            className={`${btn} border-accent/40 text-accent disabled:opacity-60`}
          >
            {azPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Store size={15} />
            )}
            {azPending ? "Importing…" : "Import from Amazon"}
          </button>
        </form>
      </div>

      <p className="mt-2 text-xs text-muted">
        <span className="font-medium text-fg">Import from Amazon:</span> upload the
        tab-separated <span className="font-mono">All Listings Report</span> from
        Seller Central (Reports → Inventory). Creates products from your live
        listings — then add images &amp; videos here.
      </p>

      <ResultMessage state={csvState} />
      <ResultMessage state={azState} />
    </div>
  );
}
