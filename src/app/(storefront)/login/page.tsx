import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { AuthScreen } from "@/components/account/auth-screen";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your GIZMORAC account to track orders and check out faster.",
  robots: { index: false },
};

export default async function LoginPage() {
  if (await getCurrentCustomer()) redirect("/account");
  return <AuthScreen mode="login" />;
}
