# Post-Order Specification — Canonical Source of Truth

> This document is the **single source of truth** for the GIZMORAC post-order
> architecture (cancellation, COD/online payments, RTO, returns, partial
> returns, disputes, investigations, reverse pickup, warehouse QC, refunds,
> partial refunds, replacements, inventory reconciliation, fraud prevention,
> notifications, audit logging, DPDP, GST, customer risk scoring).
>
> Where any code, comment, ticket, or instruction conflicts with this file,
> **this file wins.** All future post-order work references it.

---

## 0. Migration decisions (approved 2026-06-22)

| Decision | Resolution |
| --- | --- |
| Build scope | Full enterprise architecture. |
| Roles | The current single admin user **temporarily holds all operational roles** (Support, Operations, QC, Finance, Manager, System). |
| Behind feature flags | RBAC, maker-checker dual approval, fraud scoring, multi-channel notifications (SMS/WhatsApp/Push), and advanced operational features. |
| Inventory | Becomes **authoritative** (stock decremented on sale, restocked/deducted via transactional inventory events). |
| Legacy `Packed` | Maps to `PROCESSING`. |
| Replacement | Becomes **item-level** (item stays `REPLACEMENT_APPROVED` until the linked replacement order is `DELIVERED`). |
| Money | Migrates to **integer paise**; PhonePe boundary conversion updated so no double ×100. |
| Disputes | `Ticket`/`TicketMessage` migrate to `disputes`/`dispute_items` (+ message thread retained as dispute communication). |
| Notifications | **Email implemented first**; SMS/WhatsApp/Push remain configurable (flagged off). |

---

## 1. Architecture principles

Three layers: **Order Layer**, **Order Item Layer**, **Dispute Layer**.

- **OrderItem is the operational source of truth.**
- **Dispute** is only an evidence / investigation / communication container. One
  dispute may contain multiple items.
- **Order status is derived** from item status, EXCEPT `CANCELLED` and `RTO`,
  which are order-level override events.

---

## 2. Enums

```typescript
enum OrderStatus {
  PENDING, CONFIRMED, PROCESSING, SHIPPED, OUT_FOR_DELIVERY, DELIVERED,
  PARTIALLY_RETURNED, RETURNED,
  CANCELLED, RTO,
  CLOSED
}

enum OrderItemStatus {
  ACTIVE,
  RETURN_REQUESTED,
  UNDER_INVESTIGATION,        // investigation-required reasons only
  PICKUP_SCHEDULED, PICKED_UP,
  QC_PENDING, QC_PASSED, QC_PARTIAL, QC_FAILED,
  REFUND_APPROVED,
  REPLACEMENT_APPROVED,       // waits here until replacement order DELIVERED
  REFUNDED, REPLACED,
  REJECTED,
  CLOSED
}

enum DisputeStatus {
  NONE, RAISED, UNDER_INVESTIGATION, ESCALATED, REJECTED, APPEALED, CLOSED
}

enum PaymentStatus {
  PENDING, PAID, FAILED, PARTIALLY_REFUNDED, REFUNDED
}

enum RefundStatus {
  NOT_APPLICABLE, PENDING, PROCESSING, PARTIALLY_REFUNDED, REFUNDED, FAILED, MANUAL_REVIEW
}

enum ReturnReason {
  CHANGE_OF_MIND, SIZE_ISSUE, DEFECTIVE_PRODUCT, DAMAGED_PRODUCT,
  WRONG_ITEM_RECEIVED, DELIVERY_DAMAGE, MISSING_ACCESSORIES, QUALITY_ISSUE
}
```

Replacement shipment states live on the replacement **order**, not the item.
The item becomes `REPLACED` only after the linked replacement order reaches
`DELIVERED`.

---

## 3. Return workflow matrix (ReturnReason drives everything)

| Return Reason       | Investigation | Return Shipping | QC  | QC_FAILED means         |
| ------------------- | ------------- | --------------- | --- | ----------------------- |
| CHANGE_OF_MIND      | No            | Customer        | Yes | Not resaleable → reject |
| SIZE_ISSUE          | No            | Customer        | Yes | Not resaleable → reject |
| DEFECTIVE_PRODUCT   | Yes           | Merchant        | Yes | Claim false → reject    |
| DAMAGED_PRODUCT     | Yes           | Merchant        | Yes | Claim false → reject    |
| WRONG_ITEM_RECEIVED | Yes           | Merchant        | Yes | Claim false → reject    |
| DELIVERY_DAMAGE     | Yes           | Merchant        | Yes | Claim false → reject    |
| MISSING_ACCESSORIES | Yes           | Merchant        | Yes | Claim false → reject    |
| QUALITY_ISSUE       | Yes           | Merchant        | Yes | Claim false → reject    |

