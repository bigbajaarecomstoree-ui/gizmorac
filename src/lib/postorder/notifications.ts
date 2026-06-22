// Notification worker (spec §12). Drains the notification_logs queue the
// transition engine enqueues, with retry. Email is implemented first via a
// pluggable sender (default: log transport — swap in Resend/SMTP via setEmailSender).
// SMS/WhatsApp/Push stay configurable (flagged off).

import { prisma } from "@/lib/prisma";
import { nextNotificationState } from "./notify-rules";

export interface OutboundNotification {
  channel: string;
  recipient: string;
  subject: string;
  body: string;
  event: string;
}

export type NotificationSender = (n: OutboundNotification) => Promise<{ ok: boolean; error?: string }>;

const MAX_RETRIES = 3;

const SUBJECTS: Record<string, string> = {
  return_requested: "We've received your return request",
  pickup_scheduled: "Your return pickup is scheduled",
  pickup_completed: "Your return has been picked up",
  qc_completed: "Update on your returned item",
  refund_initiated: "Your refund is on its way",
  refund_completed: "Your refund is complete",
  replacement_shipped: "Your replacement has shipped",
  appeal_decision: "An update on your dispute",
  refund_manual_review: "[Admin] A refund needs manual review",
};

function subjectFor(event: string): string {
  return SUBJECTS[event] ?? "Update on your order";
}

// Default transport: record to EventLog so nothing is silently dropped before a
// real provider is configured. Always reports success.
const logSender: NotificationSender = async (n) => {
  await prisma.eventLog
    .create({
      data: {
        level: "info",
        actor: "system",
        action: "notify.email",
        message: `[email → ${n.recipient}] ${n.subject}`,
        meta: JSON.stringify({ event: n.event, recipient: n.recipient }),
      },
    })
    .catch(() => {});
  return { ok: true };
};

let emailSender: NotificationSender = logSender;

/** Swap the email transport (e.g. Resend/SMTP) at app boot. */
export function setEmailSender(sender: NotificationSender): void {
  emailSender = sender;
}

/** Send pending/retrying EMAIL notifications. Safe to run on an interval/cron. */
export async function processPendingNotifications(limit = 50): Promise<{ processed: number; sent: number; failed: number }> {
  const settings = await prisma.storeSetting.findFirst({ select: { ffNotifEmail: true } });
  if (!settings?.ffNotifEmail) return { processed: 0, sent: 0, failed: 0 };

  const pending = await prisma.notificationLog.findMany({
    where: { channel: "EMAIL", state: { in: ["PENDING", "RETRYING"] } },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  let sent = 0;
  let failed = 0;
  for (const n of pending) {
    const res = await emailSender({
      channel: n.channel,
      recipient: n.recipient,
      subject: n.subject || subjectFor(n.event),
      body: n.body,
      event: n.event,
    }).catch((e) => ({ ok: false, error: e instanceof Error ? e.message : String(e) }));

    const ns = nextNotificationState({ sendOk: res.ok, retryCount: n.retryCount, maxRetries: MAX_RETRIES });
    await prisma.notificationLog.update({
      where: { id: n.id },
      data: {
        state: ns.state as never,
        retryCount: ns.willRetry ? n.retryCount + 1 : n.retryCount,
        error: res.ok ? "" : res.error ?? "send failed",
        sentAt: res.ok ? new Date() : null,
      },
    });
    if (res.ok) sent++;
    else if (ns.state === "FAILED") failed++;
  }
  return { processed: pending.length, sent, failed };
}
