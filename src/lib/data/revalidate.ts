import { revalidatePath } from "next/cache";

// Every admin surface whose numbers derive from orders. Call after any order /
// cancel / COD / refund mutation so no admin view is left showing reversed or
// stale sales. (Admin pages are force-dynamic so the server always re-queries;
// this keeps the client Router Cache — and any future ISR — honest too.)
const ADMIN_ORDER_VIEWS = [
  "/admin",
  "/admin/orders",
  "/admin/reports",
  "/admin/finance",
  "/admin/cod",
  "/admin/inventory",
];

/** Revalidate every admin view that reflects order-derived numbers. */
export function revalidateAdminOrderViews(): void {
  for (const p of ADMIN_ORDER_VIEWS) revalidatePath(p);
}
