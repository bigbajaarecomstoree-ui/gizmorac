# Post-Order Migration — Mapping Report (Phase 3)

Companion to [`post-order-spec.md`](./post-order-spec.md). Covers the **enum
mapping**, **schema/column mapping**, the **expand → backfill → verify → switch →
contract** plan, and the **verification suite**. The expand DDL is in
[`prisma/migrations/postorder_expand/migration.sql`](../prisma/migrations/postorder_expand/migration.sql).

**Status:** Expand schema authored + validated. **No DB changes applied yet.**
Backfill/switch/contract are later phases (gated on approval).

---

## A. Expand artifact summary

`prisma/migrations/postorder_expand/migration.sql` — **purely additive**:

| Op | Count |
| --- | --- |
| `CREATE TYPE` (enums) | 18 |
| `CREATE TABLE` (new) | 16 |
| `ADD COLUMN` (existing tables) | 38 |
| `FOREIGN KEY` | 15 |
| `CREATE INDEX` | 38 |
| Destructive ops (DROP/ALTER COLUMN) | **0** |

Old `String`/rupee columns are untouched and remain authoritative until the
**contract** migration (Phase 7).

> ⚠️ The regenerated Prisma client now expects the new columns. Until the expand
> SQL is applied to a database, runtime queries against it fail
> (`column does not exist`). Production is unaffected — it runs the deployed
> `main` build with the old client. Local dev must point at a DB that has the
> expand applied (staging branch). **Code and DB must ship together.**

---

## B. Enum mapping (legacy `String` → canonical enum)

### B1. `Order.status` → `OrderStatus` (+ implied item status)

| Legacy | `OrderStatus` | Item status backfill | Note |
| --- | --- | --- | --- |
| `Pending` | `PENDING` | `ACTIVE` | |
| `Confirmed` | `CONFIRMED` | `ACTIVE` | |
| `Packed` | `PROCESSING` | `ACTIVE` | approved mapping |
| `Shipped` | `SHIPPED` | `ACTIVE` | |
| `Delivered` | `DELIVERED` | `ACTIVE` | |
| `Cancelled` | `CANCELLED` *(override)* | `CLOSED` | freeze workflow |
| `Returned` | `RETURNED` | `REFUNDED→CLOSED` (or `REPLACED→CLOSED`) | per refund/replacement fields |
| `Replacement` | *derived* (`DELIVERED`/`PARTIALLY_RETURNED`) | `REPLACEMENT_APPROVED`, or `REPLACED` if replacement delivered | item-level now |
| `Refunded` | *derived* `RETURNED` + `PaymentStatus.REFUNDED` | `REFUNDED→CLOSED` | |

`OrderStatus` is **derived** from items post-migration (except CANCELLED/RTO). The
backfill writes `statusV2` once; thereafter the transition engine recomputes it.

### B2. `Order.paymentStatus` → `Order.paymentState` (`PaymentStatus`)

| Legacy | New | Rule |
| --- | --- | --- |
| `""` (COD, delivered) | `PAID` | COD paid on delivery |
| `""` (COD, pre-delivery) | `PENDING` | |
| `Pending` | `PENDING` | |
| `Paid` | `PAID` | |
| `Failed` | `FAILED` | |
| *(any, fully refunded)* | `REFUNDED` | if `refundStatus=Completed` & full |
| *(any, partially refunded)* | `PARTIALLY_REFUNDED` | partial refund exists |

### B3. `Order.refundStatus` → `Order.refundState` (`RefundStatus`)

| Legacy | New | Note |
| --- | --- | --- |
| `""` | `NOT_APPLICABLE` | |
| `Initiated` | `PROCESSING` | reconcile vs PhonePe (see §E) |
| `Completed` | `REFUNDED` | |
| `Failed` | `FAILED` | |

### B4. `Ticket` → `Dispute` (0 rows in prod — trivial)

| `Ticket.status` | `DisputeStatus` |
| --- | --- |
| `Open` | `RAISED` |
| `Awaiting proof` | `RAISED` |
| `Under review` | `UNDER_INVESTIGATION` |
| `Resolved` | `CLOSED` |
| `Rejected` | `REJECTED` |

| `Ticket.category` | `ReturnReason` |
| --- | --- |
| `Damaged` | `DAMAGED_PRODUCT` |
| `Defective` | `DEFECTIVE_PRODUCT` |
| `Wrong item` | `WRONG_ITEM_RECEIVED` |
| `Not working` | `DEFECTIVE_PRODUCT` |
| `Other` | `QUALITY_ISSUE` |

`Ticket.resolution` (`Refund`/`Replacement`/`Warranty`) → `DisputeItem.outcome`
(`REFUNDED`/`REPLACED`/`REJECTED`). `TicketMessage` → `DisputeMessage`
(`legacyMessageId` preserves provenance). `Dispute.legacyTicketId` preserves the
source ticket id.

---

## C. Schema / column mapping

### C1. Money → integer paise (×100)

Backfill rule: `*_paise = round(rupees) * 100`. Values are already whole-rupee
`Int`, so rounding is a no-op; no fractional loss. Idempotent (writes only where
the paise column is NULL).

| Table | Rupee column(s) | Paise column(s) |
| --- | --- | --- |
| `Order` | subtotal, discount, instantDiscount, shipping, total, refundAmount | subtotalPaise, discountPaise, instantDiscountPaise, shippingPaise, totalPaise, (refundedPaise) |
| `Product` | price, mrp, cost | pricePaise, mrpPaise, costPaise |
| `Coupon` | value*, minOrder, maxDiscount | valuePaise*, minOrderPaise, maxDiscountPaise |
| `StoreSetting` | freeShippingThreshold, shippingFee, browseOfferAmount, cartOfferAmount | …Paise |

