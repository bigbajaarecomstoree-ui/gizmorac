import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { AuthScreen } from "@/components/account/auth-screen";
import { safeInternalPath } from "@/lib/sanitize";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a GIZMORAC account to track orders, save addresses and check out faster.",
  robots: { index: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safe = safeInternalPath(next, "");
  if (await getCurrentCustomer()) redirect(safe || "/account");
  return <AuthScreen mode="signup" next={safe} />;
}
