import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { AuthScreen } from "@/components/account/auth-screen";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a GIZMORAC account to track orders, save addresses and check out faster.",
  robots: { index: false },
};

export default async function SignupPage() {
  if (await getCurrentCustomer()) redirect("/account");
  return <AuthScreen mode="signup" />;
}
