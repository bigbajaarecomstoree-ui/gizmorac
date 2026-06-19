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
} from "lucide-react";
import { importProducts, type ImportResult } from "@/lib/admin/actions";

const btn =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent cursor-pointer";

export function ProductImportExport() {
  const [state, action, pending] = useActionState<
    ImportResult | undefined,
    FormData
  >(importProducts, undefined);
  const formRef = React.useRef<HTMLFormElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const ok = state && !state.error;
  const errs = state?.errors ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <a href="/api/admin/products/sample" download className={btn}>
          <FileSpreadsheet size={15} /> Sample file
        </a>
        <a href="/api/admin/products/export" download className={btn}>
          <Download size={15} /> Export
        </a>
        <form ref={formRef} action={action}>
          <input
            ref={fileRef}
            type="file"
            name="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={() => formRef.current?.requestSubmit()}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={pending}
            className={`${btn} disabled:opacity-60`}
          >
            {pending ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {pending ? "Importing…" : "Import"}
          </button>
        </form>
      </div>

      {state?.error ? (
        <p className="mt-3 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
          <TriangleAlert size={15} /> {state.error}
        </p>
      ) : null}

      {ok ? (
        <div className="mt-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm">
          <p className="flex items-center gap-2 font-medium text-success">
            <Check size={15} />
            Imported {state.created ?? 0} new and {state.updated ?? 0} updated
            product{(state.created ?? 0) + (state.updated ?? 0) === 1 ? "" : "s"}.
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
      ) : null}
    </div>
  );
}
