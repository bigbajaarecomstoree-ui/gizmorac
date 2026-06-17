// Central site config. Values here are placeholders for the storefront mock and
// are the single place to update brand/contact details later.

export const SITE = {
  name: "GIZMORAC",
  tagline: "Smart Gadgets That Make Everyday Life Easier",
  description:
    "Premium gadgets for productivity, health, travel and everyday convenience. Quality-tested and shipped PAN India with secure checkout.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://gizmorac.com",
};

export const WHATSAPP_NUMBER = "919999999999"; // placeholder
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hi GIZMORAC, I have a question about your products.",
)}`;

export const TRUST_STATS = {
  customers: "10,000+",
  rating: "4.7",
  reviews: "1,000+",
  orders: "10,000+",
};
