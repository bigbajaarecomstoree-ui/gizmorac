"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { updateOrderStatus } from "@/lib/admin/actions";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

/**
 * Order status updater with explicit feedback: a spinner while saving and a
 * "Status updated" confirmation afterwards (the plain form gave no signal that
 * the save went through).
 */
export function OrderStatusForm({
  orderId,
  status: initial,
  statuses,
}: {
  orderId: string;
  status: string;
  statuses: readonly string[];
}) {
  const [status, setStatus] = React.useState(initial);
  const [savedStatus, setSavedStatus] = React.useState(initial);
  const [pending, start] = React.useTransition();
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Clear the confirmation after a few seconds.
  React.useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(t);
  }, [saved]);

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", orderId);
        fd.set("status", status);
        await updateOrderStatus(fd);
        setSavedStatus(status);
        setSaved(true);
      } catch {
        setError("Couldn't save the status. Please try again.");
      }
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        <Select
          value={status}
          onChange={setStatus}
          options={statuses.map((s) => ({ value: s, label: s }))}
          className="flex-1"
          triggerClassName="bg-background"
        />
        <Button type="button" size="md" onClick={save} disabled={pending}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : null}
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      {saved ? (
        <p className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-success">
          <Check size={15} /> Status updated to {savedStatus}.
        </p>
      ) : null}
      {error ? (
        <p className="mt-2.5 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
