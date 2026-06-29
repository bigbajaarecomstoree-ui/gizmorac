// Registered business identity printed on customer tax invoices.
// The "Sold By" address must match the GST registration. Values come from
// Settings → Company details; the defaults below are the fallback.

export interface InvoiceBusiness {
  brand: string;
  legalName: string;
  addressLines: string[];
  pan: string;
  gstin: string;
  // GST state code is the first two digits of the GSTIN (07 = Delhi).
  stateCode: string;
  stateName: string;
  phone: string;
  email: string;
  website: string;
}

export const DEFAULT_BUSINESS: InvoiceBusiness = {
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
  stateCode: "07",
  stateName: "Delhi",
  phone: "+91 93102 14091",
  email: "care@gizmorac.com",
  website: "gizmorac.com",
};

/** The company fields off a store-settings object (kept loose to avoid a cycle). */
export interface CompanySettings {
  storeName: string;
  legalName: string;
  companyAddress: string;
  companyState: string;
  companyStateCode: string;
  companyPan: string;
  companyGstin: string;
  supportPhone: string;
  supportEmail: string;
}

/** Build the invoice identity from store settings, falling back to defaults. */
export function businessFromSettings(s: CompanySettings): InvoiceBusiness {
  const d = DEFAULT_BUSINESS;
  const addressLines = (s.companyAddress || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return {
    brand: s.storeName?.trim() || d.brand,
    legalName: s.legalName?.trim() || d.legalName,
    addressLines: addressLines.length ? addressLines : d.addressLines,
    pan: s.companyPan?.trim() || d.pan,
    gstin: s.companyGstin?.trim() || d.gstin,
    stateCode: s.companyStateCode?.trim() || d.stateCode,
    stateName: s.companyState?.trim() || d.stateName,
    phone: s.supportPhone?.trim() || d.phone,
    email: s.supportEmail?.trim() || d.email,
    website: d.website,
  };
}
