"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Loader2, CheckCircle2, BadgeCheck } from "lucide-react";
import { raiseTicket, replyToTicket } from "@/lib/storefront/actions";
import { TicketThread } from "./ticket-thread";
import { TicketStatusBadge } from "./ticket-status-badge";
import { ProofUploader } from "./proof-uploader";
import type { Ticket } from "@/lib/types";

const CATEGORIES = ["Damaged", "Defective", "Wrong item", "Not working", "Other"];
const UPLOAD = "/api/account/upload";

const RESOLUTION_COPY: Record<string, string> = {
  Refund: "Your refund has been approved.",
  Replacement: "A replacement has been approved.",
  Warranty: "Your warranty claim has been approved.",
};

function NewTicketForm({
  orderNumber,
  allowWarranty = false,
}: {
  orderNumber: string;
  allowWarranty?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [category, setCategory] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [attachments, setAttachments] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) {
      setError("Please select what went wrong.");
      return;
    }
    if (!description.trim()) {
      setError("Please describe the problem.");
      return;
    }
    if (attachments.length === 0) {
      setError("Please add at least one photo or video as proof of the issue.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await raiseTicket({ orderNumber, category, description, attachments });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3.5 py-3 text-left text-sm transition-colors hover:border-danger cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-danger" />
          <span className="font-medium">Received a damaged or defective item?</span>
        </span>
        <span className="text-xs font-medium text-accent-bright transition-colors group-hover:text-danger">
          Report a problem
        </span>
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-background p-4">
      <label className="text-xs font-medium text-muted">
        What went wrong? <span className="text-danger">*</span>
      </label>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        required
        className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      >
        <option value="" disabled>
          Select an issue…
        </option>
        {(allowWarranty ? [...CATEGORIES, "Warranty"] : CATEGORIES).map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <label className="mt-3 block text-xs font-medium text-muted">
        Describe the problem <span className="text-danger">*</span>
      </label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        maxLength={4000}
        placeholder="Tell us what's wrong with your order…"
        className="mt-1.5 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium text-muted">
          Add photos or a video <span className="text-danger">*</span>{" "}
          <span className="font-normal text-faint">(proof of the issue — required)</span>
        </p>
        <ProofUploader endpoint={UPLOAD} value={attachments} onChange={setAttachments} />
      </div>

      {error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : null}
          Submit ticket
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function TicketReply({ ticket }: { ticket: Ticket }) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [attachments, setAttachments] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && attachments.length === 0) {
      setError("Add a message or attach a photo/video.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await replyToTicket({ ticketId: ticket.id, body, attachments });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setBody("");
    setAttachments([]);
    router.refresh();
  }

  const needsProof = ticket.status === "Awaiting proof";

  return (
    <form
      onSubmit={onSubmit}
      className={
        needsProof
          ? "mt-4 rounded-lg border border-accent/40 bg-accent-soft/40 p-4"
          : "mt-4 rounded-lg border border-border bg-background p-4"
      }
    >
      {needsProof ? (
        <p className="mb-2 text-sm font-medium text-accent-bright">
          Action needed — please upload the photo/video proof requested above.
        </p>
      ) : null}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        maxLength={4000}
        placeholder="Add a message…"
        className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="mt-2">
        <ProofUploader endpoint={UPLOAD} value={attachments} onChange={setAttachments} />
      </div>
      {error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : null}
        {needsProof ? "Send proof" : "Send reply"}
      </button>
    </form>
  );
}

export function TicketPanel({
  orderNumber,
  ticket,
  allowWarranty = false,
}: {
  orderNumber: string;
  ticket: Ticket | null;
  allowWarranty?: boolean;
}) {
  if (!ticket) {
    return <NewTicketForm orderNumber={orderNumber} allowWarranty={allowWarranty} />;
  }

  const closed = ticket.status === "Resolved" || ticket.status === "Rejected";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">{ticket.ticketNumber}</span>
          <TicketStatusBadge status={ticket.status} />
        </div>
        <span className="text-xs text-muted">Issue: {ticket.category}</span>
      </div>

      {ticket.status === "Resolved" && ticket.resolution ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3.5 py-2.5 text-sm font-medium text-success">
          <BadgeCheck size={16} />
          {RESOLUTION_COPY[ticket.resolution] ?? "Your claim has been approved."}
        </div>
      ) : null}
      {ticket.status === "Rejected" ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm font-medium text-danger">
          <CheckCircle2 size={16} />
          This claim was closed. See the note below.
        </div>
      ) : null}

      <div className="mt-4">
        <TicketThread messages={ticket.messages} />
      </div>

      {closed ? (
        <p className="mt-4 rounded-lg border border-border bg-background px-3.5 py-3 text-xs text-muted">
          This ticket is closed. Need more help? Reach us at care@gizmorac.com.
        </p>
      ) : (
        <TicketReply ticket={ticket} />
      )}
    </div>
  );
}
