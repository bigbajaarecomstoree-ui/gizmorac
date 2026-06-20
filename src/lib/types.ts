// Domain model for the GIZMORAC storefront.
// Kept framework-agnostic so the data layer can move from mock -> Prisma/DB
// without changing any UI code.

// Category slugs are dynamic (managed in the admin), so this is a plain string.
export type CategorySlug = string;

/** Identifies which inline device illustration to render as the product visual. */
export type DeviceArt =
  | "printer"
  | "inflator"
  | "knee-massager"
  | "eye-massager"
  | "bp-monitor"
  | "oximeter"
  | "keyboard"
  | "usb-hub"
  | "charger"
  | "vacuum"
  | "mount"
  | "webcam"
  | "mouse"
  | "stand"
  | "neck-massager";

export interface Category {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  art: DeviceArt;
  /** Optional real photo; falls back to the `art` line illustration when absent. */
  image?: string | null;
  sortOrder: number;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Review {
  id: string;
  author: string;
  location: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  verified: boolean;
  productSlug?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  sku: string;
  category: CategorySlug;
  art: DeviceArt;
  /** Optional real product photo; UI falls back to the `art` illustration. */
  image?: string | null;
  /** Uploaded product photos (up to 7). Falls back to `art` when empty. */
  images: string[];
  /** Optional uploaded product video URL. */
  video?: string | null;
  /** Current selling price in INR (paise not used; whole rupees). */
  price: number;
  /** Original MRP in INR, used to derive discount. */
  mrp: number;
  /** Purchase/landed cost per unit in INR — used for profit/COGS. */
  cost: number;
  /** HSN code — admin/internal only (GST filing). Never shown to customers. */
  hsn: string;
  /** GST rate % — admin/internal only (GST filing). Never shown to customers. */
  gstRate: number;
  rating: number;
  reviewCount: number;
  stock: number;
  /** Flag/warn when stock falls to or below this number. */
  lowStockThreshold: number;
  badges: string[];
  shortDescription: string;
  description: string;
  highlights: string[];
  features: string[];
  specs: ProductSpec[];
  faqs: FaqItem[];
  isBestSeller: boolean;
  isFeatured: boolean;
  isDeal: boolean;
  /** false = Draft (hidden from storefront), true = Active (live). */
  active: boolean;
  createdAt: string;
}

export type SortOption =
  | "popular"
  | "newest"
  | "price-asc"
  | "price-desc"
  | "rating"
  | "discount";

export interface ShopQuery {
  category?: CategorySlug;
  sort?: SortOption;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  /** "in" = in stock, "out" = out of stock. */
  availability?: "in" | "out";
  q?: string;
  page?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Packed"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Returned"
  | "Refunded";

export interface OrderItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  /** Optional buyer GSTIN for a business / input-tax-credit invoice. */
  gstin: string;
  /** Registered company name (present when a GSTIN is supplied). */
  companyName: string;
  items: OrderItem[];
  subtotal: number;
  /** Total discount applied = coupon + instant offer. */
  discount: number;
  /** Portion of `discount` from an instant promo-popup offer. */
  instantDiscount: number;
  /** Which instant offer was claimed: "" | "browse" | "cart". */
  instantOffer: string;
  shipping: number;
  total: number;
  paymentMethod: string;
  /** Online-payment status: "" (COD) | "Pending" | "Paid" | "Failed". */
  paymentStatus: string;
  /** Gateway reference (PhonePe transaction/order id). */
  paymentRef: string;
  couponCode?: string | null;
  customerId?: string | null;
  createdAt: string;
}

/** Coupon kinds the storefront + admin understand. */
export type CouponType = "percent" | "fixed" | "bogo";

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  /** Percent (0–100) for "percent"; rupee amount for "fixed"; ignored for "bogo". */
  value: number;
  minOrder: number;
  /** Cap on a percentage discount in rupees; 0 = no cap. */
  maxDiscount: number;
  active: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
  usageLimit: number;
  usedCount: number;
  description: string;
  createdAt: string;
}

/** Customer record with the password hash stripped — safe to pass to the client. */
export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  createdAt: string;
}

/** A customer row enriched with order rollups for the admin directory. */
export interface CustomerWithStats extends Customer {
  orderCount: number;
  totalSpent: number;
}

// --- support tickets (damage / defect claims) ---

export type TicketStatus =
  | "Open"
  | "Awaiting proof"
  | "Under review"
  | "Resolved"
  | "Rejected";

export type TicketCategory =
  | "Damaged"
  | "Defective"
  | "Wrong item"
  | "Not working"
  | "Other";

/** "" = undecided. Otherwise the outcome the admin granted. */
export type TicketResolution = "" | "Refund" | "Replacement" | "Warranty";

export interface TicketMessage {
  id: string;
  author: "customer" | "admin";
  body: string;
  /** Uploaded image/video proof URLs. */
  attachments: string[];
  /** true when an admin message asks the customer for photo/video proof. */
  proofRequest: boolean;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  orderId: string;
  orderNumber: string;
  customerId: string | null;
  email: string;
  name: string;
  category: TicketCategory;
  description: string;
  status: TicketStatus;
  resolution: TicketResolution;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}
