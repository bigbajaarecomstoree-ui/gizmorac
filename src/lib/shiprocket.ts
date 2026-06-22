// Shiprocket shipping integration — server-only client.
// Docs: https://apidocs.shiprocket.in
//
// Credentials (a dedicated Shiprocket API user) are admin-managed on the
// StoreSetting row, mirroring the PhonePe gateway. The password + auth token
// are server-only and must never reach a client bundle.

import { prisma } from "@/lib/prisma";
import { SETTINGS_ID } from "@/lib/data/settings";
import type { Order } from "@/lib/types";

const BASE = "https://apiv2.shiprocket.in/v1/external";

export interface ShiprocketConfig {
  email: string;
  password: string;
  pickup: string;
  pickupPin: string;
  connected: boolean;
  /** Has creds AND the admin has switched it on. */
  configured: boolean;
}

/** Read Shiprocket config from the DB (admin-managed). Server-only. */
export async function getShiprocketConfig(): Promise<ShiprocketConfig> {
  const row = await prisma.storeSetting
    .findUnique({ where: { id: SETTINGS_ID } })
    .catch(() => null);
  const email = (row?.shiprocketEmail || "").trim();
  const password = (row?.shiprocketPassword || "").trim();
  const connected = Boolean(row?.shiprocketConnected);
  return {
    email,
    password,
    pickup: (row?.shiprocketPickup || "").trim(),
    pickupPin: (row?.shiprocketPickupPin || "").trim(),
    connected,
    configured: connected && Boolean(email && password),
  };
}

/** Look up a pickup location's pincode by nickname (used at connect time). */
export async function fetchPickupPincode(
  nickname: string,
): Promise<string> {
  if (!nickname) return "";
  const token = await getToken();
  if (!token) return "";
  try {
    const res = await fetch(`${BASE}/settings/company/pickup`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      data?: { shipping_address?: { pickup_location?: string; pin_code?: string | number }[] };
    };
    const match = data.data?.shipping_address?.find(
      (a) => (a.pickup_location || "").toLowerCase() === nickname.toLowerCase(),
    );
    return match?.pin_code ? String(match.pin_code) : "";
  } catch {
    return "";
  }
}

export interface DeliveryEstimate {
  serviceable: boolean;
  days: number;
  etd: string;
  codAvailable: boolean;
}

