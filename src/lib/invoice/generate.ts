import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type RGB,
} from "pdf-lib";
import type { Order } from "@/lib/types";
import { DEFAULT_BUSINESS, type InvoiceBusiness } from "./business";

// A4 in points.
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 36; // page margin
const CONTENT_W = PAGE_W - M * 2;

const INK = rgb(0.11, 0.11, 0.12);
const MUTED = rgb(0.42, 0.42, 0.45);
const LINE = rgb(0.78, 0.78, 0.8);
const SHADE = rgb(0.95, 0.95, 0.96);
const ACCENT = rgb(0.961, 0.62, 0.043);

/** Per-product GST info, looked up by product id when building the invoice. */
export type TaxInfo = Map<string, { hsn: string; gstRate: number }>;

const nf = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const money = (n: number) => nf.format(n);
const round2 = (n: number) => Math.round(n * 100) / 100;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// --- amount in words (Indian system) ---
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function two(n: number): string {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
}
function three(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return `${h ? `${ONES[h]} Hundred${r ? " " : ""}` : ""}${r ? two(r) : ""}`;
}
function rupeesInWords(n: number): string {
  if (n <= 0) return "Zero";
  let res = "";
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) res += `${three(crore)} Crore `;
  if (lakh) res += `${three(lakh)} Lakh `;
  if (thousand) res += `${three(thousand)} Thousand `;
  if (n) res += three(n);
  return res.trim();
}

