import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { AuthForm } from "@/components/account/auth-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your GIZMORAC account to track orders and check out faster.",
  robots: { index: false },
};

export default async function LoginPage() {
  if (await getCurrentCustomer()) redirect("/account");
  return (
    <div className="shell flex justify-center py-14 sm:py-20">
      <AuthForm mode="login" />
    </div>
  );
}
