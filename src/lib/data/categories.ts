import type { Category } from "@/lib/types";

// Seed data for the Category table. Categories are now managed in the admin
// (DB-backed); this list is only used to seed a fresh database.
export type CategorySeed = Omit<Category, "id" | "hidden" | "featured">;

export const categorySeeds: CategorySeed[] = [
  {
    slug: "smart-gadgets",
    name: "Smart Gadgets",
    tagline: "Clever tools for everyday tasks",
    art: "printer",
    image: "/categories/smart-gadgets.jpg",
    sortOrder: 0,
  },
  {
    slug: "health-devices",
    name: "Health Devices",
    tagline: "Track and care for your body",
    art: "bp-monitor",
    image: "/categories/health-devices.png",
    sortOrder: 1,
  },
  {
    slug: "office-solutions",
    name: "Office Solutions",
    tagline: "Work setups that keep up",
    art: "keyboard",
    image: "/categories/office-solutions.png",
    sortOrder: 2,
  },
  {
    slug: "car-accessories",
    name: "Car Accessories",
    tagline: "Essentials for every drive",
    art: "inflator",
    image: "/categories/car-accessories.png",
    sortOrder: 3,
  },
  {
    slug: "mobile-accessories",
    name: "Mobile Accessories",
    tagline: "Power and protect your phone",
    art: "charger",
    image: "/categories/mobile-accessories.png",
    sortOrder: 4,
  },
  {
    slug: "computer-accessories",
    name: "Computer Accessories",
    tagline: "Upgrade your desk",
    art: "usb-hub",
    image: "/categories/computer-accessories.png",
    sortOrder: 5,
  },
];
