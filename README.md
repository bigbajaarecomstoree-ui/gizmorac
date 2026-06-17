# GIZMORAC — Premium D2C Gadget Storefront

A modern, conversion-focused, mobile-first storefront for **GIZMORAC**, an Indian
consumer-electronics brand. Built as a single Next.js full-stack app (storefront
now; API, admin and payments in later phases).

> **Design language:** light "instrument" aesthetic — clean light surfaces, amber as
> the brand accent (amber-700 readout prices, deal countdown), IBM Plex Sans / Plex
> Mono for engineering precision and DM Sans for readable body copy.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router, RSC, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (CSS-first `@theme` tokens) |
| UI | Hand-built component primitives (shadcn-style), `lucide-react` icons, `cva` |
| Fonts | `next/font` — IBM Plex Sans, IBM Plex Mono, DM Sans |
| State | React Context + `localStorage` (cart & wishlist) |

> The PRD originally specced a separate Laravel 12 + MySQL API. We chose a **Next.js
> full-stack** architecture (single codebase, Vercel-friendly, faster to ship). The
> data layer is structured so it swaps to Prisma/DB without touching the UI.

## Getting started

```bash
npm install
npx prisma db push          # create the SQLite database (prisma/dev.db)
npx tsx prisma/seed.ts      # seed products + sample orders
npm run dev                 # http://localhost:3000  (launch config uses 3007)
npm run build               # production build
```

**Admin panel:** open [`/admin`](http://localhost:3007/admin) and sign in with the
`ADMIN_PASSWORD` from `.env` (default `gizmorac-admin` — change it). `.env` also
holds `DATABASE_URL`, `JWT_SECRET`, and `NEXT_PUBLIC_SITE_URL`.

## What's built (this phase: foundation + full browse flow)

- **Homepage** — hero with floating device showcase, marketplace trust strip,
  why-choose, category grid, best sellers, **deal of the day with a live LED
  countdown**, featured products, verified reviews, FAQ accordion, newsletter.
- **Shop** (`/shop`) — category / price / rating / availability filters, sort,
  SEO-friendly pagination, search. Fully URL-driven (`/shop?category=…&sort=…`).
- **Product detail** (`/product/[slug]`) — gallery, LED price, highlights, quantity
  + Buy Now / Add to Cart / Wishlist, pincode delivery checker, tabbed
  Description / Features / Specifications / FAQs / Reviews, related products.
- **Cart** (`/cart`) — line items, quantity, coupon (`GIZMO10`), order summary.
- **Wishlist** (`/wishlist`) — saved products, persisted locally.
- **SEO** — per-page metadata, Open Graph, canonical URLs, JSON-LD for
  Organization / Product / FAQ / Breadcrumb, plus `sitemap.xml` and `robots.txt`.
- **Chrome** — sticky header with live cart/wishlist badges + search, footer,
  floating WhatsApp button, branded 404, toasts.

## Project structure

```
prisma/
  schema.prisma           Product + Order models (SQLite)
  seed.ts                 seeds products + sample orders
src/
  proxy.ts                guards /admin (Next 16 middleware)
  app/
    layout.tsx            minimal root (fonts, metadata)
    (storefront)/         storefront group — own layout w/ header/footer/cart
      layout.tsx · page.tsx · shop/ · product/[slug]/ · cart/ · wishlist/
    admin/
      login/page.tsx      owner login
      (panel)/            auth-gated shell (sidebar)
        page.tsx          dashboard · products/ · orders/
    sitemap.ts · robots.ts · not-found.tsx · icon.png
  components/
    layout/ store/ home/ product/ shop/ cart/ admin/ ui/
  lib/
    session.ts            pure JWT (used by proxy)
    auth.ts               cookie-session helpers
    admin/actions.ts      server actions (login, product CRUD, order status)
    data/                 queries.ts (products) · orders.ts · categories/reviews/faqs
    prisma.ts  types.ts  format.ts  constants.ts  shop-url.ts  utils.ts
```

## Admin panel

The owner-only admin lives at **`/admin`** (login at `/admin/login`).

- **Auth** — password (`ADMIN_PASSWORD`) → signed JWT in an httpOnly cookie
  (`jose`). [`src/proxy.ts`](src/proxy.ts) (Next 16's renamed middleware) guards
  every `/admin` route. Mutations are server actions in
  [`src/lib/admin/actions.ts`](src/lib/admin/actions.ts).
- **Dashboard** — revenue / orders / pending / products / low-stock KPIs + recent orders.
- **Products** — list, add, edit, delete (full content: pricing, stock, badges,
  highlights, features, specs, FAQs, flags). Changes appear on the storefront immediately.
- **Orders** — list, detail (items, customer, shipping, payment), and status updates.

## Data layer

Products and orders are stored in **SQLite via Prisma 6**
([`prisma/schema.prisma`](prisma/schema.prisma)); categories, reviews and FAQs
remain static config. All access goes through **async** functions in
[`src/lib/data/queries.ts`](src/lib/data/queries.ts) and
[`src/lib/data/orders.ts`](src/lib/data/orders.ts), so the UI is storage-agnostic.
Swap `provider`/`DATABASE_URL` to Postgres or MySQL for production — the models and
queries stay the same.

> Pinned to **Prisma 6** (Prisma 7 changed datasource config to require driver adapters).

## Design tokens

Defined once in [`src/app/globals.css`](src/app/globals.css) via Tailwind v4
`@theme` — `--color-background #f4f4f6`, `--color-surface #ffffff`,
`--color-accent #f59e0b` (amber-500 fills/icons), `--color-accent-bright #b45309`
(amber-700, readable amber text), `--color-on-accent` (dark text on amber), plus
the `.readout`, `.tech-label` and `.grid-ticks` signature utilities.

## Roadmap

**Done**
- ✅ Storefront + full browse flow, light theme, SEO
- ✅ Persistence — Prisma + SQLite (products & orders)
- ✅ Admin panel — owner auth, dashboard, product CRUD, order management

**Next**
1. **Checkout → real orders** — wire cart checkout to create orders (COD), then
   GoKwik / PhonePe payments; order success & public tracking page.
2. **Customer accounts** — JWT login, account dashboard, saved addresses.
3. **Admin extras** — bulk Excel product import, coupons, review moderation, settings.
4. **GST invoices** (PDF), **email automation** (Resend), analytics (GA4 / Meta Pixel).
