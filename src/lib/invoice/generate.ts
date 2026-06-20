import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import type { Order } from "@/lib/types";
import { INVOICE_BUSINESS as BIZ } from "./business";

// A4 in points.
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 48; // page margin
const CONTENT_W = PAGE_W - M * 2;

// Brand palette (mirrors the storefront accent #f59e0b).
const ACCENT = rgb(0.961, 0.62, 0.043);
const INK = rgb(0.11, 0.11, 0.12);
const MUTED = rgb(0.45, 0.45, 0.47);
const LINE = rgb(0.84, 0.84, 0.86);
const SHADE = rgb(0.97, 0.97, 0.975);

const nf = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
/** Money in PDF copy. Uses "Rs." — standard PDF fonts can't render the ₹ glyph. */
const rs = (n: number) => `Rs. ${nf.format(n)}`;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Greedy word-wrap to at most `maxLines`, ellipsising the last line if it overflows. */
function fitLines(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  let i = 0;
  for (; i < words.length; i++) {
    const test = cur ? `${cur} ${words[i]}` : words[i];
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      cur = words[i];
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && cur) {
    lines.push(cur);
    i = words.length;
  }
  // Truncated → ellipsise the last drawn line.
  if (i < words.length && lines.length > 0) {
    let last = lines[lines.length - 1];
    while (
      last.length > 1 &&
      font.widthOfTextAtSize(`${last}…`, size) > maxWidth
    ) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last}…`;
  }
  return lines;
}

export async function buildInvoicePdf(order: Order): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Invoice ${order.orderNumber}`);
  doc.setAuthor(BIZ.brand);
  doc.setProducer(`${BIZ.brand} store`);

  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - M;

  const text = (
    s: string,
    x: number,
    yy: number,
    opts: { font?: PDFFont; size?: number; color?: RGB } = {},
  ) =>
    page.drawText(s, {
      x,
      y: yy,
      size: opts.size ?? 9.5,
      font: opts.font ?? reg,
      color: opts.color ?? INK,
    });

  const textRight = (
    s: string,
    rightX: number,
    yy: number,
    opts: { font?: PDFFont; size?: number; color?: RGB } = {},
  ) => {
    const f = opts.font ?? reg;
    const sz = opts.size ?? 9.5;
    text(s, rightX - f.widthOfTextAtSize(s, sz), yy, opts);
  };

  const hline = (yy: number, x1 = M, x2 = PAGE_W - M, color = LINE) =>
    page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness: 1, color });

  // ---- header: brand + INVOICE ----
  text(BIZ.brand, M, y - 4, { font: bold, size: 22, color: INK });
  // accent underscore bar
  page.drawRectangle({ x: M, y: y - 12, width: 34, height: 3, color: ACCENT });
  textRight("INVOICE", PAGE_W - M, y - 2, { font: bold, size: 22, color: ACCENT });

  y -= 30;
  const bizLines = [
    BIZ.legalName,
    ...BIZ.addressLines,
    `Phone: ${BIZ.phone}`,
    `Email: ${BIZ.email}`,
    ...(BIZ.gstin ? [`GSTIN: ${BIZ.gstin}`] : []),
  ];
  for (const ln of bizLines) {
    text(ln, M, y, { size: 9, color: MUTED });
    y -= 12;
  }

  y -= 8;
  hline(y);
  y -= 22;

  // ---- billed-to (left) + meta (right) ----
  const metaTop = y;
  text("BILLED TO", M, y, { font: bold, size: 8.5, color: MUTED });
  let by = y - 15;
  const billed = [
    { s: `${order.firstName} ${order.lastName}`.trim(), font: bold },
    { s: order.address },
    { s: `${order.city}, ${order.state} - ${order.pincode}` },
    { s: `Phone: ${order.phone}` },
    { s: `Email: ${order.email}` },
  ];
  for (const b of billed) {
    for (const ln of fitLines(b.s, b.font ?? reg, 9.5, CONTENT_W * 0.5, 2)) {
      text(ln, M, by, { font: b.font ?? reg, size: 9.5 });
      by -= 13;
    }
  }

  // meta box on the right
  const metaX = M + CONTENT_W * 0.56;
  const metaValX = PAGE_W - M;
  const meta: [string, string][] = [
    ["Invoice No.", `INV-${order.orderNumber}`],
    ["Order No.", order.orderNumber],
    ["Invoice Date", fmtDate(order.createdAt)],
    ["Payment", order.paymentMethod === "COD" ? "Cash on Delivery" : order.paymentMethod],
    ["Status", order.status],
  ];
  let my = metaTop;
  for (const [k, v] of meta) {
    text(k, metaX, my, { size: 9, color: MUTED });
    textRight(v, metaValX, my, { font: bold, size: 9.5 });
    my -= 15;
  }

  y = Math.min(by, my) - 14;

  // ---- items table ----
  // columns: # | Item | Qty | Unit Price | Amount
  const colNumX = M + 6;
  const colItemX = M + 30;
  const colQtyRight = M + CONTENT_W * 0.62;
  const colUnitRight = M + CONTENT_W * 0.81;
  const colAmtRight = PAGE_W - M - 6;
  const itemMaxW = colQtyRight - colItemX - 28;

  const drawTableHeader = () => {
    page.drawRectangle({
      x: M,
      y: y - 16,
      width: CONTENT_W,
      height: 20,
      color: SHADE,
    });
    const hy = y - 11;
    text("#", colNumX, hy, { font: bold, size: 8.5, color: MUTED });
    text("ITEM", colItemX, hy, { font: bold, size: 8.5, color: MUTED });
    textRight("QTY", colQtyRight, hy, { font: bold, size: 8.5, color: MUTED });
    textRight("UNIT PRICE", colUnitRight, hy, { font: bold, size: 8.5, color: MUTED });
    textRight("AMOUNT", colAmtRight, hy, { font: bold, size: 8.5, color: MUTED });
    y -= 24;
  };

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - M;
  };

  drawTableHeader();

  order.items.forEach((it, idx) => {
    const nameLines = fitLines(it.name, reg, 9.5, itemMaxW, 2);
    const rowH = 8 + nameLines.length * 12;
    if (y - rowH < M + 150) {
      newPage();
      drawTableHeader();
    }
    const topY = y;
    text(String(idx + 1), colNumX, topY - 2, { size: 9.5, color: MUTED });
    nameLines.forEach((ln, li) => {
      text(ln, colItemX, topY - 2 - li * 12, { size: 9.5 });
    });
    textRight(String(it.qty), colQtyRight, topY - 2, { size: 9.5 });
    textRight(rs(it.price), colUnitRight, topY - 2, { size: 9.5 });
    textRight(rs(it.price * it.qty), colAmtRight, topY - 2, { size: 9.5, font: bold });
    y -= rowH;
    hline(y + 2, M, PAGE_W - M, rgb(0.92, 0.92, 0.93));
  });

  // ---- totals ----
  y -= 14;
  const totalsLabelX = M + CONTENT_W * 0.58;
  const totalsValX = PAGE_W - M - 6;
  const totalRow = (label: string, value: string, opts: { strong?: boolean; color?: RGB } = {}) => {
    text(label, totalsLabelX, y, {
      size: opts.strong ? 10.5 : 9.5,
      font: opts.strong ? bold : reg,
      color: opts.color ?? (opts.strong ? INK : MUTED),
    });
    textRight(value, totalsValX, y, {
      size: opts.strong ? 10.5 : 9.5,
      font: opts.strong ? bold : reg,
      color: opts.color ?? INK,
    });
    y -= 16;
  };

  totalRow("Subtotal", rs(order.subtotal));
  const couponPortion = order.discount - order.instantDiscount;
  if (couponPortion > 0) {
    totalRow(
      `Discount${order.couponCode ? ` (${order.couponCode})` : ""}`,
      `- ${rs(couponPortion)}`,
      { color: rgb(0.12, 0.55, 0.27) },
    );
  }
  if (order.instantDiscount > 0) {
    totalRow("Instant offer", `- ${rs(order.instantDiscount)}`, {
      color: rgb(0.12, 0.55, 0.27),
    });
  }
  totalRow("Shipping", order.shipping === 0 ? "FREE" : rs(order.shipping));

  // grand total — shaded box
  y -= 2;
  page.drawRectangle({
    x: totalsLabelX - 10,
    y: y - 6,
    width: PAGE_W - M - (totalsLabelX - 10),
    height: 24,
    color: SHADE,
  });
  y += 4;
  totalRow("TOTAL", rs(order.total), { strong: true });
  y -= 6;

  text("All amounts are in INR and inclusive of applicable taxes.", M, y, {
    size: 8,
    color: MUTED,
  });
  y -= 26;

  // ---- footer ----
  hline(y);
  y -= 16;
  text(`Thank you for shopping with ${BIZ.brand}!`, M, y, { font: bold, size: 10 });
  y -= 14;
  text(
    `For help with this order, contact ${BIZ.email} or ${BIZ.phone}.`,
    M,
    y,
    { size: 8.5, color: MUTED },
  );
  y -= 12;
  text(
    "This is a computer-generated invoice and does not require a signature.",
    M,
    y,
    { size: 8.5, color: MUTED },
  );

  return doc.save();
}