\* `Coupon.value` only converts when `type != "percent"` (percent stays a 0–100
integer in `value`; `valuePaise` left NULL for percent coupons).

**`amountPaidPaise`** (refund ceiling): PhonePe `Paid` → `totalPaise`; COD
delivered → `totalPaise`; COD pre-delivery → `0`; `Failed` → `0`.

**PhonePe boundary (Phase 5 code change, flagged here):** `refundOrderPayment`
currently sends `amountPaise: order.total * 100`. After the switch it sends
`order.totalPaise` (or the per-item refund amount) with **no ×100**. Same for
checkout initiate. This removes the double-conversion risk and is part of the
switch step, not expand.

### C2. `Order.items` (JSON) → `order_items` rows

JSON shape today: `[{ id, slug, name, price, qty }]` (`price` in rupees).

Backfill per item (deterministic, resumable):
- `id` = `"${orderId}-itm-${index}"` (stable → re-runnable, no dupes).
- `productId` = JSON `id` (null if product no longer exists).
- `unitPricePaise` = `price * 100`; `lineSubtotalPaise` = `unitPricePaise * qty`.
- `allocatedDiscountPaise` = prorate `order.discountPaise` across items by
  `lineSubtotal` share; **last item absorbs the rounding remainder** so the sum
  equals the order discount exactly.
- `allocatedShippingPaise` = prorate `order.shippingPaise` the same way.
- `netPaidPaise` = `lineSubtotalPaise − allocatedDiscountPaise + allocatedShippingPaise`
  (this is the per-item **over-refund ceiling**).
- `status`: derived from the order's legacy status (B1). `hsn`/`gstRate` copied
  from the live `Product` (admin/internal).

### C3. Flat fulfilment/refund fields → operational tables

| Legacy flat fields on `Order` | New table |
| --- | --- |
| `returnOrderId, returnShipmentId, returnAwb, returnCourier, returnTrackingUrl, returnStatus` | `reverse_pickups` (one row, `idempotencyKey = "${orderId}-rp-migrated"`) |
| `replacementOrderId, replacementShipmentId, replacementAwb, replacementCourier, replacementLabelUrl, replacementTrackingUrl, replacementStatus` | `replacement_orders` (link), and a new `orders` row for the forward shipment if one existed |
| `refundStatus, refundAmount, refundRef` | `refunds` (one row; `amountPaise = refundAmount*100`, `gatewayReference = refundRef`, `idempotencyKey = "${orderId}-rf-migrated"`) |

Only created for orders that actually have these populated (currently: the
refunded orders → one `refunds` row each; no live replacements/returns).

### C4. Audit: `EventLog` vs `order_status_history`

`EventLog` (generic app/error log) is **kept as-is and never deleted**. It is
**not** replayed. The new `order_status_history` is the canonical per-transition
audit going forward. Backfill seeds **one synthetic baseline row per order**
(`previousState=""`, `newState=<migrated statusV2>`, `actorRole=SYSTEM`,
`reason="post-order v2 migration baseline"`) so every order has an audit anchor;
historical EventLog rows remain queryable for pre-migration history.

---

## D. Expand → backfill → verify → switch → contract

| Step | What | Phase | Reversible? |
| --- | --- | --- | --- |
| **Expand** | Apply `migration.sql` (this artifact): new enums/tables/columns. | 3 (now, on snapshot) | Yes — additive; drop-new to revert |
| **Backfill** | Populate paise cols, `order_items`, `disputes`, `refunds`, `statusV2`, baseline audit. Idempotent scripts. | 5–6 data step | Yes — old columns intact |
| **Verify** | Run the §F suite; fail-closed on any assertion. | each data step | n/a |
| **Switch** | Flip `ffPostOrderV2`; reads/writes use v2 model + transition engine; PhonePe uses paise. | after Phase 6 | Yes — flip flag back |
| **Contract** | Separate final migration: drop legacy `status`/rupee/flat columns. | 7 | No — requires snapshot restore |

Each data-migration script is **idempotent and resumable** (keyed on stable ids
/ NULL-guards), safe to re-run after a partial failure.

---

## E. In-flight orders at cutover

Live snapshot: 5 orders, **0 disputes**, **0 active returns/replacements**, **1
refund `Initiated`** (GZ-196533).

- **GZ-196533 (`Initiated`) → DRAIN.** Before backfill, query PhonePe for the
  refund's true state. If completed → create `refunds` row `REFUNDED` +
  `paymentState=REFUNDED`; else `PROCESSING` and let the webhook/reconciler
  finish. No force-map of an active workflow needed.
- The 2 `Refunded` + 1 `Returned` orders are already terminal → force-map per B1.

---

## F. Post-migration verification suite (must pass; fail-closed)

1. **Row counts:** `Order` count unchanged pre/post; `OrderItem` count =
   Σ(JSON item array lengths); no table lost rows.
2. **Refund reconciliation:** per order, `Σ Refund.amountPaise ≤ amountPaidPaise`;
   aggregate `Σ Refund.amountPaise` = `Σ(legacy refundAmount)×100`.
3. **No orphans:** every `order_items.orderId`, `dispute_items.*Id`,
   `refunds.orderId` resolves.
4. **Valid derivation:** every order yields a valid `OrderStatus` from its items.
5. **No invalid/unmapped states:** no item/dispute in a state outside the enums.

Any failure aborts the data migration and is investigated before retry.
