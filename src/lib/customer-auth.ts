import { cookies } from "next/headers";
import type { Customer as CustomerRow } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Customer } from "@/lib/types";
import {
  createCustomerToken,
  verifyCustomerToken,
  CUSTOMER_COOKIE,
  CUSTOMER_MAX_AGE,
} from "@/lib/customer-session";

// Cookie-store helpers for the customer session — server actions / components only.

/** Strip the password hash before a customer record crosses into the UI. */
export function toCustomer(r: CustomerRow): Customer {
  return {
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    phone: r.phone,
    address: r.address,
    city: r.city,
    state: r.state,
    pincode: r.pincode,
    marketingOptIn: r.marketingOptIn,
    deactivatedAt: r.deactivatedAt ? r.deactivatedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function setCustomerCookie(customerId: string): Promise<void> {
  const token = await createCustomerToken(customerId);
  const store = await cookies();
  store.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CUSTOMER_MAX_AGE,
  });
}

export async function clearCustomerCookie(): Promise<void> {
  const store = await cookies();
  store.delete(CUSTOMER_COOKIE);
}

/** The logged-in customer (password hash stripped), or null. */
export async function getCurrentCustomer(): Promise<Customer | null> {
  const store = await cookies();
  const id = await verifyCustomerToken(store.get(CUSTOMER_COOKIE)?.value);
  if (!id) return null;
  const row = await prisma.customer.findUnique({ where: { id } });
  // A deactivated (soft-deleted) account behaves as logged-out until restored.
  if (!row || row.deactivatedAt) return null;
  return toCustomer(row);
}
