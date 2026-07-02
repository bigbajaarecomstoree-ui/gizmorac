import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { AuthScreen } from "@/components/account/auth-screen";
import { safeInternalPath } from "@/lib/sanitize";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your GIZMORAC account to track orders and check out faster.",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safe = safeInternalPath(next, "");
  if (await getCurrentCustomer()) redirect(safe || "/account");
  return <AuthScreen mode="login" next={safe} />;
}
