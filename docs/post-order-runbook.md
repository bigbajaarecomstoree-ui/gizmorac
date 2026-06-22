# Post-Order Migration — Snapshot, Staging & Rollback Runbook

Operational steps for applying the expand migration safely. **Nothing here has
been run yet** — this is the procedure to execute on approval.

Stack: Next.js on Vercel · Prisma · **Neon Postgres** (`DATABASE_URL` pooled,
`DATABASE_URL_UNPOOLED` direct). Production deploys from `main`. Code backup:
`backup/post-order` (pushed). Working branch: `feat/post-order-arch`.

---

## 1. Database snapshot (MANDATORY before any apply)

Neon gives both PITR and instant branches. Take **both**:

### 1a. Record a PITR checkpoint
1. Neon Console → project → **Branches** → `production` branch → **Backups /
   Restore**. Confirm **point-in-time restore** is enabled and note the current
   **retention window**.
2. Record the exact UTC timestamp **before** applying anything:
   ```bash
   date -u +"%Y-%m-%dT%H:%M:%SZ"   # paste into the deployment log
   ```

### 1b. Create a named restore branch (the snapshot)
1. Neon Console → **Branches** → **New branch** from `production`.
2. Name: `snapshot/pre-postorder-expand-<YYYYMMDD>`.
3. Record: **branch name**, **branch ID**, **created-at**, and the head **LSN**
   (shown in the branch details). This branch is the frozen restore point.

> Why both: the PITR timestamp lets you rewind `production`; the named branch is
> an immutable, independently-restorable copy. Keep both until Phase 7 contract
> is verified in production.

### 1c. (CLI alternative, if `neonctl` is configured)
```bash
neonctl branches create --name snapshot/pre-postorder-expand-$(date +%Y%m%d) \
  --parent production
neonctl branches list   # record id + created_at
```

---

## 2. Staging dry run (MANDATORY before touching production)

1. Neon Console → **New branch** from `production` named
   `staging/postorder-dryrun` (a full clone of production data).
   - ⚠️ **DPDP note:** this clones real customer PII. Keep the branch private,
     delete it after the dry run, and do not expose its connection string.
2. Point a local env at it:
   ```bash
   # .env.staging  (do NOT commit)
   DATABASE_URL=<staging branch pooled URL>
   DATABASE_URL_UNPOOLED=<staging branch direct URL>
   ```
3. Apply the expand to staging and **time it**:
   ```bash
   set -a && . ./.env.staging && set +a
   time npx prisma db push            # idempotent; applies the additive schema
   # (db push is used here because the project has no _prisma_migrations history;
   #  the SQL artifact in prisma/migrations/postorder_expand is the audit record.)
   ```
4. Run the backfill scripts (delivered in Phases 5–6) against staging, then the
   **verification suite** (migration.md §F). Record duration of each.
5. Smoke-test the app against staging (`DATABASE_URL` → staging) — order list,
   order detail, place a test order, a refund path.
6. Only proceed to production after a **clean** staging run with all assertions
   green. Delete the staging branch afterwards.

---

## 3. Apply expand to production (after 1 + 2 pass)

```bash
# 1) Snapshot confirmed (step 1). 2) Staging dry run clean (step 2).
set -a && . ./.env && set +a          # production
time npx prisma db push               # additive only — adds enums/tables/columns
```
Then deploy the matching code (the regenerated client expects the new columns),
so **DB-apply and deploy happen together**. The new model stays dark behind
`ffPostOrderV2=false` until backfill + verification complete.

---

## 4. Rollback (code **and** database, together)

A code-only or DB-only rollback is **invalid**.

### 4a. Code
```bash
git checkout backup/post-order
# redeploy: Vercel → Deployments → promote the last pre-migration build,
# or push backup/post-order to the deploy branch.
```

### 4b. Database (choose one)
- **Before backfill / within expand:** the expand is additive — you may simply
  redeploy old code (which ignores the new columns). To fully remove: restore
  from the snapshot branch or PITR timestamp.
- **After backfill / switch:** restore is required.
  - **PITR:** Neon Console → `production` → Restore → to the timestamp from §1a.
  - **Branch restore:** promote `snapshot/pre-postorder-expand-<date>` (or
    repoint `DATABASE_URL`/`DATABASE_URL_UNPOOLED` to it and redeploy).

### 4c. Verify after rollback
- App boots on `backup/post-order`; order list/detail render.
- Row counts match the pre-migration log; refunds, disputes, audit, inventory
  all intact (audit/historical rows are never deleted).

---

## 5. Pre-flight checklist (gate before §3)

- [ ] `backup/post-order` pushed and **deployable**.
- [ ] PITR timestamp recorded (§1a).
- [ ] Snapshot branch created; name + ID + LSN recorded (§1b).
- [ ] Staging dry run clean; verification suite green; timings recorded (§2).
- [ ] In-flight refund GZ-196533 reconciled against PhonePe (migration.md §E).
- [ ] Post-order actions frozen for the cutover window.
- [ ] `ffPostOrderV2 = false` confirmed (model stays dark post-expand).
