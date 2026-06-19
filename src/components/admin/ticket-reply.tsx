"use client";

import * as React from "react";
import { Send, Camera } from "lucide-react";
import { adminReplyTicket } from "@/lib/admin/actions";
import { ProofUploader } from "@/components/account/proof-uploader";

export function AdminTicketReply({ ticketId }: { ticketId: string }) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [attachments, setAttachments] = React.useState<string[]>([]);

  return (
    <form
      ref={formRef}
      action={adminReplyTicket}
      // Reset after the FormData has been collected for the action.
      onSubmit={() => {
        setTimeout(() => {
          formRef.current?.reset();
          setAttachments([]);
        }, 50);
      }}
      className="rounded-xl border border-border bg-surface p-4"
    >
      <input type="hidden" name="ticketId" value={ticketId} />
      <textarea
        name="body"
        rows={3}
        maxLength={4000}
        placeholder="Reply to the customer…"
        className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="mt-2">
        <ProofUploader
          endpoint="/api/admin/upload"
          value={attachments}
          onChange={setAttachments}
          name="attachments"
        />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          name="proofRequest"
          className="h-4 w-4 rounded border-border accent-[var(--accent)]"
        />
        <Camera size={15} className="text-accent" />
        Ask the customer for photo/video proof
      </label>
      <button
        type="submit"
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover cursor-pointer"
      >
        <Send size={15} /> Send
      </button>
    </form>
  );
}
