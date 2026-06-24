/** Route-transition fallback shown while a segment streams its data. */
export default function Loading() {
  return (
    <div className="grid min-h-[50vh] place-items-center px-4" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-muted">
        <span className="size-8 animate-spin rounded-full border-2 border-border border-t-accent" />
        <p className="text-sm">Loading…</p>
      </div>
    </div>
  );
}
