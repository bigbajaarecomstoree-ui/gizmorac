// Registered business identity printed on customer tax invoices.
// The "Sold By" address must match the GST registration.
export const INVOICE_BUSINESS = {
  brand: "GIZMORAC",
  legalName: "BIG BAJAAR ECOM STOREE",
  addressLines: [
    "Plot No. 33, Block A,",
    "Mohan Cooperative Industrial Estate,",
    "New Delhi, Delhi - 110044",
    "India",
  ],
  pan: "ABEFB8495P",
  gstin: "07ABEFB8495P1ZL",
  // GST state code is the first two digits of the GSTIN (07 = Delhi).
  stateCode: "07",
  stateName: "Delhi",
  phone: "+91 99999 99999",
  email: "care@gizmorac.com",
  website: "gizmorac.com",
} as const;
