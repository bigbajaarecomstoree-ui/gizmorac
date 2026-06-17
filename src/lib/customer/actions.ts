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

export interface AuthState {
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(fd: FormData, key: string): string {
  return (fd.get(key) ?? "").toString().trim();
}

export async function signupAction(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const fullName = field(formData, "fullName");
  const email = field(formData, "email").toLowerCase();
  const phone = field(formData, "phone");
  const password = (formData.get("password") ?? "").toString();
  const confirm = (formData.get("confirm") ?? "").toString();

  if (!fullName) return { error: "Please enter your full name." };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists. Try logging in." };
  }

  const customer = await prisma.customer.create({
    data: { fullName, email, phone, passwordHash: hashPassword(password) },
  });
  await setCustomerCookie(customer.id);
  redirect("/account");
}

export async function loginAction(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const email = field(formData, "email").toLowerCase();
  const password = (formData.get("password") ?? "").toString();

  const customer = await prisma.customer.findUnique({ where: { email } });
  // Always run a hash comparison to avoid leaking which emails exist (timing).
  const ok = customer
    ? verifyPassword(password, customer.passwordHash)
    : verifyPassword(password, `x:${"0".repeat(128)}`);

  if (!customer || !ok) {
    return { error: "Incorrect email or password." };
  }

  await setCustomerCookie(customer.id);
  redirect("/account");
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