**Never hardcode investigation/shipping rules anywhere except this matrix.**

---

## 4. Item transitions

Entry: `ACTIVE → RETURN_REQUESTED` (validate return window, returnable category,
not customer-damaged).

No-investigation (`CHANGE_OF_MIND`, `SIZE_ISSUE`):
`RETURN_REQUESTED → PICKUP_SCHEDULED → PICKED_UP → QC_PENDING`

Investigation-required (all others):
`RETURN_REQUESTED → UNDER_INVESTIGATION → PICKUP_SCHEDULED → PICKED_UP → QC_PENDING`

QC outcomes:
- `QC_PENDING → QC_PASSED` → `REFUND_APPROVED` (full) or `REPLACEMENT_APPROVED`
- `QC_PENDING → QC_PARTIAL` → `REFUND_APPROVED` (refund minus restocking deduction)
- `QC_PENDING → QC_FAILED` → `REJECTED` (returned to customer)

Resolution:
- `REFUND_APPROVED → REFUNDED → CLOSED`
- `REPLACEMENT_APPROVED → (replacement order DELIVERED) → REPLACED → CLOSED`
- `REJECTED → CLOSED`

`CLOSED` is terminal. Invalid transitions must be blocked.

---

## 5. Order status derivation

Priority: `CANCELLED` > `RTO` > derived(item statuses).

```
IF order event ∈ {CANCELLED, RTO}        → that event (override)
ELSE IF all items CLOSED                  → CLOSED
ELSE IF all items resolved               → RETURNED
ELSE IF some items resolved, some ACTIVE → PARTIALLY_RETURNED
ELSE                                     → DELIVERED / fulfilment status
```

`CANCELLED` and `RTO` freeze item workflows; those items move directly to
`CLOSED` (no return/QC flow).

---

## 6. Cancellation & RTO

- COD before shipment → `CANCELLED`, refund `NOT_APPLICABLE`.
- Online before shipment → `CANCELLED`, auto-refund.
- Online after shipment → `SHIPPED → RTO → warehouse received → refund`.
- COD RTO → no refund. Online RTO → refund after warehouse receipt.

---

## 7. Dispute flow, appeal cap, closure

```
RAISED → UNDER_INVESTIGATION → {ESCALATED → UNDER_INVESTIGATION | REJECTED}
REJECTED → APPEALED (only if appeals_used < max_appeals) → UNDER_INVESTIGATION
REJECTED → CLOSED (appeals exhausted)
```

- `max_appeals = 1` (configurable).
- SLA: `UNDER_INVESTIGATION` held beyond configured SLA → `ESCALATED` + admin alert.
- Dispute closes when ALL `dispute_items` reach `{REFUNDED, REPLACED, REJECTED, CLOSED}`.
  Mixed outcomes are valid.

Investigation policy: **no refund / replacement / exchange until investigation
completes, product inspected, and decision approved.**

---

## 8. Pickup & QC

Pickup: `UNDER_INVESTIGATION (or RETURN_REQUESTED on no-investigation path) →
PICKUP_SCHEDULED → PICKED_UP → QC_PENDING`. **Pickup creation must be idempotent.**

QC validates condition, serial numbers, accessories, functionality, packaging.
- `QC_PARTIAL` = usable, deduction applied.
- `QC_FAILED` = claim rejected (or not resaleable on no-investigation path).

---

## 9. Refunds

`QC_PASSED/PARTIAL → REFUND_APPROVED → PROCESSING → REFUNDED`.

Required: `refund_reference`, `gateway_reference`, `idempotency_key`.

Failure: `PROCESSING → FAILED → Retry 1 → FAILED → Retry 2 → FAILED →
MANUAL_REVIEW` + admin alert.

**Over-refund invariant (hard):**
```
SUM(completed_refunds + processing_refunds + partial_refunds) ≤ amount_paid
→ reject any refund that would breach this
```

Money in **integer paise**. Order-level discounts and shipping prorated across
items before any partial refund. Restocking deductions stored as
`deduction_amount` + `deduction_reason`.

---

## 10. Replacements

`QC_PASSED → REPLACEMENT_APPROVED → inventory check`.
- In stock → create replacement order (e.g. `ORD-1001-R1`). Original item stays
  `REPLACEMENT_APPROVED` until that order is `DELIVERED`, then `REPLACED → CLOSED`.
- Out of stock → offer refund or backorder (customer approval).

**Replacement creation must be idempotent.**

---

## 11. Webhooks

