// PhonePe Standard Checkout v2 (OAuth) — server-only client.
// Docs: https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout
//
// Credentials are admin-managed (stored on the StoreSetting row) and fall back
// to env vars for first-run. The client secret must never be sent to a client
// bundle — only the server-side helpers below ever read it.

import { prisma } from "@/lib/prisma";
import { SETTINGS_ID } from "@/lib/data/settings";

export type PhonePeEnv = "sandbox" | "production";

export interface PhonePeConfig {
  clientId: string;
  clientVersion: string;
  clientSecret: string;
  /** Webhook Authorization secret PhonePe sends us — SHA256(user:pass). */
  webhookAuth: string;
  env: PhonePeEnv;
  connected: boolean;
  /** Has keys AND the admin has switched the gateway on. */
  configured: boolean;
}

function endpoints(env: PhonePeEnv) {
  const base =
    env === "production"
      ? "https://api.phonepe.com/apis/pg"
      : "https://api-preprod.phonepe.com/apis/pg-sandbox";
  const auth =
    env === "production"
      ? "https://api.phonepe.com/apis/identity-manager/v1/oauth/token"
      : "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";
  return { base, auth };
}

/**
 * Resolve PhonePe config: admin-saved values from the DB, falling back to env.
 * Server-only — `clientSecret` must not leak into client/storefront payloads.
 */
export async function getPhonePeConfig(): Promise<PhonePeConfig> {
  const row = await prisma.storeSetting
    .findUnique({ where: { id: SETTINGS_ID } })
    .catch(() => null);

  const envFallback: PhonePeEnv =
    process.env.PHONEPE_ENV === "production" ? "production" : "sandbox";

  const clientId = (row?.phonepeClientId || process.env.PHONEPE_CLIENT_ID || "").trim();
  const clientVersion =
    (row?.phonepeClientVersion || process.env.PHONEPE_CLIENT_VERSION || "1").trim() || "1";
  const clientSecret =
    (row?.phonepeClientSecret || process.env.PHONEPE_CLIENT_SECRET || "").trim();
  // Webhook secret: admin-saved value first, env var as fallback. Trimmed so a
  // stray newline in the env var can't silently break authentication.
  const webhookAuth =
    (row?.phonepeWebhookAuth || process.env.PHONEPE_WEBHOOK_AUTH || "").trim();
  const env: PhonePeEnv =
    row?.phonepeEnv === "production" || row?.phonepeEnv === "sandbox"
      ? row.phonepeEnv
      : envFallback;

  // The admin flag decides whether the gateway is on. Before the row exists,
  // treat env-provided keys as connected so a fresh deploy still works.
  const connected = row ? row.phonepeConnected : Boolean(clientId && clientSecret);
  const configured = connected && Boolean(clientId && clientSecret);

  return { clientId, clientVersion, clientSecret, webhookAuth, env, connected, configured };
}

