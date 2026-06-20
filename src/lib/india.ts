// India states/UTs + a pincode → state lookup. Client-safe (no server imports).

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

// Map common API name variants to our canonical option labels.
const ALIASES: Record<string, string> = {
  pondicherry: "Puducherry",
  orissa: "Odisha",
  "delhi (nct)": "Delhi",
  "nct of delhi": "Delhi",
  "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  "andaman & nicobar islands": "Andaman and Nicobar Islands",
  "jammu & kashmir": "Jammu and Kashmir",
};

/** Resolve a raw state name (from the API) to one of our option labels, or null. */
export function normalizeState(raw: string): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  const target = ALIASES[key] ?? raw.trim();
  return (
    INDIAN_STATES.find((s) => s.toLowerCase() === target.toLowerCase()) ?? null
  );
}

export interface PinLookup {
  state: string | null;
  city: string | null;
}

/**
 * Look up the state (and district) for a 6-digit pincode via India Post's free
 * public API. Returns null on any failure so the caller can fall back to manual
 * selection.
 */
export async function lookupPincode(pin: string): Promise<PinLookup | null> {
  if (!/^\d{6}$/.test(pin)) return null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json();
    const rec = Array.isArray(data) ? data[0] : null;
    if (!rec || rec.Status !== "Success" || !rec.PostOffice?.length) return null;
    const po = rec.PostOffice[0];
    return { state: normalizeState(po.State ?? ""), city: po.District ?? null };
  } catch {
    return null;
  }
}
