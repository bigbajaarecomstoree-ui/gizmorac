-- PhonePe webhook Authorization secret (additive; admin-managed, env fallback).
-- Stores the SHA256(username:password) value PhonePe sends in the webhook
-- Authorization header. Defaulted empty so existing rows need no backfill.

-- AlterTable
ALTER TABLE "StoreSetting" ADD COLUMN "phonepeWebhookAuth" TEXT NOT NULL DEFAULT '';
