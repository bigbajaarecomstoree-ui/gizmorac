// Registered business identity printed on customer invoices/receipts.
// Kept in one place so the invoice header always matches the storefront footer.
export const INVOICE_BUSINESS = {
  brand: "GIZMORAC",
  legalName: "BIG BAJAAR ECOM STOREE",
  addressLines: [
    "D-12, Bhagwan Dass Nagar,",
    "Near East Punjabi Bagh,",
    "New Delhi - 110026",
  ],
  phone: "+91 99999 99999",
  email: "care@gizmorac.com",
  website: "gizmorac.com",
  // Optional — left blank until the client provides a GSTIN. When set it prints
  // in the header. (HSN codes / per-item GST rates are NEVER shown to customers.)
  gstin: "",
} as const;
