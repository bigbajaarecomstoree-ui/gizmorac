import type {
  Ticket as TicketRow,
  TicketMessage as TicketMessageRow,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  Ticket,
  TicketCategory,
  TicketMessage,
  TicketResolution,
  TicketStatus,
} from "@/lib/types";

export const TICKET_CATEGORIES: TicketCategory[] = [
  "Damaged",
  "Defective",
  "Wrong item",
  "Not working",
  "Other",
];

export const TICKET_RESOLUTIONS: Exclude<TicketResolution, "">[] = [
  "Refund",
  "Replacement",
  "Warranty",
];

/** Tickets the store still needs to act on. */
export const OPEN_TICKET_STATUSES: TicketStatus[] = [
  "Open",
  "Awaiting proof",
  "Under review",
];

function parseAttachments(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((u) => typeof u === "string") : [];
  } catch {
    return [];
  }
}

function toMessage(m: TicketMessageRow): TicketMessage {
  return {
    id: m.id,
    author: m.author === "admin" ? "admin" : "customer",
    body: m.body,
    attachments: parseAttachments(m.attachments),
    proofRequest: m.proofRequest,
    createdAt: m.createdAt.toISOString(),
  };
}

function toTicket(
  r: TicketRow & { messages?: TicketMessageRow[] },
): Ticket {
  return {
    id: r.id,
    ticketNumber: r.ticketNumber,
    orderId: r.orderId,
    orderNumber: r.orderNumber,
    customerId: r.customerId,
    email: r.email,
    name: r.name,
    category: r.category as TicketCategory,
    description: r.description,
    status: r.status as TicketStatus,
    resolution: r.resolution as TicketResolution,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    messages: (r.messages ?? []).map(toMessage),
  };
}

async function uniqueTicketNumber(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const candidate = `TK-${Math.floor(100000 + Math.random() * 900000)}`;
    const clash = await prisma.ticket.findUnique({
      where: { ticketNumber: candidate },
    });
    if (!clash) return candidate;
  }
  return `TK-${Date.now().toString().slice(-6)}`;
}

export interface CreateTicketInput {
  orderId: string;
  orderNumber: string;
  customerId: string | null;
  email: string;
  name: string;
  category: TicketCategory;
  description: string;
  attachments: string[];
}

export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const ticketNumber = await uniqueTicketNumber();
  const row = await prisma.ticket.create({
    data: {
      ticketNumber,
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      customerId: input.customerId,
      email: input.email,
      name: input.name,
      category: input.category,
      description: input.description,
      status: "Open",
      messages: {
        create: {
          author: "customer",
          body: input.description,
          attachments: JSON.stringify(input.attachments),
        },
      },
    },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return toTicket(row);
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const row = await prisma.ticket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return row ? toTicket(row) : null;
}

/** The ticket raised against a given order, if any (one per order). */
export async function getTicketForOrder(orderId: string): Promise<Ticket | null> {
  const row = await prisma.ticket.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return row ? toTicket(row) : null;
}

export async function getTickets(status?: TicketStatus | "all"): Promise<Ticket[]> {
  const rows = await prisma.ticket.findMany({
    where: status && status !== "all" ? { status } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => toTicket(r));
}

export async function getOpenTicketCount(): Promise<number> {
  return prisma.ticket.count({
    where: { status: { in: OPEN_TICKET_STATUSES } },
  });
}

export interface AddMessageInput {
  ticketId: string;
  author: "customer" | "admin";
  body: string;
  attachments: string[];
  proofRequest?: boolean;
}

export async function addTicketMessage(input: AddMessageInput): Promise<void> {
  await prisma.ticketMessage.create({
    data: {
      ticketId: input.ticketId,
      author: input.author,
      body: input.body,
      attachments: JSON.stringify(input.attachments),
      proofRequest: Boolean(input.proofRequest),
    },
  });
  // touch the ticket so updatedAt reflects the latest activity
  await prisma.ticket.update({
    where: { id: input.ticketId },
    data: { updatedAt: new Date() },
  });
}

export async function setTicketStatus(
  id: string,
  status: TicketStatus,
): Promise<void> {
  await prisma.ticket.update({ where: { id }, data: { status } });
}

export async function setTicketResolution(
  id: string,
  resolution: TicketResolution,
  status: TicketStatus,
): Promise<void> {
  await prisma.ticket.update({ where: { id }, data: { resolution, status } });
}
