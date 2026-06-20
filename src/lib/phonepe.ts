// PhonePe Standard Checkout v2 (OAuth) — server-only client.
// Docs: https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout

const ENV = process.env.PHONEPE_ENV === "production" ? "production" : "sandbox";

const BASE =
  ENV === "production"
    ? "https://api.phonepe.com/apis/pg"
    : "https://api-preprod.phonepe.com/apis/pg-sandbox";

const AUTH_URL =
  ENV === "production"
    ? "https://api.phonepe.com/apis/identity-manager/v1/oauth/token"
    : "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";

/** Whether PhonePe credentials are configured. */
export function phonepeConfigured(): boolean {
  return Boolean(
    process.env.PHONEPE_CLIENT_ID && process.env.PHONEPE_CLIENT_SECRET,
  );
}

// Cache the OAuth token across requests (it lives ~ minutes/hours).
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.expiresAt - 60 > now) return tokenCache.token;

  const body = new URLSearchParams({
    client_id: process.env.PHONEPE_CLIENT_ID ?? "",
    client_version: process.env.PHONEPE_CLIENT_VERSION ?? "1",
    client_secret: process.env.PHONEPE_CLIENT_SECRET ?? "",
    grant_type: "client_credentials",
  });

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`PhonePe auth failed (${res.status})`);
  }
  const data = (await res.json()) as { access_token?: string; expires_at?: number };
  if (!data.access_token) throw new Error("PhonePe auth: no access_token");
  tokenCache = {
    token: data.access_token,
    expiresAt: Number(data.expires_at) || now + 3000,
  };
  return tokenCache.token;
}

export interface InitiateResult {
  ok: boolean;
  redirectUrl?: string;
  orderId?: string;
  error?: string;
}

/** Create a Standard Checkout payment and get the hosted-page redirect URL. */
export async function initiatePayment(input: {
  merchantOrderId: string;
  amountPaise: number;
  redirectUrl: string;
}): Promise<InitiateResult> {
  try {
    const token = await getToken();
    const res = await fetch(`${BASE}/checkout/v2/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${token}`,
      },
      body: JSON.stringify({
        merchantOrderId: input.merchantOrderId,
        amount: input.amountPaise,
        expireAfter: 1200,
        paymentFlow: {
          type: "PG_CHECKOUT",
          merchantUrls: { redirectUrl: input.redirectUrl },
        },
      }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      redirectUrl?: string;
      orderId?: string;
      message?: string;
      code?: string;
    };
    if (!res.ok || !data.redirectUrl) {
      return {
        ok: false,
        error: data.message || data.code || `Payment init failed (${res.status})`,
      };
    }
    return { ok: true, redirectUrl: data.redirectUrl, orderId: data.orderId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "PhonePe error" };
  }
}

export type PhonePeState = "COMPLETED" | "FAILED" | "PENDING" | "UNKNOWN";

export interface StatusResult {
  state: PhonePeState;
  transactionId?: string;
  amount?: number;
}

/** Authoritative payment status straight from PhonePe (never trust the redirect alone). */
export async function getOrderStatus(
  merchantOrderId: string,
): Promise<StatusResult> {
  try {
    const token = await getToken();
    const res = await fetch(
      `${BASE}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status`,
      { headers: { Authorization: `O-Bearer ${token}` }, cache: "no-store" },
    );
    const data = (await res.json().catch(() => ({}))) as {
      state?: PhonePeState;
      amount?: number;
      paymentDetails?: { transactionId?: string }[];
    };
    if (!res.ok) return { state: "UNKNOWN" };
    return {
      state: data.state ?? "UNKNOWN",
      transactionId: data.paymentDetails?.[0]?.transactionId,
      amount: data.amount,
    };
  } catch {
    return { state: "UNKNOWN" };
  }
}
