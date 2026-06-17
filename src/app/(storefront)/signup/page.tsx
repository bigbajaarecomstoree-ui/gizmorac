import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { AuthForm } from "@/components/account/auth-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a GIZMORAC account to track orders, save addresses and check out faster.",
  robots: { index: false },
};

export default async function SignupPage() {
  if (await getCurrentCustomer()) redirect("/account");
  return (
    <div className="shell flex justify-center py-14 sm:py-20">
      <AuthForm mode="signup" />
    </div>
  );
}