/** Greedy word-wrap to at most `maxLines`, ellipsising the last line. */
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
    if (font.widthOfTextAtSize(test, size) <= maxWidth) cur = test;
    else {
      if (cur) lines.push(cur);
      cur = words[i];
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && cur) {
    lines.push(cur);
    i = words.length;
  }
  if (i < words.length && lines.length > 0) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && font.widthOfTextAtSize(`${last}…`, size) > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last}…`;
  }
  return lines;
}

/** Wrap a string to the given pixel width for the chosen font/size. */
function wrapText(
  s: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = s.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (cur && font.widthOfTextAtSize(test, size) > maxWidth) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [s];
}

export async function buildInvoicePdf(
  order: Order,
  tax: TaxInfo,
  business: InvoiceBusiness = DEFAULT_BUSINESS,
): Promise<Uint8Array> {
  const BIZ = business;
  const doc = await PDFDocument.create();
  doc.setTitle(`Tax Invoice ${order.orderNumber}`);
  doc.setAuthor(BIZ.legalName);

  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - M;

  const text = (
    s: string,
    x: number,
    yy: number,
    o: { font?: PDFFont; size?: number; color?: RGB } = {},
  ) =>
    page.drawText(s, {
      x,
      y: yy,
      size: o.size ?? 9,
      font: o.font ?? reg,
      color: o.color ?? INK,
    });
  const textRight = (
    s: string,
    rightX: number,
    yy: number,
    o: { font?: PDFFont; size?: number; color?: RGB } = {},
  ) => {
    const f = o.font ?? reg;
    const sz = o.size ?? 9;
    text(s, rightX - f.widthOfTextAtSize(s, sz), yy, o);
  };
  const hline = (yy: number, x1 = M, x2 = PAGE_W - M, color = LINE) =>
    page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness: 1, color });

  // ---- header ----
  text(BIZ.brand, M, y - 6, { font: bold, size: 20 });
  page.drawRectangle({ x: M, y: y - 14, width: 30, height: 3, color: ACCENT });
  textRight("TAX INVOICE", PAGE_W - M, y - 4, { font: bold, size: 18 });
  textRight("Original for Recipient", PAGE_W - M, y - 18, { size: 8, color: MUTED });
  y -= 34;
  hline(y);
  y -= 16;

  // ---- sold by (left) + addresses (right) ----
  const colR = M + CONTENT_W * 0.54;
  const topY = y;

  text("Sold By", M, y, { font: bold, size: 9.5 });
  let ly = y - 14;
  text(BIZ.legalName, M, ly, { font: bold, size: 9 });
  ly -= 12;
  const addrMaxW = colR - M - 12;
  for (const raw of BIZ.addressLines) {
    for (const ln of wrapText(raw, reg, 8.5, addrMaxW)) {
      text(ln, M, ly, { size: 8.5, color: MUTED });
      ly -= 11;
    }
  }
  ly -= 3;
  text(`PAN No: ${BIZ.pan}`, M, ly, { size: 8.5 });
  ly -= 12;
  text(`GST Registration No: ${BIZ.gstin}`, M, ly, { size: 8.5 });

  // right: billing + shipping (same address for our store)
  const baseAddr = [
    `${order.firstName} ${order.lastName}`.trim(),
    order.address,
    `${order.city}, ${order.state} - ${order.pincode}`,
    `Phone: ${order.phone}`,
  ];
  // For a business invoice, lead with the company name and append the GSTIN.
  const billAddr = order.gstin
    ? [
        ...(order.companyName ? [order.companyName] : []),
        ...baseAddr,
        `GSTIN: ${order.gstin}`,
      ]
    : baseAddr;
  let ry = topY;
  const rW = PAGE_W - M - colR;
  const drawAddr = (heading: string, addrLines: string[]) => {
    text(heading, colR, ry, { font: bold, size: 9.5 });
    ry -= 14;
    for (const a of addrLines) {
      for (const ln of fitLines(a, reg, 8.5, rW, 2)) {
        text(ln, colR, ry, { size: 8.5, color: MUTED });
        ry -= 11;
      }
    }
    ry -= 6;
  };
  drawAddr("Billing Address", billAddr);
  drawAddr("Shipping Address", baseAddr);

  y = Math.min(ly, ry) - 16;
  hline(y);
  y -= 16;

  // ---- order / invoice meta ----
  const metaTop = y;
  text(`Order Number: ${order.orderNumber}`, M, y, { size: 9 });
  text(`Order Date: ${fmtDate(order.createdAt)}`, M, y - 14, { size: 9 });
  textRight(`Invoice Number: INV-${order.orderNumber}`, PAGE_W - M, metaTop, { size: 9 });
  textRight(`Invoice Date: ${fmtDate(order.createdAt)}`, PAGE_W - M, metaTop - 14, { size: 9 });
  y = metaTop - 30;

  // place-of-supply / tax type
  const interstate =
    order.state.trim().toLowerCase() !== BIZ.stateName.toLowerCase();
  const taxType = interstate ? "IGST" : "CGST+SGST";

  // ---- line items table ----
  // columns (x = left edge of each):
  const cSl = M + 3;
  const cDesc = M + 20;
  // Right-aligned numeric columns (right edges), spaced so values never collide.
  const cUnitR = M + 263;
  const cQtyR = M + 291;
  const cNetR = M + 345;
  const cRateR = M + 377;
  const cTypeR = M + 417;
  const cTaxR = M + 465;
  const cTotalR = PAGE_W - M - 4;
  const descW = 185;

  const drawHead = () => {
    page.drawRectangle({ x: M, y: y - 16, width: CONTENT_W, height: 18, color: SHADE });
    const hy = y - 11;
    text("Sl", cSl, hy, { font: bold, size: 7.5, color: MUTED });
    text("Description", cDesc, hy, { font: bold, size: 7.5, color: MUTED });
    textRight("Unit Price", cUnitR, hy, { font: bold, size: 7.5, color: MUTED });
    textRight("Qty", cQtyR, hy, { font: bold, size: 7.5, color: MUTED });
    textRight("Net Amt", cNetR, hy, { font: bold, size: 7.5, color: MUTED });
    textRight("Rate", cRateR, hy, { font: bold, size: 7.5, color: MUTED });
    textRight("Type", cTypeR, hy, { font: bold, size: 7.5, color: MUTED });
    textRight("Tax Amt", cTaxR, hy, { font: bold, size: 7.5, color: MUTED });
    textRight("Total", cTotalR, hy, { font: bold, size: 7.5, color: MUTED });
    y -= 22;
  };
  drawHead();

  let sumNet = 0;
  let sumTax = 0;
  let sumTotal = 0;

  order.items.forEach((it, idx) => {
    const info = tax.get(it.id);
    const rate = info?.gstRate ?? 18;
    const hsn = info?.hsn ?? "";
    const lineIncl = it.price * it.qty;
    const net = round2(lineIncl / (1 + rate / 100));
    const taxAmt = round2(lineIncl - net);
    const unitNet = round2(it.price / (1 + rate / 100));
    sumNet += net;
    sumTax += taxAmt;
    sumTotal += lineIncl;

    const nameLines = fitLines(
      hsn ? `${it.name}  (HSN: ${hsn})` : it.name,
      reg,
      7.5,
      descW,
      3,
    );
    const rowH = 6 + nameLines.length * 10;
    if (y - rowH < M + 170) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - M;
      drawHead();
    }
    const t0 = y;
    text(String(idx + 1), cSl, t0 - 1, { size: 7.5 });
    nameLines.forEach((ln, li) => text(ln, cDesc, t0 - 1 - li * 10, { size: 7.5 }));
    textRight(money(unitNet), cUnitR, t0 - 1, { size: 7.5 });
    textRight(String(it.qty), cQtyR, t0 - 1, { size: 7.5 });
    textRight(money(net), cNetR, t0 - 1, { size: 7.5 });
    textRight(`${rate}%`, cRateR, t0 - 1, { size: 7.5 });
    textRight(taxType, cTypeR, t0 - 1, { size: 7 });
    textRight(money(taxAmt), cTaxR, t0 - 1, { size: 7.5 });
    textRight(money(lineIncl), cTotalR, t0 - 1, { size: 7.5, font: bold });
    y -= rowH;
    hline(y + 2, M, PAGE_W - M, rgb(0.9, 0.9, 0.91));
  });

  // table TOTAL row
  page.drawRectangle({ x: M, y: y - 16, width: CONTENT_W, height: 18, color: SHADE });
  const ty = y - 11;
  text("TOTAL", cDesc, ty, { font: bold, size: 8 });
  textRight(money(sumNet), cNetR, ty, { font: bold, size: 7.5 });
  textRight(money(sumTax), cTaxR, ty, { font: bold, size: 7.5 });
  textRight(money(sumTotal), cTotalR, ty, { font: bold, size: 7.5 });
  y -= 30;

  // ---- adjustments + grand total (right block) ----
  const labelX = M + CONTENT_W * 0.58;
  const valR = PAGE_W - M - 3;
  const row = (label: string, value: string, strong = false, color?: RGB) => {
    text(label, labelX, y, { size: strong ? 9.5 : 8.5, font: strong ? bold : reg, color: color ?? (strong ? INK : MUTED) });
    textRight(value, valR, y, { size: strong ? 9.5 : 8.5, font: strong ? bold : reg, color: color ?? INK });
    y -= 14;
  };
  const couponPortion = order.discount - order.instantDiscount;
  if (couponPortion > 0) row(`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`, `- ${money(couponPortion)}`, false, rgb(0.12, 0.5, 0.25));
  if (order.instantDiscount > 0) row("Instant offer", `- ${money(order.instantDiscount)}`, false, rgb(0.12, 0.5, 0.25));
  row("Shipping", order.shipping === 0 ? "FREE" : money(order.shipping));
  y -= 8;
  page.drawRectangle({ x: labelX - 8, y: y - 6, width: PAGE_W - M - (labelX - 8), height: 22, color: SHADE });
  y += 3;
  row("Grand Total (INR)", money(order.total), true);
  y -= 10;

  // amount in words
  text("Amount in Words:", M, y, { font: bold, size: 9 });
  y -= 13;
  for (const ln of fitLines(`Rupees ${rupeesInWords(order.total)} Only`, bold, 9.5, CONTENT_W, 2)) {
    text(ln, M, y, { font: bold, size: 9.5 });
    y -= 13;
  }
  y -= 6;
  text("All amounts are in INR. Tax is included in the price shown to the customer.", M, y, { size: 7.5, color: MUTED });
  y -= 24;

  // ---- signatory + footer ----
  hline(y);
  y -= 16;
  textRight(`For ${BIZ.legalName}`, PAGE_W - M, y, { font: bold, size: 9 });
  y -= 30;
  textRight("Authorized Signatory", PAGE_W - M, y, { size: 8.5, color: MUTED });
  y -= 22;
  text(`Payment: ${order.paymentMethod === "COD" ? "Cash on Delivery" : order.paymentMethod}`, M, y, { size: 8.5, color: MUTED });
  y -= 12;
  text("This is a computer-generated invoice and does not require a physical signature.", M, y, { size: 8, color: MUTED });
  y -= 12;
  text(`Questions? ${BIZ.email} · ${BIZ.phone}`, M, y, { size: 8, color: MUTED });

  return doc.save();
}
