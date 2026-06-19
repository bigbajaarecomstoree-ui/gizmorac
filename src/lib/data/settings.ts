import type { StoreSetting } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface StoreSettings {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
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
}

export const SETTINGS_ID = "store";

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "GIZMORAC",
  supportEmail: "",
  supportPhone: "",
  whatsappNumber: "919999999999",
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
};

function toSettings(r: StoreSetting): StoreSettings {
  return {
    storeName: r.storeName,
    supportEmail: r.supportEmail,
    supportPhone: r.supportPhone,
    whatsappNumber: r.whatsappNumber,
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
