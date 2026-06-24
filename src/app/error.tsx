"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/**
 * Route-level error boundary — catches render/data errors anywhere below the
 * root layout (storefront + admin) and offers recovery instead of a blank crash.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the browser console; server errors are already logged by Next.
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle size={22} />
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">
          A temporary error stopped this page from loading. Please try again — if it keeps
          happening, contact support and quote the reference below.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-faint">Ref: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          >
            <RefreshCw size={15} /> Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <Home size={15} /> Go home
          </a>
        </div>
      </div>
    </div>
  );
}
