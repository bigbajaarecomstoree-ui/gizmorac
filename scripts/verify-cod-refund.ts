// Staging verification for the COD-advance refund-on-cancel (Option A).
// Runs the REAL refundCodAdvance + cancelOrderEverywhere against a disposable
// Neon clone, with only the PhonePe network calls stubbed so the success
// DB-write path actually executes. Asserts the cancellation matrix + idempotency.
//
// Usage: DATABASE_URL=<staging> npx tsx scripts/verify-cod-refund.ts
import { prisma } from "@/lib/prisma";
import { SETTINGS_ID } from "@/lib/data/settings";
import { refundCodAdvance, cancelOrderEverywhere } from "@/lib/data/order-fulfillment";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} ${extra}`);
  }
}

// --- Stub PhonePe network (token + refund) ---------------------------------
const realFetch = globalThis.fetch;
let refundCalls = 0;
let failRefund = false;
globalThis.fetch = (async (url: unknown, init?: unknown) => {
  const u = String(url);
  if (u.includes("/oauth/token")) {
    return new Response(
      JSON.stringify({ access_token: "tok", expires_at: Math.floor(Date.now() / 1000) + 3000 }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }
  if (u.includes("/payments/v2/refund")) {
    refundCalls++;
    if (failRefund) {
      return new Response(JSON.stringify({ message: "Simulated gateway rejection" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ refundId: "RFX", state: "PENDING" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  return (realFetch as typeof fetch)(url as never, init as never);
}) as typeof fetch;

let seq = 0;
async function seed(over: Record<string, unknown>) {
  seq++;
  return prisma.order.create({
    data: {
      orderNumber: `GZ-VR${Date.now().toString(36)}${seq}`,
      firstName: "Test",
      lastName: "Buyer",
      email: "verify@example.com",
      phone: "9000000000",
      address: "1 Test St",
      city: "Mumbai",
      state: "MH",
      pincode: "400001",
      subtotal: 1000,
      total: 1000,
      ...over,
    },
  });
}

async function main() {
  // Ensure PhonePe is "configured" so initiateRefund passes its key guard.
  await prisma.storeSetting.update({
    where: { id: SETTINGS_ID },
    data: {
      phonepeClientId: "TESTID",
      phonepeClientSecret: "TESTSECRET",
      phonepeEnv: "sandbox",
      phonepeConnected: true,
    },
  });

  // A — qualifying COD-advance order: refund fires, advance amount only.
  console.log("A) Qualifying COD-advance order");
  let before = refundCalls;
  const a = await seed({
    paymentMethod: "COD",
    paymentStatus: "PartiallyPaid",
    codAdvancePaise: 20000,
    codRemainingPaise: 80000,
    deliveryPaymentStatus: "PENDING",
  });
  const ra = await refundCodAdvance(a.id);
  let aRow = await prisma.order.findUniqueOrThrow({ where: { id: a.id } });
  check("returns ok+moved", ra.ok && ra.moved === true);
  check("refunds advance amount (₹200), not total", ra.amount === 200, `got ${ra.amount}`);
  check("hit gateway exactly once", refundCalls - before === 1, `delta ${refundCalls - before}`);
  check("refundStatus=Initiated", aRow.refundStatus === "Initiated", aRow.refundStatus);
  check("refundAmount=200", aRow.refundAmount === 200, String(aRow.refundAmount));
  check("refundRef set (ADV)", aRow.refundRef.includes("-ADV-"), aRow.refundRef);

  // A2 — idempotent: a second call moves no money.
  console.log("A2) Idempotency (repeat call)");
  before = refundCalls;
  const ra2 = await refundCodAdvance(a.id);
  check("returns ok, moved=false", ra2.ok && ra2.moved === false);
  check("no second gateway call", refundCalls - before === 0, `delta ${refundCalls - before}`);

  // A3 — concurrent double-fire: exactly one wins.
  console.log("A3) Concurrent double-fire (CAS)");
  before = refundCalls;
  const a3 = await seed({
    paymentMethod: "COD",
    paymentStatus: "PartiallyPaid",
    codAdvancePaise: 15000,
    codRemainingPaise: 85000,
    deliveryPaymentStatus: "PENDING",
  });
  const [r1, r2] = await Promise.all([refundCodAdvance(a3.id), refundCodAdvance(a3.id)]);
  const moved = [r1, r2].filter((r) => r.moved).length;
  check("exactly one moved money", moved === 1, `moved=${moved}`);
  check("gateway hit exactly once", refundCalls - before === 1, `delta ${refundCalls - before}`);

  // B — prepaid PhonePe order: no-op for the advance refund.
  console.log("B) Prepaid PhonePe order (no-op)");
  before = refundCalls;
  const b = await seed({ paymentMethod: "PhonePe", paymentStatus: "Paid", total: 1000 });
  const rb = await refundCodAdvance(b.id);
  const bRow = await prisma.order.findUniqueOrThrow({ where: { id: b.id } });
  check("ok, moved=false", rb.ok && rb.moved === false);
  check("no gateway call", refundCalls - before === 0);
  check("refundStatus untouched", bRow.refundStatus === "", bRow.refundStatus);

  // C — standard COD (no advance): no-op.
  console.log("C) Standard COD, no advance (no-op)");
  before = refundCalls;
  const c = await seed({ paymentMethod: "COD", paymentStatus: "", codAdvancePaise: 0 });
  const rc = await refundCodAdvance(c.id);
  check("ok, moved=false", rc.ok && rc.moved === false);
  check("no gateway call", refundCalls - before === 0);

  // D — COD-advance but balance already collected (Paid): no-op.
  console.log("D) COD-advance fully collected (Paid) (no-op)");
  before = refundCalls;
  const d = await seed({
    paymentMethod: "COD",
    paymentStatus: "Paid",
    codAdvancePaise: 20000,
    deliveryPaymentStatus: "COLLECTED",
  });
  const rd = await refundCodAdvance(d.id);
  check("ok, moved=false", rd.ok && rd.moved === false);
  check("no gateway call", refundCalls - before === 0);

  // E — gateway rejects: claim released so a retry can re-attempt.
  console.log("E) Gateway failure releases the claim");
  failRefund = true;
  const e = await seed({
    paymentMethod: "COD",
    paymentStatus: "PartiallyPaid",
    codAdvancePaise: 20000,
    codRemainingPaise: 80000,
    deliveryPaymentStatus: "PENDING",
  });
  const re = await refundCodAdvance(e.id);
  let eRow = await prisma.order.findUniqueOrThrow({ where: { id: e.id } });
  check("returns ok=false", re.ok === false);
  check("claim released (refundStatus back to '')", eRow.refundStatus === "", eRow.refundStatus);
  failRefund = false;
  const reRetry = await refundCodAdvance(e.id);
  eRow = await prisma.order.findUniqueOrThrow({ where: { id: e.id } });
  check("retry after fix succeeds", reRetry.ok && reRetry.moved === true);
  check("refundStatus=Initiated after retry", eRow.refundStatus === "Initiated");

  // F — cancelOrderEverywhere end-to-end on a COD-advance order.
  console.log("F) cancelOrderEverywhere refunds the advance + cancels");
  before = refundCalls;
  const f = await seed({
    paymentMethod: "COD",
    paymentStatus: "PartiallyPaid",
    codAdvancePaise: 20000,
    codRemainingPaise: 80000,
    deliveryPaymentStatus: "PENDING",
  });
  const cf = await cancelOrderEverywhere(f.id);
  const fRow = await prisma.order.findUniqueOrThrow({ where: { id: f.id } });
  check("cancel ok", cf.ok);
  check("note mentions ₹200 refund", cf.note.includes("200"), cf.note);
  check("order Cancelled", fRow.status === "Cancelled", fRow.status);
  check("advance refund recorded", fRow.refundStatus === "Initiated" && fRow.refundAmount === 200);
  check("gateway hit once via cancel", refundCalls - before === 1, `delta ${refundCalls - before}`);

  // G — cancelOrderEverywhere on a standard COD order: no money moves.
  console.log("G) cancelOrderEverywhere on standard COD (no refund)");
  before = refundCalls;
  const g = await seed({ paymentMethod: "COD", paymentStatus: "", codAdvancePaise: 0 });
  const cg = await cancelOrderEverywhere(g.id);
  const gRow = await prisma.order.findUniqueOrThrow({ where: { id: g.id } });
  check("cancel ok", cg.ok);
  check("note = plain cancel", cg.note === "Order cancelled.", cg.note);
  check("order Cancelled", gRow.status === "Cancelled");
  check("no gateway call", refundCalls - before === 0);

  // Cleanup seeded rows.
  await prisma.order.deleteMany({ where: { email: "verify@example.com" } });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
