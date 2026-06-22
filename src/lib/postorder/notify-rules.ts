// Notification retry decision (spec §12 — notifications with retry). Pure.

export type NotifState = "PENDING" | "SENT" | "FAILED" | "RETRYING";

export interface NextStateInput {
  sendOk: boolean;
  retryCount: number;
  maxRetries: number;
}

/**
 * After a send attempt: success → SENT; failure with budget left → RETRYING;
 * failure with budget exhausted → FAILED.
 */
export function nextNotificationState(i: NextStateInput): { state: NotifState; willRetry: boolean } {
  if (i.sendOk) return { state: "SENT", willRetry: false };
  if (i.retryCount + 1 < i.maxRetries) return { state: "RETRYING", willRetry: true };
  return { state: "FAILED", willRetry: false };
}
