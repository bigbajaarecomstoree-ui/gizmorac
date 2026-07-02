"use client";

import * as React from "react";
import { Gift, X, Copy, Check } from "lucide-react";

const SEEN_KEY = "gizmorac.popup.landing";

/**
 * Admin-controlled welcome offer popup, shown once per browser session on the
 * home page. Displays a promo code with a one-tap copy button.
 */
export function LandingPopup({
  title,
  message,
  code,
}: {
  title: string;
  message: string;
  code: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    if (seen) return;
    const t = setTimeout(() => {
      setOpen(true);
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {}
    }, 900);
    return () => clearTimeout(t);
  }, []);

  // Close on Escape.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Dialog focus management: move focus in on open, trap Tab inside the
  // panel, and restore focus to the previously-focused element on close.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const trapTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapTab);
    return () => {
      document.removeEventListener("keydown", trapTab);
      prev?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  function copy() {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Special offer"}
      onClick={() => setOpen(false)}
    >
      <div
        ref={panelRef}
        className="animate-rise relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/80 text-muted transition-colors hover:text-foreground cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* accent header */}
        <div className="bg-accent px-6 py-7 text-center text-on-accent">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-on-accent/15">
            <Gift size={24} />
          </span>
          <h2 className="mt-3 text-xl font-bold tracking-tight">
            {title || "A little something for you"}
          </h2>
        </div>

        <div className="px-6 py-6 text-center">
          {message ? (
            <p className="text-sm leading-relaxed text-muted">{message}</p>
          ) : null}

          {code ? (
            <div className="mt-5">
              <p className="tech-label mb-2">Use code at checkout</p>
              <div className="flex items-center justify-center gap-2">
                <code className="rounded-lg border border-dashed border-accent/60 bg-accent-soft/50 px-4 py-2 font-mono text-lg font-bold tracking-widest text-accent-bright">
                  {code}
                </code>
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover cursor-pointer"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-6 text-sm font-medium text-muted underline-offset-2 hover:text-foreground hover:underline cursor-pointer"
          >
            Continue shopping
          </button>
        </div>
      </div>
    </div>
  );
}
