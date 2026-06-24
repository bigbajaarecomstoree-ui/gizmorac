// Production environment guards. The goal is to make an unsafe payment
// configuration impossible to ship by accident.

import type { PhonePeEnv } from "@/lib/phonepe";

/** True when this deployment is the live production environment. */
export function isProductionDeploy(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

/**
 * Whether it is safe to take real online payments here. In production a sandbox
 * gateway is refused unless ALLOW_SANDBOX_IN_PROD=true is set explicitly (for an
 * intentional dry-run), so a customer can never be sent through a sandbox flow
 * thinking it's real money.
 */
export function paymentsProductionSafe(phonepeEnv: PhonePeEnv): boolean {
  if (!isProductionDeploy()) return true; // dev / preview: sandbox is expected
  if (phonepeEnv === "production") return true;
  return process.env.ALLOW_SANDBOX_IN_PROD === "true";
}