/** Check courier serviceability + ETA for a delivery pincode. */
export async function checkServiceability(input: {
  deliveryPincode: string;
  weight?: number;
  cod?: boolean;
}): Promise<DeliveryEstimate | null> {
  const cfg = await getShiprocketConfig();
  if (!cfg.configured || !cfg.pickupPin) return null;
  if (!/^\d{6}$/.test(input.deliveryPincode)) return null;

  const token = await getToken();
  if (!token) return null;
  try {
    const qs = new URLSearchParams({
      pickup_postcode: cfg.pickupPin,
      delivery_postcode: input.deliveryPincode,
      weight: String(input.weight ?? 0.5),
      cod: input.cod ? "1" : "0",
    });
    const res = await fetch(`${BASE}/courier/serviceability/?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      data?: {
        available_courier_companies?: {
          estimated_delivery_days?: string | number;
          etd?: string;
          cod?: number;
        }[];
      };
    };
    const couriers = data.data?.available_courier_companies ?? [];
    if (couriers.length === 0) {
      return { serviceable: false, days: 0, etd: "", codAvailable: false };
    }
    // Fastest available option drives the headline ETA.
    const fastest = couriers.reduce((best, c) => {
      const d = Number(c.estimated_delivery_days) || 99;
      const b = Number(best.estimated_delivery_days) || 99;
      return d < b ? c : best;
    });
    return {
      serviceable: true,
      days: Number(fastest.estimated_delivery_days) || 0,
      etd: fastest.etd || "",
      codAvailable: couriers.some((c) => Number(c.cod) === 1),
    };
  } catch {
    return null;
  }
}

export interface ShiprocketAuth {
  ok: boolean;
  token?: string;
  error?: string;
}

/** Log in with API-user credentials to get a bearer token. */
export async function shiprocketLogin(
  email: string,
  password: string,
): Promise<ShiprocketAuth> {
  if (!email || !password) {
    return { ok: false, error: "Enter the Shiprocket API email and password." };
  }
  try {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      token?: string;
      message?: string;
    };
    if (!res.ok || !data.token) {
      return {
        ok: false,
        error: data.message || `Login failed (${res.status}) — check the API user.`,
      };
    }
    return { ok: true, token: data.token };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not reach Shiprocket." };
  }
}

/** Verify credentials without persisting anything (used by the Connect button). */
export async function verifyShiprocket(input: {
  email: string;
  password: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await shiprocketLogin(input.email, input.password);
  return { ok: res.ok, error: res.error };
}

/**
 * Get a valid auth token, reusing the DB-cached one until it nears expiry,
 * else logging in fresh and caching it (Shiprocket tokens live ~10 days).
 */
async function getToken(): Promise<string | null> {
  const row = await prisma.storeSetting.findUnique({ where: { id: SETTINGS_ID } });
  if (!row?.shiprocketEmail || !row?.shiprocketPassword) return null;

  const now = Date.now();
  if (
    row.shiprocketToken &&
    row.shiprocketTokenExp &&
    row.shiprocketTokenExp.getTime() - 60_000 > now
  ) {
    return row.shiprocketToken;
  }

  const auth = await shiprocketLogin(row.shiprocketEmail, row.shiprocketPassword);
  if (!auth.ok || !auth.token) return null;

  await prisma.storeSetting.update({
    where: { id: SETTINGS_ID },
    data: {
      shiprocketToken: auth.token,
      // Tokens are valid ~10 days; refresh a day early to be safe.
      shiprocketTokenExp: new Date(now + 9 * 24 * 60 * 60 * 1000),
    },
  });
  return auth.token;
}

export interface CreateShipmentResult {
  ok: boolean;
  shiprocketOrderId?: string;
  shipmentId?: string;
  status?: string;
  error?: string;
}

/**
 * Build a package from each product's own dimensions: total weight, widest
 * L/B, and stacked height. Falls back to a sensible default when a product
 * record is missing dims.
 */
async function computePackage(order: Order): Promise<{
  weight: number;
  length: number;
  breadth: number;
  height: number;
}> {
  const dims = await prisma.product.findMany({
    where: { id: { in: order.items.map((i) => i.id) } },
    select: { id: true, weightKg: true, lengthCm: true, breadthCm: true, heightCm: true },
  });
  const dimById = new Map(dims.map((d) => [d.id, d]));
  let weight = 0;
  let length = 1;
  let breadth = 1;
  let height = 0;
  for (const it of order.items) {
    const d = dimById.get(it.id) ?? {
      weightKg: 0.5,
      lengthCm: 15,
      breadthCm: 12,
      heightCm: 5,
    };
    weight += d.weightKg * it.qty;
    length = Math.max(length, d.lengthCm);
    breadth = Math.max(breadth, d.breadthCm);
    height += d.heightCm * it.qty;
  }
  weight = Math.max(0.1, Math.round(weight * 100) / 100);
  return { weight, length, breadth, height };
}

/** Push an order into Shiprocket (adhoc order) so it can be shipped. */
export async function createShiprocketOrder(
  order: Order,
  opts?: { orderIdSuffix?: string },
): Promise<CreateShipmentResult> {
  const cfg = await getShiprocketConfig();
  if (!cfg.configured) return { ok: false, error: "Shiprocket is not connected." };
  if (!cfg.pickup) return { ok: false, error: "Set a pickup location in Settings first." };

  const token = await getToken();
  if (!token) return { ok: false, error: "Could not authenticate with Shiprocket." };

  const orderDate = new Date(order.createdAt)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");

  const { weight, length, breadth, height } = await computePackage(order);

  const payload = {
    order_id: `${order.orderNumber}${opts?.orderIdSuffix ?? ""}`,
    order_date: orderDate,
    pickup_location: cfg.pickup,
    billing_customer_name: order.firstName,
    billing_last_name: order.lastName,
    billing_address: order.address,
    billing_city: order.city,
    billing_pincode: order.pincode,
    billing_state: order.state,
    billing_country: "India",
    billing_email: order.email,
    billing_phone: order.phone,
    shipping_is_billing: true,
    order_items: order.items.map((i) => ({
      name: i.name,
      // Shiprocket caps SKU at 70 chars; slugs can be longer.
      sku: (i.slug || i.id).slice(0, 70),
      units: i.qty,
      selling_price: i.price,
    })),
    payment_method: order.paymentMethod === "COD" ? "COD" : "Prepaid",
    sub_total: order.total,
    length,
    breadth,
    height,
    weight,
  };

  try {
    const res = await fetch(`${BASE}/orders/create/adhoc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      order_id?: number | string;
      shipment_id?: number | string;
      status?: string;
      message?: string;
      errors?: unknown;
    };
    if (!res.ok || !data.order_id) {
      return {
        ok: false,
        error:
          data.message ||
          (data.errors ? JSON.stringify(data.errors).slice(0, 200) : "") ||
          `Shiprocket order failed (${res.status})`,
      };
    }
    return {
      ok: true,
      shiprocketOrderId: String(data.order_id),
      shipmentId: data.shipment_id ? String(data.shipment_id) : "",
      status: data.status || "NEW",
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Shiprocket error" };
  }
}

export interface TrackingResult {
  status: string;
  awb: string;
  courier: string;
  trackingUrl: string;
}

/** Fetch live tracking for a shipment id. */
export async function getTracking(
  shipmentId: string,
): Promise<TrackingResult | null> {
  if (!shipmentId) return null;
  const token = await getToken();
  if (!token) return null;
  try {
    const res = await fetch(
      `${BASE}/courier/track/shipment/${encodeURIComponent(shipmentId)}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    const data = (await res.json().catch(() => ({}))) as {
      tracking_data?: {
        track_status?: number;
        shipment_status?: number;
        shipment_track?: {
          current_status?: string;
          courier_name?: string;
          awb_code?: string;
        }[];
        track_url?: string;
      };
    };
    if (!res.ok) return null;
    const td = data.tracking_data;
    const t = td?.shipment_track?.[0];
    return {
      status: t?.current_status || "",
      awb: t?.awb_code || "",
      courier: t?.courier_name || "",
      trackingUrl: td?.track_url || "",
    };
  } catch {
    return null;
  }
}

export interface ShipResult {
  ok: boolean;
  awb?: string;
  courier?: string;
  labelUrl?: string;
  error?: string;
}

/**
 * One-click fulfilment for a created shipment: assign the recommended courier
 * (AWB), schedule the pickup, and generate the shipping label. Pickup is
 * best-effort (a soft failure there doesn't void the AWB/label).
 */
export async function shipShipment(shipmentId: string): Promise<ShipResult> {
  if (!shipmentId) return { ok: false, error: "Missing shipment id." };
  const token = await getToken();
  if (!token) return { ok: false, error: "Could not authenticate with Shiprocket." };
  const auth = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const sid = Number(shipmentId);

  try {
    // 1) Assign courier + AWB (Shiprocket picks the recommended courier).
    const awbRes = await fetch(`${BASE}/courier/assign/awb`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ shipment_id: sid }),
      cache: "no-store",
    });
    const awbData = (await awbRes.json().catch(() => ({}))) as {
      awb_assign_status?: number;
      response?: { data?: { awb_code?: string; courier_name?: string } };
      message?: string;
    };
    const awb = awbData.response?.data?.awb_code || "";
    const courier = awbData.response?.data?.courier_name || "";
    if (!awbRes.ok || !awb) {
      return {
        ok: false,
        error:
          awbData.message ||
          "Couldn't assign a courier (often a pending KYC or low Shiprocket wallet balance).",
      };
    }

    // 2) Schedule pickup (best-effort).
    await fetch(`${BASE}/courier/generate/pickup`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ shipment_id: [sid] }),
      cache: "no-store",
    }).catch(() => {});

    // 3) Generate the shipping label.
    let labelUrl = "";
    const labelRes = await fetch(`${BASE}/courier/generate/label`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ shipment_id: [sid] }),
      cache: "no-store",
    });
    const labelData = (await labelRes.json().catch(() => ({}))) as {
      label_created?: number;
      label_url?: string;
    };
    if (labelRes.ok) labelUrl = labelData.label_url || "";

    return { ok: true, awb, courier, labelUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Shiprocket error" };
  }
}

/**
 * Generate one combined label PDF for many shipments at once. Shiprocket
 * returns a single `label_url` covering every shipment id passed — used by the
 * admin bulk "download all labels" action.
 */
export async function generateLabels(
  shipmentIds: string[],
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const ids = shipmentIds.map((s) => Number(s)).filter((n) => n > 0);
  if (ids.length === 0) return { ok: false, error: "No shipments with labels yet." };
  const token = await getToken();
  if (!token) return { ok: false, error: "Could not authenticate with Shiprocket." };
  try {
    const res = await fetch(`${BASE}/courier/generate/label`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ shipment_id: ids }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      label_created?: number;
      label_url?: string;
      message?: string;
    };
    if (!res.ok || !data.label_url) {
      return { ok: false, error: data.message || "Couldn't generate the labels." };
    }
    return { ok: true, url: data.label_url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Shiprocket error" };
  }
}

export interface CancelResult {
  ok: boolean;
  error?: string;
}

/**
 * Cancel an order in Shiprocket. When an AWB has already been assigned, the
 * shipment is cancelled first — for a parcel that hasn't been picked up yet,
 * that releases the AWB and refunds the freight to the Shiprocket wallet. The
 * order is then cancelled. A missing Shiprocket order is treated as success
 * (nothing to cancel). We only report failure if the order cancel call fails.
 */
export async function cancelShiprocketOrder(input: {
  shiprocketOrderId: string;
  awb?: string;
}): Promise<CancelResult> {
  const { shiprocketOrderId, awb } = input;
  if (!shiprocketOrderId) return { ok: true };

  const token = await getToken();
  if (!token) return { ok: false, error: "Could not authenticate with Shiprocket." };
  const auth = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  try {
    // 1) Cancel the shipment if an AWB exists — refunds freight to the wallet
    //    for shipments that haven't been picked up. Best-effort.
    if (awb) {
      await fetch(`${BASE}/orders/cancel/shipment/awbs`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ awbs: [awb] }),
        cache: "no-store",
      }).catch(() => {});
    }

    // 2) Cancel the order itself.
    const res = await fetch(`${BASE}/orders/cancel`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ ids: [Number(shiprocketOrderId)] }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (!res.ok) {
      return { ok: false, error: data.message || `Shiprocket cancel failed (${res.status})` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Shiprocket error" };
  }
}

export interface PickupAddress {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
}

/** Fetch a pickup location's full address — the warehouse / return-to address. */
export async function fetchPickupAddress(
  nickname: string,
): Promise<PickupAddress | null> {
  if (!nickname) return null;
  const token = await getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${BASE}/settings/company/pickup`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      data?: {
        shipping_address?: {
          pickup_location?: string;
          name?: string;
          address?: string;
          city?: string;
          state?: string;
          pin_code?: string | number;
          phone?: string | number;
          email?: string;
        }[];
      };
    };
    const a = data.data?.shipping_address?.find(
      (x) => (x.pickup_location || "").toLowerCase() === nickname.toLowerCase(),
    );
    if (!a) return null;
    return {
      name: a.name || nickname,
      address: a.address || "",
      city: a.city || "",
      state: a.state || "",
      pincode: a.pin_code ? String(a.pin_code) : "",
      phone: a.phone ? String(a.phone) : "",
      email: a.email || "",
    };
  } catch {
    return null;
  }
}

/**
 * Create a RETURN order in Shiprocket: a reverse pickup from the customer's
 * address back to the warehouse. Used by the replacement flow to collect the
 * faulty unit.
 */
export async function createReturnOrder(
  order: Order,
): Promise<CreateShipmentResult> {
  const cfg = await getShiprocketConfig();
  if (!cfg.configured) return { ok: false, error: "Shiprocket is not connected." };
  if (!cfg.pickup) return { ok: false, error: "Set a pickup location in Settings first." };

  const token = await getToken();
  if (!token) return { ok: false, error: "Could not authenticate with Shiprocket." };

  const wh = await fetchPickupAddress(cfg.pickup);
  if (!wh || !wh.pincode) {
    return { ok: false, error: "Couldn't read the warehouse address from Shiprocket pickup settings." };
  }

  const { weight, length, breadth, height } = await computePackage(order);
  const orderDate = new Date().toISOString().slice(0, 16).replace("T", " ");

  const payload = {
    order_id: `${order.orderNumber}-RET`,
    order_date: orderDate,
    channel_id: "",
    // Pickup = the customer (we collect the faulty unit from them).
    pickup_customer_name: order.firstName,
    pickup_last_name: order.lastName,
    pickup_address: order.address,
    pickup_city: order.city,
    pickup_state: order.state,
    pickup_country: "India",
    pickup_pincode: order.pincode,
    pickup_email: order.email,
    pickup_phone: order.phone,
    // Ship-to = the warehouse (return destination).
    shipping_customer_name: wh.name,
    shipping_last_name: "",
    shipping_address: wh.address,
    shipping_city: wh.city,
    shipping_country: "India",
    shipping_pincode: wh.pincode,
    shipping_state: wh.state,
    shipping_email: wh.email || order.email,
    shipping_phone: wh.phone || order.phone,
    order_items: order.items.map((i) => ({
      name: i.name,
      qc_enable: false,
      // Shiprocket caps SKU at 70 chars; slugs can be longer.
      sku: (i.slug || i.id).slice(0, 70),
      units: i.qty,
      selling_price: i.price,
    })),
    payment_method: "PREPAID",
    sub_total: order.total,
    length,
    breadth,
    height,
    weight,
  };

  try {
    const res = await fetch(`${BASE}/orders/create/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      order_id?: number | string;
      shipment_id?: number | string;
      status?: string;
      message?: string;
      errors?: unknown;
    };
    if (!res.ok || !data.order_id) {
      return {
        ok: false,
        error:
          data.message ||
          (data.errors ? JSON.stringify(data.errors).slice(0, 200) : "") ||
          `Return order failed (${res.status})`,
      };
    }
    return {
      ok: true,
      shiprocketOrderId: String(data.order_id),
      shipmentId: data.shipment_id ? String(data.shipment_id) : "",
      status: data.status || "RETURN",
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Shiprocket error" };
  }
}

/**
 * Assign a reverse courier (AWB) to a return shipment and schedule the pickup
 * from the customer. Pickup is best-effort. No label is generated — the
 * courier brings/prints the reverse label for a return.
 */
export async function shipReturn(shipmentId: string): Promise<ShipResult> {
  if (!shipmentId) return { ok: false, error: "Missing return shipment id." };
  const token = await getToken();
  if (!token) return { ok: false, error: "Could not authenticate with Shiprocket." };
  const auth = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const sid = Number(shipmentId);

  try {
    const awbRes = await fetch(`${BASE}/courier/assign/awb`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ shipment_id: sid, is_return: 1 }),
      cache: "no-store",
    });
    const awbData = (await awbRes.json().catch(() => ({}))) as {
      response?: { data?: { awb_code?: string; courier_name?: string } };
      message?: string;
    };
    const awb = awbData.response?.data?.awb_code || "";
    const courier = awbData.response?.data?.courier_name || "";
    if (!awbRes.ok || !awb) {
      return {
        ok: false,
        error:
          awbData.message ||
          "Couldn't assign a reverse courier (often a pending KYC or low wallet balance).",
      };
    }

    await fetch(`${BASE}/courier/generate/pickup`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ shipment_id: [sid] }),
      cache: "no-store",
    }).catch(() => {});

    return { ok: true, awb, courier };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Shiprocket error" };
  }
}
