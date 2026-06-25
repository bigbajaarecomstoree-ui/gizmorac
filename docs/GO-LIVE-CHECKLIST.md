# GIZMORAC — Go-Live Checklist

All code for the 11-phase launch hardening is shipped. The features below are
**built and guarded** — they sit dormant and safe until you supply the config.
Nothing here touches code; it's all Vercel settings + one admin-panel action.

> **One rule that catches everyone:** Vercel only injects env vars at **build
> time**. After adding/changing *any* variable below, you must **redeploy** for
> it to take effect. Do all the edits, then trigger one redeploy at the end.

---

## 1. Environment variables (Vercel → Project → Settings → Environment Variables)

Set each for the **Production** environment.

| Variable | Value / where to get it | Powers | If you skip it |
|---|---|---|---|
| 🔴 `JWT_SECRET` | Long random string (`openssl rand -hex 32`), min 16 chars | Signs admin **and** customer session cookies. | **Site fails closed** — every authed page/login throws 500 until set. (Also: without it, sessions would be forgeable — admin + account takeover.) |
| 🔴 `CRON_SECRET` | Any long random string (e.g. `openssl rand -hex 32`) | Authorizes the abandoned-order reconcile cron. Vercel auto-sends it as `Authorization: Bearer …` to the cron route. | Cron returns **503 (fail-closed)** → stale online orders never auto-release stock/coupons. |
| 🔴 `PHONEPE_WEBHOOK_AUTH` | The `SHA256(username:password)` you configure in the PhonePe dashboard webhook | Authenticates PhonePe's server-to-server webhook. | Webhook returns **503** (payments still reconcile via the redirect callback + cron, so no payment is lost — but configure it). |
| 🔴 `SHIPROCKET_WEBHOOK_TOKEN` | The token you set in Shiprocket → Settings → API → Webhooks (`x-api-key`) | Authenticates Shiprocket tracking webhooks. | Webhook returns **503** → live tracking updates stop until set. |
| `UPSTASH_REDIS_REST_URL` | Upstash console → your Redis DB → REST API | Rate limiting (login, signup, coupon, newsletter, admin login). | Rate limiting **no-ops** (fail-open). Site works, but brute-force/abuse is unthrottled. |
| `UPSTASH_REDIS_REST_TOKEN` | Same Upstash REST API panel | ↑ (paired with the URL) | ↑ |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → create a Blob store → connect to project (this var is added automatically) | Admin product image/video uploads. | Uploads **500** — Vercel's filesystem is read-only, so the local fallback can't write. |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 → Admin → Data Streams → Measurement ID (`G-XXXXXXXXXX`) | GA4 funnel: view_item, add_to_cart, begin_checkout, purchase, page_view. | No analytics loads (component renders nothing — zero overhead). |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Events Manager → your pixel → Pixel ID (numeric) | Meta Pixel: ViewContent / AddToCart / InitiateCheckout / Purchase. | No pixel loads. |

> `NEXT_PUBLIC_*` are baked into the client bundle → **must redeploy** to appear.
> The others are read server-side but still need a redeploy to be injected.
>
> 🔴 **rows fail closed** after the security hardening batch: set them **before**
> redeploying or those features return 503 (and the whole site 500s without
> `JWT_SECRET`). The live site already works, so `JWT_SECRET` is almost certainly
> already set — **confirm it in Vercel → Production before deploying.**

**Optional / leave unset:**
- `ALLOW_SANDBOX_IN_PROD` — *do not set.* It's the deliberate-dry-run escape
  hatch that lets a sandbox gateway run in production. Leaving it unset is what
  guarantees a customer can never be sent through fake-money checkout.

---

## 2. PhonePe — flip to live (admin panel, not env)

Payment credentials live in the **admin Payment Gateway** config (DB-backed),
not env vars. This is Phase 1's actual go-live.

1. Log into the admin panel → **Payment Gateway** (PhonePe card).
2. Enter your **production** PhonePe `clientId` + `clientSecret`, set environment
   to **Production**, and **Connect**.
3. Save. The guard (`paymentsProductionSafe`) now allows real online payments;
   before this, online checkout politely falls back to "choose Cash on Delivery."

---

## 3. Redeploy

Vercel → Deployments → **Redeploy** the latest `main` (`a3244df` or later).
This injects every variable from step 1.

---

## 4. Post-deploy smoke test (≈10 min)

| Check | How | Pass = |
|---|---|---|
| **Cron auth** | Vercel → your project → **Cron Jobs** tab; wait for a `*/5` run, or trigger manually | Run returns **200** (not 401). Logs show `scanned/paid/released`. |
| **PhonePe live** | Real ₹1 order → pay online → complete | Redirects back to `/order/GZ-…` marked **Confirmed**; callback + reconcile mark it paid. Then **refund the ₹1** from PhonePe dashboard. |
| **Stock safety** | Start an online order, abandon it (don't pay) | Within ~15–60 min the cron releases it: stock restocked, coupon usage decremented, order **Cancelled**. |
| **Uploads** | Admin → add a product image | Image saves and renders (served from `…public.blob.vercel-storage.com`). |
| **GA4** | Open store with browser devtools → Network, filter `collect` | `view_item` fires on a product; `purchase` fires once on the thank-you page (deduped per order). |
| **Meta Pixel** | Meta Events Manager → Test Events | `ViewContent` / `Purchase` arrive. |
| **Rate limiting** | Hit the login form wrong ~10× fast | Gets throttled with a "too many attempts" message. |

---

## Rollback

Everything ships behind a flag or empty-config guard:
- **Code:** `git revert <commit>` (responsive = `a3244df`, analytics/uploads/perf = `d8fc830`).
- **Analytics / pixel:** unset `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_META_PIXEL_ID` + redeploy → nothing loads.
- **PhonePe:** flip the admin gateway back to Sandbox/Disconnect → checkout reverts to COD-only.
- **Rate limiting:** remove the Upstash vars → fail-open (off).
