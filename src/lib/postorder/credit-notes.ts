// GST credit notes (spec §13). On a completed refund against a tax invoice,
// issue a credit note that links the invoice and adjusts tax.

import { prisma } from "@/lib/prisma";
import { computeCreditNoteTax } from "./gst";

export async function createCreditNoteForRefund(input: {
  orderId: string;
  refundId?: string;
  amountPaise: number;
  /** Blended GST rate for the refunded amount (defaults to 18%). */
  gstRate?: number;
  invoiceNumber?: string;
}): Promise<{ ok: boolean; creditNoteId?: string; creditNoteNumber?: string; error?: string }> {
  const order = await prisma.order.findUnique({ where: { id: input.orderId }, select: { state: true } });
  if (!order) return { ok: false, error: "Order not found." };
  const setting = await prisma.storeSetting.findFirst({ select: { companyState: true } });

  const interstate = (order.state || "").trim().toLowerCase() !== (setting?.companyState || "").trim().toLowerCase();
  const tax = computeCreditNoteTax(input.amountPaise, input.gstRate ?? 18, interstate);

  const count = await prisma.creditNote.count();
  const creditNoteNumber = `CN-${String(count + 1).padStart(5, "0")}`;

  const cn = await prisma.creditNote.create({
    data: {
      creditNoteNumber,
      orderId: input.orderId,
      refundId: input.refundId ?? null,
      invoiceNumber: input.invoiceNumber ?? "",
      amountPaise: input.amountPaise,
      taxableValuePaise: tax.taxableValuePaise,
      cgstPaise: tax.cgstPaise,
      sgstPaise: tax.sgstPaise,
      igstPaise: tax.igstPaise,
      state: "ISSUED",
    },
  });
  return { ok: true, creditNoteId: cn.id, creditNoteNumber };
}
