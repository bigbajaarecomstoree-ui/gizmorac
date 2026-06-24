"use client";

import * as React from "react";
import { Check, Send, Loader2 } from "lucide-react";
import { subscribeNewsletter } from "@/lib/storefront/actions";

/** Compact newsletter signup for the footer (email + send button). */
export function FooterNewsletter() {
  const [done, setDone] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await subscribeNewsletter(email, "footer");
      if (res.ok) setDone(true);
      else setError(res.error ?? "Something went wrong. Please try again.");
    });
  }

  if (done) {
    return (
      <p className="flex items-center gap-1.5 text-sm font-medium text-success">
        <Check size={15} /> You&apos;re subscribed!
      </p>
    );
  }

  return (
    <div>
      <form
        onSubmit={submit}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-background p-1 focus-within:border-accent"
      >
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          aria-label="Email address"
          className="h-9 min-w-0 flex-1 bg-transparent px-2.5 text-sm placeholder:text-faint focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Subscribe"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </form>
      {error ? (
        <p className="mt-2 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
