// Post-order migration verification (expand-scoped).
// Usage: node scripts/postorder-verify.mjs "<DATABASE_URL>"
// Uses raw SQL only, so it runs against both pre-expand and post-expand DBs.
import { PrismaClient } from "@prisma/client";

const url = process.argv[2] || process.env.DATABASE_URL;
if (!url) {
  console.error("Pass a DATABASE_URL as argv[2] or env.");
  process.exit(1);
}
const prisma = new PrismaClient({ datasourceUrl: url });

const BASE_TABLES = [
  "Product", "Order", "Customer", "Address", "Coupon", "Review",
  "Ticket", "TicketMessage", "Subscriber", "Category", "StoreSetting", "EventLog",
];
const V2_TABLES = [
  "OrderItem", "Dispute", "DisputeItem", "DisputeMessage", "Refund",
  "RefundTransaction", "ReplacementOrder", "ReversePickup", "QcReport",
  "CreditNote", "NotificationLog", "CustomerRiskProfile", "InventoryTransaction",
  "OrderStatusHistory", "WebhookEvent", "AdminUser",
];
const V2_ENUMS = [
  "OrderStatus", "OrderItemStatus", "DisputeStatus", "PaymentStatus",
  "RefundStatus", "ReturnReason", "QcResult", "PickupStatus", "ReplacementState",
  "RefundMethod", "NotificationChannel", "NotificationState", "InventoryTxnType",
  "RiskLevel", "CreditNoteState", "ActorRole", "EntityType", "AdminRole",
];
const ORDER_V2_COLS = [
  "version", "statusV2", "paymentState", "refundState", "subtotalPaise",
  "totalPaise", "amountPaidPaise", "isReplacementOrder",
];
const SETTING_V2_COLS = ["ffPostOrderV2", "ffRbac", "ffAutoQc", "maxAppeals", "highValueRefundPaise"];

async function count(table) {
  try {
    const r = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "${table}"`);
    return r[0].n;
  } catch {
    return null; // table absent
  }
}
async function tableExists(t) {
  const r = await prisma.$queryRawUnsafe(`SELECT to_regclass('public."${t}"') IS NOT NULL AS ok`);
  return r[0].ok;
}
async function enumExists(name) {
  const r = await prisma.$queryRawUnsafe(
    `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}' AND typtype = 'e') AS ok`,
  );
  return r[0].ok;
}
async function colExists(table, col) {
  const r = await prisma.$queryRawUnsafe(
    `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${col}') AS ok`,
  );
  return r[0].ok;
}
async function migrations() {
  try {
    const r = await prisma.$queryRawUnsafe(
      `SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY started_at`,
    );
    return r;
  } catch {
    return null;
  }
}

(async () => {
  const out = { baseCounts: {}, v2Tables: {}, v2Enums: {}, orderCols: {}, settingCols: {}, migrations: null };
  for (const t of BASE_TABLES) out.baseCounts[t] = await count(t);
  for (const t of V2_TABLES) out.v2Tables[t] = { exists: await tableExists(t), rows: await count(t) };
  for (const e of V2_ENUMS) out.v2Enums[e] = await enumExists(e);
  for (const c of ORDER_V2_COLS) out.orderCols[c] = await colExists("Order", c);
  for (const c of SETTING_V2_COLS) out.settingCols[c] = await colExists("StoreSetting", c);
  out.migrations = await migrations();
  console.log(JSON.stringify(out, null, 2));
  await prisma.$disconnect();
})();
