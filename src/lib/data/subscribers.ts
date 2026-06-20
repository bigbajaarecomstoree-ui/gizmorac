import { prisma } from "@/lib/prisma";

export interface Subscriber {
  id: string;
  email: string;
  createdAt: string;
}

/** Newsletter subscribers, newest first. */
export async function getSubscribers(): Promise<Subscriber[]> {
  const rows = await prisma.subscriber.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getSubscriberCount(): Promise<number> {
  return prisma.subscriber.count();
}
