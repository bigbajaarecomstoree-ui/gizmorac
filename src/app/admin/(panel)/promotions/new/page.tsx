import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createCoupon } from "@/lib/admin/actions";
import { CouponForm } from "@/components/admin/coupon-form";

export default function NewCouponPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/promotions"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to promotions
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold tracking-tight">New coupon</h1>
      <CouponForm action={createCoupon} submitLabel="Create coupon" />
    </div>
  );
}
