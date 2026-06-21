import { randomBytes } from "node:crypto";
import type { Coupon as CouponRow } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Repeat-order reward coupon issued automatically when an order is delivered.
export const REWARD_PERCENT = 10;
export const REWARD_MAX_DISCOUNT = 500; // cap on the % discount, in ₹
export const REWARD_VALID_DAYS = 45;

function rewardCode(): string {
  return `GZ-AGAIN-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export interface RewardCoupon {
  code: string;
  value: number;
  maxDiscount: number;
  expiresAt: string;
  used: boolean;
  expired: boolean;
}

function toReward(c: CouponRow): RewardCoupon {
  return {
    code: c.code,
    value: c.value,
    maxDiscount: c.maxDiscount,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : "",
    used: c.usageLimit > 0 && c.usedCount >= c.usageLimit,
    expired: c.expiresAt ? new Date(c.expiresAt) < new Date() : false,
  };
}

/**
 * Reward milestones: the shopper's 1st delivered order, then every 5th
 * (5th, 10th, 15th, 20th, …) — not every order. This keeps the coupon a
 * loyalty incentive rather than a permanent discount.
 */
export function isRewardMilestone(deliveredCount: number): boolean {
  return deliveredCount === 1 || (deliveredCount >= 5 && deliveredCount % 5 === 0);
}

/**
 * Issue a repeat-order reward coupon when a delivered order lands on a
 * milestone (1st, 5th, 10th, …). Idempotent per order, so re-saving
 * "Delivered" is safe, and non-milestone orders never get a coupon.
 */
export async function issueRepeatCoupon(order: {
  id: string;
  customerId: string | null;
  email?: string | null;
}): Promise<void> {
  const existing = await prisma.coupon.findFirst({
    where: { orderId: order.id, kind: "reward" },
  });
  if (existing) return;

  // "Purchase number" = how many delivered orders this shopper now has
  // (counted by account, falling back to email for guest checkouts).
  const identity = order.customerId
    ? { customerId: order.customerId }
    : order.email
      ? { email: order.email }
      : null;
  if (!identity) return;
  const deliveredCount = await prisma.order.count({
    where: { status: "Delivered", ...identity },
  });
  if (!isRewardMilestone(deliveredCount)) return;

  const expiresAt = new Date(
    Date.now() + REWARD_VALID_DAYS * 24 * 60 * 60 * 1000,
  );

  for (let i = 0; i < 5; i++) {
    const code = rewardCode();
    const clash = await prisma.coupon.findUnique({ where: { code } });
    if (clash) continue;
    await prisma.coupon.create({
      data: {
        code,
        type: "percent",
        value: REWARD_PERCENT,
        minOrder: 0,
        maxDiscount: REWARD_MAX_DISCOUNT,
        active: true,
        expiresAt,
        usageLimit: 1,
        description: `${REWARD_PERCENT}% off your next order — thanks for shopping with us!`,
        kind: "reward",
        orderId: order.id,
        customerId: order.customerId,
      },
    });
    return;
  }
}

/** The repeat-order reward earned by a specific order, if any. */
export async function getRewardForOrder(
  orderId: string,
): Promise<RewardCoupon | null> {
  const c = await prisma.coupon.findFirst({
    where: { orderId, kind: "reward" },
  });
  return c ? toReward(c) : null;
}

/** All reward coupons a customer has earned (newest first). */
export async function getRewardsForCustomer(
  customerId: string,
): Promise<RewardCoupon[]> {
  const rows = await prisma.coupon.findMany({
    where: { customerId, kind: "reward" },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toReward);
}
