import { PrismaClient } from "@prisma/client";
import { products } from "../src/lib/data/products";
import { categorySeeds } from "../src/lib/data/categories";

const prisma = new PrismaClient();

const sampleOrders = [
  {
    orderNumber: "GZ-100245",
    status: "Pending",
    firstName: "Rohan",
    lastName: "Mehta",
    email: "rohan.mehta@example.com",
    phone: "9876543210",
    address: "12 Senapati Bapat Road",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411016",
    items: JSON.stringify([
      { id: "p-labelpro-x1", slug: "gizmorac-labelpro-x1-thermal-printer", name: "GIZMORAC LabelPro X1 Thermal Label Printer", price: 2499, qty: 1 },
    ]),
    subtotal: 2499,
    discount: 0,
    shipping: 0,
    total: 2499,
    paymentMethod: "Prepaid",
  },
  {
    orderNumber: "GZ-100244",
    status: "Confirmed",
    firstName: "Sneha",
    lastName: "Kulkarni",
    email: "sneha.k@example.com",
    phone: "9823011223",
    address: "44 Indiranagar 100ft Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560038",
    items: JSON.stringify([
      { id: "p-aeropump-150", slug: "gizmorac-aeropump-150-tyre-inflator", name: "GIZMORAC AeroPump 150 Portable Tyre Inflator", price: 1799, qty: 1 },
      { id: "p-gripmag-car", slug: "gizmorac-gripmag-car-phone-mount", name: "GIZMORAC GripMag Car Phone Mount", price: 699, qty: 2 },
    ]),
    subtotal: 3197,
    discount: 0,
    shipping: 0,
    total: 3197,
    paymentMethod: "COD",
  },
  {
    orderNumber: "GZ-100243",
    status: "Shipped",
    firstName: "Karan",
    lastName: "Singh",
    email: "karan.singh@example.com",
    phone: "9711122334",
    address: "9 Hauz Khas Village",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110016",
    items: JSON.stringify([
      { id: "p-ganpro-65w", slug: "gizmorac-ganpro-65w-charger", name: "GIZMORAC GaNPro 65W Fast Charger", price: 1499, qty: 1 },
    ]),
    subtotal: 1499,
    discount: 0,
    shipping: 0,
    total: 1499,
    paymentMethod: "Prepaid",
  },
  {
    orderNumber: "GZ-100242",
    status: "Delivered",
    firstName: "Priya",
    lastName: "Nair",
    email: "priya.nair@example.com",
    phone: "9847001122",
    address: "2 Marine Drive",
    city: "Kochi",
    state: "Kerala",
    pincode: "682031",
    items: JSON.stringify([
      { id: "p-opticalm", slug: "gizmorac-opticalm-eye-massager", name: "GIZMORAC OptiCalm Eye Massager", price: 2299, qty: 1 },
      { id: "p-oxytrack-o2", slug: "gizmorac-oxytrack-o2-pulse-oximeter", name: "GIZMORAC OxyTrack O2 Pulse Oximeter", price: 699, qty: 1 },
    ]),
    subtotal: 2998,
    discount: 0,
    shipping: 0,
    total: 2998,
    paymentMethod: "COD",
  },
  {
    orderNumber: "GZ-100241",
    status: "Cancelled",
    firstName: "Meera",
    lastName: "Iyer",
    email: "meera.iyer@example.com",
    phone: "9445566778",
    address: "17 T Nagar",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600017",
    items: JSON.stringify([
      { id: "p-releaf-knee-pro", slug: "gizmorac-releaf-knee-pro-massager", name: "GIZMORAC ReLeaf Knee Pro Massager", price: 2999, qty: 1 },
    ]),
    subtotal: 2999,
    discount: 0,
    shipping: 79,
    total: 3078,
    paymentMethod: "Prepaid",
  },
];

const sampleCoupons = [
  {
    code: "GIZMO10",
    type: "percent",
    value: 10,
    minOrder: 0,
    maxDiscount: 500,
    active: true,
    usageLimit: 0,
    description: "10% off, capped at ₹500",
  },
  {
    code: "FLAT200",
    type: "fixed",
    value: 200,
    minOrder: 1499,
    maxDiscount: 0,
    active: true,
    usageLimit: 0,
    description: "₹200 off orders above ₹1499",
  },
  {
    code: "BOGO",
    type: "bogo",
    value: 0,
    minOrder: 0,
    maxDiscount: 0,
    active: true,
    usageLimit: 0,
    description: "Buy one, get one free",
  },
];

async function main() {
  console.log(`Seeding ${categorySeeds.length} categories...`);
  for (const c of categorySeeds) {
    const data = {
      name: c.name,
      tagline: c.tagline,
      art: c.art,
      image: c.image ?? null,
      sortOrder: c.sortOrder,
    };
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: data,
      create: { slug: c.slug, ...data },
    });
  }

  console.log(`Seeding ${products.length} products...`);
  for (const p of products) {
    const data = {
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      sku: p.sku,
      category: p.category,
      art: p.art,
      price: p.price,
      mrp: p.mrp,
      rating: p.rating,
      reviewCount: p.reviewCount,
      stock: p.stock,
      shortDescription: p.shortDescription,
      description: p.description,
      badges: JSON.stringify(p.badges),
      highlights: JSON.stringify(p.highlights),
      features: JSON.stringify(p.features),
      specs: JSON.stringify(p.specs),
      faqs: JSON.stringify(p.faqs),
      isBestSeller: p.isBestSeller,
      isFeatured: p.isFeatured,
      isDeal: p.isDeal,
      createdAt: new Date(p.createdAt),
    };
    await prisma.product.upsert({
      where: { id: p.id },
      update: data,
      create: { id: p.id, ...data },
    });
  }

  console.log(`Seeding ${sampleOrders.length} sample orders...`);
  for (const o of sampleOrders) {
    await prisma.order.upsert({
      where: { orderNumber: o.orderNumber },
      update: {},
      create: o,
    });
  }

  console.log(`Seeding ${sampleCoupons.length} coupons...`);
  for (const c of sampleCoupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
