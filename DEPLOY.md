# Deploying GIZMORAC

This app is built to deploy on **Vercel** with a **PostgreSQL** database and
**Vercel Blob** for image uploads. The code is already prepared for all three —
follow the steps below.

## What you need to create (accounts)

- A **GitHub** account (to host the code Vercel deploys from)
- A **Vercel** account — https://vercel.com (free Hobby tier is fine to start)
- A **PostgreSQL** database — easiest options:
  - **Vercel Postgres** (created from inside Vercel), or
  - **Neon** (https://neon.tech, free) / **Supabase** (https://supabase.com, free)
- A **domain name** (from any registrar — GoDaddy, Namecheap, etc.)

---

## Step 1 — Create the PostgreSQL database

Create a Postgres database with one of the providers above and copy its
**connection string** (looks like `postgresql://user:pass@host:5432/db?sslmode=require`).

## Step 2 — Switch Prisma from SQLite to PostgreSQL

In `prisma/schema.prisma`, change the datasource provider:

```prisma
datasource db {
  provider = "postgresql"   // was "sqlite"
  url      = env("DATABASE_URL")
}
```

The data models are already Postgres-compatible — no other schema change needed.
Then, with `DATABASE_URL` pointing at your Postgres DB, create the tables and seed:

```bash
npm run db:push     # creates all tables
npm run db:seed     # optional: 6 categories + demo products/coupons
```

> Tip: keep `DATABASE_URL="file:./dev.db"` (SQLite) locally if you prefer, and
> only set the Postgres URL in Vercel. But Vercel's build needs the committed
> schema to say `postgresql`, so once you flip the provider, point your **local**
> `.env` `DATABASE_URL` at a Postgres DB too (a free Neon dev DB works).

## Step 3 — Push the code to GitHub

```bash
git add -A && git commit -m "Production deploy prep"
git push   # to a GitHub repo
```

(`.env`, `dev.db`, and `/public/uploads/*` are gitignored — secrets stay out.)

## Step 4 — Import the project into Vercel

1. Vercel → **Add New → Project** → import your GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Build command and output are default.
3. Add **Environment Variables** (Project → Settings → Environment Variables):

| Variable | Value |
|---|---|
| `DATABASE_URL` | your Postgres connection string |
| `ADMIN_PASSWORD` | a strong, unique password |
| `JWT_SECRET` | a long random string (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` |

## Step 5 — Enable image uploads (Vercel Blob)

1. Vercel → **Storage → Create → Blob** store, connect it to the project.
2. This auto-adds `BLOB_READ_WRITE_TOKEN` to the project's env vars.

Once that token exists, admin image/video uploads are stored on Blob and persist
across deploys. (Without it, the app falls back to local files — fine for dev only.)

## Step 6 — Deploy & add your domain

1. Click **Deploy**. After the first deploy, run the DB setup against production:
   `npm run db:push` (and optionally `db:seed`) with `DATABASE_URL` = the prod DB.
2. Vercel → **Settings → Domains** → add your domain and follow the DNS
   instructions at your registrar. HTTPS is provisioned automatically.
3. Update `NEXT_PUBLIC_SITE_URL` to the live domain and redeploy.

---

## Post-deploy checklist

- [ ] Log in to `/admin/login` with the production `ADMIN_PASSWORD`
- [ ] Add real products + categories (or CSV import in Admin → Products)
- [ ] Set WhatsApp number, support email/phone, shipping in **Admin → Settings**
- [ ] Fill the real policy text under `/policies/*` (Privacy, Terms, Refund, Shipping)
- [ ] Place a test order end-to-end (COD) and confirm it appears in Admin → Orders
- [ ] Enable automated DB backups in your database provider

## Still pending (separate work)

- **Online payments** (PhonePe/Razorpay) — checkout is COD-only until integrated
- **Shipping** (Shiprocket) — order fulfilment is manual until integrated
- **Transactional email** (Resend) — order/confirmation emails not wired yet
