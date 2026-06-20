import Image from "next/image";
import { cn } from "@/lib/utils";
import type { TicketMessage } from "@/lib/types";

function isVideo(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Presentational chat thread for a support ticket (used by buyer + admin). */
export function TicketThread({ messages }: { messages: TicketMessage[] }) {
  return (
    <div className="space-y-3">
      {messages.map((m) => {
        const admin = m.author === "admin";
        return (
          <div key={m.id} className={cn("flex", admin ? "justify-start" : "justify-end")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                admin ? "bg-surface-2 text-foreground" : "bg-accent-soft text-foreground",
              )}
            >
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-medium">
                <span className={admin ? "text-accent-bright" : "text-muted"}>
                  {admin ? "GIZMORAC Support" : "You"}
                </span>
                {m.proofRequest ? (
                  <span className="rounded bg-accent px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-on-accent">
                    Proof request
                  </span>
                ) : null}
                <span className="text-faint">· {fmt(m.createdAt)}</span>
              </div>
              {m.body ? (
                <p className="whitespace-pre-line leading-relaxed">{m.body}</p>
              ) : null}
              {m.attachments.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.attachments.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block h-20 w-20 overflow-hidden rounded-lg border border-border bg-background"
                    >
                      {isVideo(url) ? (
                        <video src={url} className="h-full w-full object-cover" muted />
                      ) : (
                        <Image src={url} alt="proof" fill sizes="80px" className="object-cover" />
                      )}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
