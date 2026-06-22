# Post-Order Expand — Staging Verification Report

**Date:** 2026-06-22 · **Result: ✅ CLEAN** · **Production: NOT touched.**

Validates the Prisma Migrate baseline + expand migration against a full clone of
production. Run via `scripts/postorder-verify.mjs` (raw-SQL, pre/post-expand safe).

## Environment

| Item | Value |
| --- | --- |
| Neon project | `neon-bole-magnet` (`cool-cake-88424989`, ap-southeast-1) |
| Production branch | `main` (`br-winter-snow-aocwnd75`) — untouched |
| Pre-change UTC marker | `2026-06-22T15:43:50Z` |
| **Snapshot branch (kept)** | `snapshot/pre-postorder-expand-20260622` (`br-icy-poetry-aom8pwjz`), parent_lsn `0/2508228`, created `2026-06-22T15:43:52Z` |
| Staging branch (clone, deleted post-run) | `staging/postorder-dryrun` (`br-misty-silence-aodbluni`) |

## Migration history applied (staging)

1. `0_init` — `migrate resolve --applied` (baseline marked, **not** re-run; tables already existed).
2. `20260622120000_postorder_expand` — `migrate deploy`, applied successfully.
   - **Duration: ~3.4s.**
3. `migrate status` → "Database schema is up to date!"; re-running `deploy` → "No pending migrations" (**idempotent / resumable ✅**).

## Verification suite

| # | Assertion | Result |
| --- | --- | --- |
| 1 | Existing-table row counts identical prod vs staging (no data loss) | **MATCH ✅** |
| 2 | All 16 v2 tables present and empty | **16/16, all empty ✅** |
| 3 | All 18 enums created | **18/18 ✅** |
| 4 | New columns present (Order 8/8, StoreSetting 5/5 sampled) | **✅** |
| 5 | `_prisma_migrations` = `[0_init, 20260622120000_postorder_expand]` | **✅** |
| 6 | Prisma client reads v2 columns (errored on pre-expand prod) | **✅** |
| — | No orphaned rows | trivially ✅ (v2 tables empty) |

**Row counts (identical prod ↔ staging):** Product 44 · Order 5 · Customer 1 ·
Address 1 · Coupon 4 · Review 0 · Ticket 0 · TicketMessage 0 · Subscriber 1 ·
Category 6 · StoreSetting 1 · EventLog 37.

**Smoke sample (staging):** order `GZ-618792` reads `status="Delivered"`,
`statusV2=null`, `totalPaise=null` (NULL is expected — backfill is a later
phase), `version=0`. Settings: `ffPostOrderV2=false`, `ffAutoQc=true`,
`maxAppeals=1`, `highValueRefundPaise=500000`.

## Notes

- The expand is **additive**; legacy `status`/rupee/flat columns remain
  authoritative. New `*Paise`/`statusV2`/`paymentState`/`refundState` are NULL
  until the backfill phase. New model stays dark behind `ffPostOrderV2=false`.
- Staging was a clone of real customer data; **deleted after the run** (DPDP).
  Snapshot branch retained as the production rollback point.

## Production apply plan (on approval — NOT yet executed)

```bash
# Snapshot already taken (br-icy-poetry-aom8pwjz). Then, against production:
set -a && . ./.env && set +a
npx prisma migrate resolve --applied 0_init          # baseline (no re-run)
npx prisma migrate deploy                            # applies the expand (~seconds)
# Deploy the matching code (feat/post-order-arch) so the v2 client matches the DB.
# ffPostOrderV2 stays false — model dark until backfill + verification.
```

Rollback = restore `snapshot/pre-postorder-expand-20260622` (or PITR to the UTC
marker) **and** redeploy `backup/post-order`. See `post-order-runbook.md`.
