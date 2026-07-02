"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/customer-session";
import {
  setCustomerCookie,
  clearCustomerCookie,
  getCurrentCustomer,
} from "@/lib/customer-auth";
import { logEvent } from "@/lib/data/logs";
import { limitByIp } from "@/lib/rate-limit";
import { safeInternalPath } from "@/lib/sanitize";

export interface AuthState {
  error?: string;
  /** Echoed back on failure so the form can preserve the entered email. */
  email?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(fd: FormData, key: string): string {
  return (fd.get(key) ?? "").toString().trim();
}

/**
 * Post-auth redirect target. Only internal, non-protocol-relative paths are
 * allowed (guards against open-redirect via the `next` param); else /account.
 */
function safeNext(fd: FormData): string {
  return safeInternalPath((fd.get("next") ?? "").toString(), "/account");
}

export async function signupAction(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const blocked = await limitByIp("signup", 5, 600);
  if (blocked) return { error: blocked };
  const fullName = field(formData, "fullName");
  const email = field(formData, "email").toLowerCase();
  const phone = field(formData, "phone");
  const password = (formData.get("password") ?? "").toString();
  const confirm = (formData.get("confirm") ?? "").toString();

  if (!fullName) return { error: "Please enter your full name.", email };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address.", email };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters.", email };
  if (password !== confirm) return { error: "Passwords do not match.", email };

  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists. Try logging in.", email };
  }

  const customer = await prisma.customer.create({
    data: { fullName, email, phone, passwordHash: hashPassword(password) },
  });
  await setCustomerCookie(customer.id);
  await logEvent({
    actor: "customer",
    actorId: customer.id,
    actorEmail: customer.email,
    action: "customer.signup",
    message: "New customer account created",
  });
  redirect(safeNext(formData));
}

export async function loginAction(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const blocked = await limitByIp("login", 10, 60);
  if (blocked) return { error: blocked };
  const email = field(formData, "email").toLowerCase();
  const password = (formData.get("password") ?? "").toString();

  const customer = await prisma.customer.findUnique({ where: { email } });
  // Always run a hash comparison to avoid leaking which emails exist (timing).
  const ok = customer
    ? verifyPassword(password, customer.passwordHash)
    : verifyPassword(password, `x:${"0".repeat(128)}`);

  if (!customer || !ok) {
    await logEvent({
      level: "warn",
      actor: "customer",
      actorEmail: email,
      action: "customer.login.failed",
      message: "Failed customer login",
    });
    return { error: "Incorrect email or password.", email };
  }

  if (customer.deactivatedAt) {
    return {
      error:
        "This account has been deactivated. Please contact us to restore it.",
      email,
    };
  }

  await setCustomerCookie(customer.id);
  await logEvent({
    actor: "customer",
    actorId: customer.id,
    actorEmail: customer.email,
    action: "customer.login",
    message: "Customer signed in",
  });
  redirect(safeNext(formData));
}

export async function logoutAction(): Promise<void> {
  await clearCustomerCookie();
  redirect("/");
}

export async function updateProfileAction(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const current = await getCurrentCustomer();
  if (!current) redirect("/login");

  const fullName = field(formData, "fullName");
  if (!fullName) return { error: "Please enter your full name." };

  await prisma.customer.update({
    where: { id: current.id },
    data: {
      fullName,
      phone: field(formData, "phone"),
      address: field(formData, "address"),
      city: field(formData, "city"),
      state: field(formData, "state"),
      pincode: field(formData, "pincode"),
    },
  });
  revalidatePath("/account");
  return {};
}

/** Toggle the customer's marketing-email subscription. */
export async function setMarketingOptIn(
  optIn: boolean,
): Promise<{ ok: boolean; optIn: boolean }> {
  const current = await getCurrentCustomer();
  if (!current) redirect("/login");

  await prisma.customer.update({
    where: { id: current.id },
    data: { marketingOptIn: optIn },
  });
  await logEvent({
    actor: "customer",
    actorId: current.id,
    actorEmail: current.email,
    action: optIn ? "customer.email.subscribed" : "customer.email.unsubscribed",
    message: optIn
      ? "Re-subscribed to marketing emails"
      : "Unsubscribed from marketing emails",
  });
  revalidatePath("/account");
  return { ok: true, optIn };
}

