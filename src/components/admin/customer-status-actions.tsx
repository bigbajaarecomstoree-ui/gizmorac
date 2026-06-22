"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, UserX } from "lucide-react";
import { restoreCustomer, deactivateCustomer } from "@/lib/admin/actions";

/** Restore / deactivate a customer account from the admin detail page. */
export function CustomerStatusActions({
  id,
  deactivated,
}: {
  id: string;
  deactivated: boolean;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }

  return deactivated ? (
    <button
      type="button"
      onClick={() => run(() => restoreCustomer(id))}
      disabled={pending}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
      Restore account
    </button>
  ) : (
    <button
      type="button"
      onClick={() => run(() => deactivateCustomer(id))}
      disabled={pending}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-danger px-3.5 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : <UserX size={15} />}
      Deactivate account
    </button>
  );
}
