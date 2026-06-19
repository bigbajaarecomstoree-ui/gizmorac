"use client";

import * as React from "react";
import { Check, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeNewsletter } from "@/lib/storefront/actions";

export function Newsletter() {
  const [done, setDone] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await subscribeNewsletter(email);
      if (res.ok) setDone(true);
      else setError(res.error ?? "Something went wrong. Please try again.");
    });
  }

  return (
    <section className="shell pb-8 sm:pb-12">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface px-6 py-12 sm:px-12">
        <div className="glow-amber absolute -left-20 -top-24 h-80 w-80 opacity-40" />
        <div className="relative mx-auto max-w-2xl text-center">
          <span className="grid h-12 w-12 mx-auto place-items-center rounded-xl border border-border bg-surface-2 text-accent">
            <Mail size={22} />
          </span>
          <h2 className="mt-5 text-2xl font-bold sm:text-3xl">
            Get early access to drops &amp; deals
          </h2>
          <p className="mt-3 text-sm text-muted sm:text-base">
            Join 10,000+ subscribers. New gadgets, restocks and member-only
            discounts — no spam, ever.
          </p>

          {done ? (
            <div className="mt-8 inline-flex items-center gap-2.5 rounded-lg border border-success/40 bg-success/15 px-5 py-3 text-sm font-medium text-success">
              <Check size={18} />
              You&apos;re in! Check your inbox to confirm.
            </div>
          ) : (
            <>
              <form
                onSubmit={submit}
                className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
              >
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  aria-label="Email address"
                  className="h-12 flex-1 rounded-lg border border-border bg-background px-4 text-sm placeholder:text-faint focus:border-accent focus:outline-none"
                />
                <Button type="submit" size="lg" className="sm:w-auto" disabled={pending}>
                  {pending ? "Subscribing…" : "Subscribe"}
                  <Send size={16} />
                </Button>
              </form>
              {error ? (
                <p className="mt-3 text-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
