// Webhook event ledger (spec §11): persist event_id / signature /
// gateway_reference / processed_at and deduplicate on (provider, event_id).

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface RecordWebhookInput {
  provider: string; // "phonepe" | "shiprocket" | ...
  eventId: string;
  signature?: string;
  gatewayReference?: string;
  payload?: string;
}

/**
 * Record a webhook event. Returns `{ duplicate: true }` if this (provider,
 * eventId) was already processed — the caller must then ignore the event.
 * With no eventId we cannot dedup, so it is treated as new.
 */
export async function recordWebhookEvent(input: RecordWebhookInput): Promise<{ duplicate: boolean }> {
  if (!input.eventId) return { duplicate: false };
  // Fast path: already processed (avoids a constraint-violation log on the
  // common duplicate case). The try/catch below still covers the race.
  const seen = await prisma.webhookEvent.findUnique({
    where: { provider_eventId: { provider: input.provider, eventId: input.eventId } },
  });
  if (seen) return { duplicate: true };
  try {
    await prisma.webhookEvent.create({
      data: {
        provider: input.provider,
        eventId: input.eventId,
        signature: input.signature ?? "",
        gatewayReference: input.gatewayReference ?? "",
        payload: input.payload ?? "",
        processedAt: new Date(),
      },
    });
    return { duplicate: false };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { duplicate: true }; // unique (provider, eventId) already seen
    }
    throw e;
  }
}
