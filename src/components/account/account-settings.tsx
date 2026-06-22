"use client";

import * as React from "react";
import { Mail, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { setMarketingOptIn, deleteMyAccount } from "@/lib/customer/actions";

/**
 * Account self-service controls promised in the privacy policy: unsubscribe
 * from marketing emails, and delete (soft-deactivate) the account.
 */
export function AccountSettings({ marketingOptIn }: { marketingOptIn: boolean }) {
  const [optIn, setOptIn] = React.useState(marketingOptIn);
  const [savingPref, startPref] = React.useTransition();
  const [confirming, setConfirming] = React.useState(false);
  const [deleting, startDelete] = React.useTransition();

  function toggle() {
    const next = !optIn;
    setOptIn(next); // optimistic
    startPref(async () => {
      const res = await setMarketingOptIn(next);
      if (!res.ok) setOptIn(!next);
    });
  }

  function remove() {
    startDelete(async () => {
      await deleteMyAccount(); // redirects on success
    });
  }

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold">Email preferences</h2>
        <p className="mt-1 text-sm text-muted">Choose what lands in your inbox.</p>
        <div className="mt-4 rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Mail size={18} className="mt-0.5 text-accent" />
              <div>
                <p className="text-sm font-medium">Marketing emails</p>
                <p className="text-xs text-muted">
                  Offers, new arrivals and deals. Order updates are always sent.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={optIn}
              aria-label="Marketing emails"
              onClick={toggle}
              disabled={savingPref}
              className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors disabled:opacity-60 ${
                optIn ? "bg-accent" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                  optIn ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted">
            {optIn
              ? "You're subscribed to marketing emails."
              : "You're unsubscribed — you won't receive marketing emails."}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-danger">Delete account</h2>
        <p className="mt-1 text-sm text-muted">
          Your account is deactivated and you&apos;re signed out. Your order history is kept, and
          you can restore your account anytime by contacting us.
        </p>
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-5">
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-danger px-3.5 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
            >
              <Trash2 size={15} /> Delete my account
            </button>
          ) : (
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-danger">
                <AlertTriangle size={15} /> Are you sure you want to delete your account?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={remove}
                  disabled={deleting}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-danger px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
                >
                  {deleting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Trash2 size={15} />
                  )}
                  Yes, delete my account
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                  className="cursor-pointer rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
                >
                  Keep my account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