// Cache the OAuth token per env+clientId (it lives ~ minutes/hours).
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getToken(cfg: PhonePeConfig): Promise<string> {
  const key = `${cfg.env}:${cfg.clientId}`;
  const now = Math.floor(Date.now() / 1000);
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt - 60 > now) return cached.token;

  const { auth } = endpoints(cfg.env);
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_version: cfg.clientVersion || "1",
    client_secret: cfg.clientSecret,
    grant_type: "client_credentials",
  });

  const res = await fetch(auth, {
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
  tokenCache.set(key, {
    token: data.access_token,
    expiresAt: Number(data.expires_at) || now + 3000,
  });
  return data.access_token;
}

export interface VerifyResult {
  ok: boolean;
  error?: string;
}

/**
 * Live-check a set of keys by attempting an OAuth token exchange, so the admin
 * gets confirmation the gateway is reachable before we switch it on.
 */
export async function verifyPhonePeKeys(input: {
  clientId: string;
  clientVersion: string;
  clientSecret: string;
  env: PhonePeEnv;
}): Promise<VerifyResult> {
  if (!input.clientId || !input.clientSecret) {
    return { ok: false, error: "Enter the Client ID and Client Secret." };
  }
  const { auth } = endpoints(input.env);
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_version: input.clientVersion || "1",
    client_secret: input.clientSecret,
    grant_type: "client_credentials",
  });
  try {
    const res = await fetch(auth, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        error_description?: string;
        code?: string;
      };
      const msg =
        data.message ||
        data.error_description ||
        data.code ||
        `Verification failed (${res.status}) — check your keys and environment.`;
      return { ok: false, error: String(msg) };
    }
    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) {
      return { ok: false, error: "No token returned — double-check your keys." };
    }
    // Prime the cache so the very next payment is fast.
    tokenCache.set(`${input.env}:${input.clientId}`, {
      token: data.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + 3000,
    });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not reach PhonePe.",
    };
  }
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
    const cfg = await getPhonePeConfig();
    if (!cfg.clientId || !cfg.clientSecret) {
      return { ok: false, error: "Payment gateway is not configured." };
    }
    const token = await getToken(cfg);
    const { base } = endpoints(cfg.env);
    const res = await fetch(`${base}/checkout/v2/pay`, {
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
  /** Friendly instrument the customer paid with (UPI / Card / Netbanking / Wallet). */
  instrument?: string;
  /** Best human reference: UPI UTR if present, else the transaction id. */
  reference?: string;
  /** Failure reason/code, when the payment failed. */
  error?: string;
}

/** Map PhonePe's payment mode to a friendly label for the customer. */
function friendlyInstrument(mode?: string): string {
  if (!mode) return "";
  const m = mode.toUpperCase();
  if (m.startsWith("UPI")) return "UPI";
  if (m.includes("CARD")) return "Card";
  if (m.includes("NET") && m.includes("BANK")) return "Netbanking";
  if (m.includes("WALLET")) return "Wallet";
  return mode;
}

/** Authoritative payment status straight from PhonePe (never trust the redirect alone). */
export async function getOrderStatus(
  merchantOrderId: string,
): Promise<StatusResult> {
  try {
    const cfg = await getPhonePeConfig();
    if (!cfg.clientId || !cfg.clientSecret) return { state: "UNKNOWN" };
    const token = await getToken(cfg);
    const { base } = endpoints(cfg.env);
    const res = await fetch(
      `${base}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status`,
      { headers: { Authorization: `O-Bearer ${token}` }, cache: "no-store" },
    );
    const data = (await res.json().catch(() => ({}))) as {
      state?: PhonePeState;
      amount?: number;
      errorCode?: string;
      detailedErrorCode?: string;
      paymentDetails?: {
        transactionId?: string;
        paymentMode?: string;
        errorCode?: string;
        detailedErrorCode?: string;
        rail?: { utr?: string; type?: string };
      }[];
    };
    if (!res.ok) return { state: "UNKNOWN" };
    const pd = data.paymentDetails?.[0];
    return {
      state: data.state ?? "UNKNOWN",
      transactionId: pd?.transactionId,
      amount: data.amount,
      instrument: friendlyInstrument(pd?.paymentMode),
      reference: pd?.rail?.utr || pd?.transactionId || "",
      error:
        data.detailedErrorCode ||
        data.errorCode ||
        pd?.detailedErrorCode ||
        pd?.errorCode ||
        "",
    };
  } catch {
    return { state: "UNKNOWN" };
  }
}

export interface RefundResult {
  ok: boolean;
  refundId?: string;
  state?: string;
  error?: string;
}

/** Initiate a refund for a previously-paid order. */
export async function initiateRefund(input: {
  merchantRefundId: string;
  merchantOrderId: string;
  amountPaise: number;
}): Promise<RefundResult> {
  try {
    const cfg = await getPhonePeConfig();
    if (!cfg.clientId || !cfg.clientSecret) {
      return { ok: false, error: "Payment gateway is not configured." };
    }
    const token = await getToken(cfg);
    const { base } = endpoints(cfg.env);
    const res = await fetch(`${base}/payments/v2/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${token}`,
      },
      body: JSON.stringify({
        merchantRefundId: input.merchantRefundId,
        originalMerchantOrderId: input.merchantOrderId,
        amount: input.amountPaise,
      }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      refundId?: string;
      state?: string;
      message?: string;
      code?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: data.message || data.code || `Refund failed (${res.status})`,
      };
    }
    return { ok: true, refundId: data.refundId, state: data.state };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Refund error" };
  }
}

export type RefundState = "Initiated" | "Completed" | "Failed";

/** Map PhonePe's refund state to our 3-state model. */
export function mapRefundState(state?: string): RefundState {
  const s = (state || "").toUpperCase();
  if (s === "COMPLETED" || s === "CONFIRMED") return "Completed";
  if (s === "FAILED") return "Failed";
  return "Initiated";
}

/** Check a refund's status straight from PhonePe. */
export async function getRefundStatus(
  merchantRefundId: string,
): Promise<{ state: RefundState | "UNKNOWN" }> {
  try {
    const cfg = await getPhonePeConfig();
    if (!cfg.clientId || !cfg.clientSecret) return { state: "UNKNOWN" };
    const token = await getToken(cfg);
    const { base } = endpoints(cfg.env);
    const res = await fetch(
      `${base}/payments/v2/refund/${encodeURIComponent(merchantRefundId)}/status`,
      { headers: { Authorization: `O-Bearer ${token}` }, cache: "no-store" },
    );
    const data = (await res.json().catch(() => ({}))) as { state?: string };
    if (!res.ok) return { state: "UNKNOWN" };
    return { state: mapRefundState(data.state) };
  } catch {
    return { state: "UNKNOWN" };
  }
}