Persist `event_id`, `gateway_reference`, `signature`, `processed_at`. Verify
signatures/checksums, deduplicate on `event_id`, ignore stale/out-of-order
events, **never downgrade a status** (e.g. never move `REFUNDED` back to
`PROCESSING` on a late event). Reconcile refunds stuck in `PROCESSING` beyond
threshold.

---

## 12. Inventory (transactional)

`QC_PASSED → RESTOCK +1` · `QC_FAILED → damaged bucket` ·
`replacement dispatch → DEDUCT −1`. Atomic/transactional; prevent overselling,
negative stock, and race conditions. Stock is **authoritative** (decrement on
sale, restore on cancel/RTO restock).

---

## 13. Compliance & controls

- **GST:** refunds against a tax invoice generate a credit note, link the
  invoice, adjust tax.
- **DPDP:** encrypt bank accounts / UPI IDs at rest; access logs; retention +
  secure deletion.
- **Customer risk profile:** track `dispute_count`, `return_rate`, `fraud_score`;
  high-risk → `STRICT_REVIEW`.
- **Optimistic locking:** `version` on orders and items; prevent concurrent
  updates.
- **Notifications** (with retry) on: return request, pickup scheduled, pickup
  completed, QC completed, refund initiated, refund completed, replacement
  shipped, appeal decision. Channels: email, SMS, WhatsApp, push.

---

## 14. Terminal states

Order: `CANCELLED`, `CLOSED` · Item: `CLOSED` · Dispute: `CLOSED`. **Closed
entities cannot reopen.**

---

## 15. Database tables

`orders` · `order_items` · `disputes` · `dispute_items` · `refunds` ·
`refund_transactions` · `replacement_orders` · `reverse_pickups` · `qc_reports` ·
`credit_notes` · `notification_logs` · `customer_risk_profiles` ·
`order_status_history` · `inventory_transactions`

---

## 16. State machine rule

All status changes pass through a single transition engine:

```typescript
transitionEntity(entity, currentState, targetState, actor, metadata)
```

The engine enforces: valid transitions, role permissions, audit logging,
optimistic locking, side effects, and notifications. **Nothing bypasses it** —
no controller, API route, webhook, cron, job, admin action, or UI may write a
status field directly.

---

## 17. Audit rule

Every transition generates an audit record: previous state, new state, actor,
timestamp, reason, metadata, IP. No transition may bypass audit logging.
Historical audit rows are migrated as-is and are **not** replayed through the new
engine. **Audit logs and historical records are never deleted.**

---

## 18. Resolved vs Closed

- **Resolved** = item reached a terminal resolution: `REFUNDED`, `REPLACED`, or
  `REJECTED`.
- **Closed** = the administrative terminal state after resolution (`… → CLOSED`).
- Resolved is not Closed. Closed is terminal and cannot reopen.

---

## 19. Role matrix (enforced inside the transition engine)

| Transition                              | Role                    |
| --------------------------------------- | ----------------------- |
| RETURN_REQUESTED → UNDER_INVESTIGATION  | Support                 |
| RETURN_REQUESTED → PICKUP_SCHEDULED (no-investigation path) | Support / auto-approve within window |
| * → PICKUP_SCHEDULED                    | Operations              |
| QC_PENDING → QC_PASSED/PARTIAL/FAILED   | QC Team                 |
| QC_PASSED/PARTIAL → REFUND_APPROVED     | Finance                 |
| REFUND_APPROVED → PROCESSING            | Finance                 |
| PROCESSING → REFUNDED / FAILED          | System (gateway/webhook)|
| High-value refund approval              | Manager (dual approval) |
| REJECTED → APPEALED                     | Customer                |
| APPEALED → UNDER_INVESTIGATION          | Manager                 |

Maker-checker: the user entering bank details ≠ the user approving the payout.
Large refunds require manager approval. (Behind `ffMakerChecker`; while off, the
single admin holds all roles.)

---

## 20. Implementation rules

1. OrderItem is the operational source of truth.
2. Dispute is an investigation container.
3. ReturnReason drives workflow.
4. No automatic dispute refunds or replacements.
5. Invalid transitions blocked.
6. Duplicate refunds / pickups / replacements prevented.
7. Inventory reconciles.
8. Financial invariants enforced (paise, over-refund guard).
9. Audit logging mandatory; closed entities cannot reopen.
10. Fraud monitoring and role permissions enforced.

---

## 21. Optional hardening (post-MVP)

`PARTIAL_RTO` for split shipments · notification retries · manual payout
references (UPI/IMPS/NEFT) on COD refunds · ERP / warehouse integration.
