import type { StoreSetting } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface StoreSettings {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  legalName: string;
  companyAddress: string;
  companyState: string;
  companyStateCode: string;
  companyPan: string;
  companyGstin: string;
  announcementText: string;
  announcementEnabled: boolean;
  announcementScroll: boolean;
  freeShippingThreshold: number;
  shippingFee: number;
  codEnabled: boolean;
  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  twitterUrl: string;
  landingPopupEnabled: boolean;
  landingPopupTitle: string;
  landingPopupMessage: string;
  landingPopupCode: string;
  browseOfferEnabled: boolean;
  browseOfferAmount: number;
  browseOfferDelay: number;
  cartOfferEnabled: boolean;
  cartOfferAmount: number;
  cartOfferDelay: number;
}

export const SETTINGS_ID = "store";

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "GIZMORAC",
  supportEmail: "",
  supportPhone: "",
  whatsappNumber: "919999999999",
  legalName: "BIG BAJAAR ECOM STOREE",
  companyAddress:
    "Plot No. 33, Block A, Mohan Cooperative Industrial Estate, New Delhi, Delhi - 110044, India",
  companyState: "Delhi",
  companyStateCode: "07",
  companyPan: "ABEFB8495P",
  companyGstin: "07ABEFB8495P1ZL",
  announcementText: "Free shipping over ₹999 · PAN India delivery · COD available",
  announcementEnabled: true,
  announcementScroll: false,
  freeShippingThreshold: 999,
  shippingFee: 79,
  codEnabled: true,
  instagramUrl: "",
  facebookUrl: "",
  youtubeUrl: "",
  twitterUrl: "",
  landingPopupEnabled: false,
  landingPopupTitle: "",
  landingPopupMessage: "",
  landingPopupCode: "",
  browseOfferEnabled: false,
  browseOfferAmount: 100,
  browseOfferDelay: 25,
  cartOfferEnabled: false,
  cartOfferAmount: 100,
  cartOfferDelay: 60,
};

function toSettings(r: StoreSetting): StoreSettings {
  return {
    storeName: r.storeName,
    supportEmail: r.supportEmail,
    supportPhone: r.supportPhone,
    whatsappNumber: r.whatsappNumber,
    legalName: r.legalName,
    companyAddress: r.companyAddress,
    companyState: r.companyState,
    companyStateCode: r.companyStateCode,
    companyPan: r.companyPan,
    companyGstin: r.companyGstin,
    announcementText: r.announcementText,
    announcementEnabled: r.announcementEnabled,
    announcementScroll: r.announcementScroll,
    freeShippingThreshold: r.freeShippingThreshold,
    shippingFee: r.shippingFee,
    codEnabled: r.codEnabled,
    instagramUrl: r.instagramUrl,
    facebookUrl: r.facebookUrl,
    youtubeUrl: r.youtubeUrl,
    twitterUrl: r.twitterUrl,
    landingPopupEnabled: r.landingPopupEnabled,
    landingPopupTitle: r.landingPopupTitle,
    landingPopupMessage: r.landingPopupMessage,
    landingPopupCode: r.landingPopupCode,
    browseOfferEnabled: r.browseOfferEnabled,
    browseOfferAmount: r.browseOfferAmount,
    browseOfferDelay: r.browseOfferDelay,
    cartOfferEnabled: r.cartOfferEnabled,
    cartOfferAmount: r.cartOfferAmount,
    cartOfferDelay: r.cartOfferDelay,
  };
}

/** Store settings, falling back to defaults until the admin saves them once. */
export async function getSettings(): Promise<StoreSettings> {
  const row = await prisma.storeSetting.findUnique({ where: { id: SETTINGS_ID } });
  return row ? toSettings(row) : DEFAULT_SETTINGS;
}

/** Build a wa.me link from a phone number (digits only). */
export function whatsappLink(
  number: string,
  text = "Hi GIZMORAC, I have a question about your products.",
): string {
  const clean = (number || "").replace(/\D/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}