/**
 * Customer deactivates ("deletes") their own account. This is a soft delete:
 * the row and all orders are kept, only `deactivatedAt` is set, and the session
 * is cleared. Admin can restore the account later.
 */
export async function deleteMyAccount(): Promise<void> {
  const current = await getCurrentCustomer();
  if (!current) redirect("/login");

  await prisma.customer.update({
    where: { id: current.id },
    data: { deactivatedAt: new Date() },
  });
  await logEvent({
    level: "warn",
    actor: "customer",
    actorId: current.id,
    actorEmail: current.email,
    action: "customer.account.deactivated",
    message: "Customer deactivated their account",
  });
  await clearCustomerCookie();
  revalidatePath("/admin/customers");
  redirect("/?account=deactivated");
}

// --- address book ---

export interface AddressInput {
  id?: string;
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export interface AddressResult {
  ok: boolean;
  error?: string;
}

const PHONE_RE = /^[6-9]\d{9}$/;
const PIN_RE = /^\d{6}$/;

function cleanAddress(input: AddressInput) {
  const data = {
    label: (input.label ?? "").trim().slice(0, 40),
    fullName: (input.fullName ?? "").trim(),
    phone: (input.phone ?? "").replace(/\s+/g, ""),
    line1: (input.line1 ?? "").trim(),
    city: (input.city ?? "").trim(),
    state: (input.state ?? "").trim(),
    pincode: (input.pincode ?? "").trim(),
  };
  if (!data.fullName) return { error: "Enter the recipient's full name." };
  if (!PHONE_RE.test(data.phone)) return { error: "Enter a valid 10-digit phone number." };
  if (!data.line1) return { error: "Enter the address." };
  if (!data.city) return { error: "Enter the city." };
  if (!data.state) return { error: "Enter the state." };
  if (!PIN_RE.test(data.pincode)) return { error: "Enter a valid 6-digit pincode." };
  return { data };
}

/** Add a new address, or update an existing one when `id` is supplied. */
export async function saveAddress(input: AddressInput): Promise<AddressResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in." };

  const parsed = cleanAddress(input);
  if (parsed.error || !parsed.data) return { ok: false, error: parsed.error };

  const count = await prisma.address.count({ where: { customerId: customer.id } });
  // First address is automatically the default.
  const makeDefault = Boolean(input.isDefault) || count === 0;

  let savedId: string;
  if (input.id) {
    const existing = await prisma.address.findUnique({ where: { id: input.id } });
    if (!existing || existing.customerId !== customer.id) {
      return { ok: false, error: "Address not found." };
    }
    await prisma.address.update({
      where: { id: input.id },
      data: { ...parsed.data, ...(makeDefault ? { isDefault: true } : {}) },
    });
    savedId = input.id;
  } else {
    const created = await prisma.address.create({
      data: { ...parsed.data, customerId: customer.id, isDefault: makeDefault },
    });
    savedId = created.id;
  }

  // Only one default at a time.
  if (makeDefault) {
    await prisma.address.updateMany({
      where: { customerId: customer.id, id: { not: savedId } },
      data: { isDefault: false },
    });
  }

  revalidatePath("/account/settings");
  revalidatePath("/checkout");
  return { ok: true };
}

/** Delete an address; promotes the newest remaining one to default if needed. */
export async function deleteAddress(id: string): Promise<AddressResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in." };

  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.customerId !== customer.id) {
    return { ok: false, error: "Address not found." };
  }
  await prisma.address.delete({ where: { id } });

  if (existing.isDefault) {
    const next = await prisma.address.findFirst({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
    });
    if (next) {
      await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  revalidatePath("/account/settings");
  revalidatePath("/checkout");
  return { ok: true };
}

/** Mark one address as the default delivery address. */
export async function setDefaultAddress(id: string): Promise<AddressResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in." };

  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.customerId !== customer.id) {
    return { ok: false, error: "Address not found." };
  }
  await prisma.address.updateMany({
    where: { customerId: customer.id },
    data: { isDefault: false },
  });
  await prisma.address.update({ where: { id }, data: { isDefault: true } });

  revalidatePath("/account/settings");
  revalidatePath("/checkout");
  return { ok: true };
}
