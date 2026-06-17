import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCouponById } from "@/lib/data/coupons";
import { updateCoupon } from "@/lib/admin/actions";
import { CouponForm } from "@/components/admin/coupon-form";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export default async function EditCouponPage({ params }: { params: Params }) {
  const { id } = await params;
  const coupon = await getCouponById(id);
  if (!coupon) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/promotions"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to promotions
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold tracking-tight">Edit coupon</h1>
      <CouponForm action={updateCoupon} coupon={coupon} submitLabel="Save changes" />
    </div>
  );
}
