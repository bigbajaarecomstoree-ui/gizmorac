import type { Review as ReviewRow } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Review } from "@/lib/types";

/** Map a stored review row to the storefront Review shape used by the PDP. */
export function toReview(r: ReviewRow): Review {
  return {
    id: r.id,
    author: r.author,
    location: r.location,
    rating: r.rating,
    title: r.title,
    body: r.body,
    date: r.createdAt.toISOString(),
    verified: r.verified,
    productSlug: r.productSlug,
  };
}

/** Real customer reviews for one product (newest first). */
export async function getDbReviewsForSlug(slug: string): Promise<Review[]> {
  const rows = await prisma.review.findMany({
    where: { productSlug: slug },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toReview);
}

/** Reviews a customer has already left on an order, keyed by productId. */
export async function getReviewsForOrder(
  orderId: string,
): Promise<Map<string, ReviewRow>> {
  const rows = await prisma.review.findMany({ where: { orderId } });
  return new Map(rows.map((r) => [r.productId, r]));
}
