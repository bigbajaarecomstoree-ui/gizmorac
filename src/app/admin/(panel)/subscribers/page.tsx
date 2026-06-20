import { Download, Mail, Inbox } from "lucide-react";
import { getSubscribers } from "@/lib/data/subscribers";
import { SubscriberActions } from "@/components/admin/subscriber-actions";

export const dynamic = "force-dynamic";

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminSubscribersPage() {
  const subscribers = await getSubscribers();
  const emails = subscribers.map((s) => s.email);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Mail size={22} className="text-accent" />
            <h1 className="text-2xl font-bold tracking-tight">Newsletter subscribers</h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            {subscribers.length} subscriber{subscribers.length === 1 ? "" : "s"} from the
            footer signup.
          </p>
        </div>
        <a
          href="/api/admin/subscribers/export"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          download
        >
          <Download size={16} />
          Export to Excel
        </a>
      </div>

      {subscribers.length > 0 ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">
            Send a campaign from your own email — copy the list into the BCC field,
            or open your mail app with everyone added.
          </p>
          <SubscriberActions emails={emails} />
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-surface">
        {subscribers.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <Inbox size={28} className="text-faint" />
            <p className="mt-3 text-sm font-medium text-muted">No subscribers yet</p>
            <p className="mt-1 text-xs text-faint">
              Emails from the footer &ldquo;Newsletter&rdquo; signup will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[2rem_1fr_12rem] gap-4 border-b border-border px-4 py-3 text-xs uppercase tracking-wider text-faint sm:grid">
              <span>#</span>
              <span>Email</span>
              <span>Subscribed</span>
            </div>
            <div className="divide-y divide-border">
              {subscribers.map((s, i) => (
                <div
                  key={s.id}
                  className="grid grid-cols-1 gap-1 px-4 py-3 text-sm sm:grid-cols-[2rem_1fr_12rem] sm:items-center sm:gap-4"
                >
                  <span className="hidden text-faint sm:block">{i + 1}</span>
                  <a
                    href={`mailto:${s.email}`}
                    className="truncate font-medium text-accent-bright hover:text-accent"
                  >
                    {s.email}
                  </a>
                  <span className="text-xs text-muted">{fmtDateTime(s.createdAt)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
