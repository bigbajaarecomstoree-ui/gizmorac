// At-rest encryption for sensitive PII — bank accounts / UPI IDs (DPDP §13).
// AES-256-GCM with a key derived from POSTORDER_ENC_KEY. Format:
//   v1:<iv b64>:<authTag b64>:<ciphertext b64>

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, "gizmorac-postorder-dpdp", 32);
}

function getSecret(explicit?: string): string {
  const s = explicit ?? process.env.POSTORDER_ENC_KEY ?? "";
  if (!s) throw new Error("POSTORDER_ENC_KEY is not set — cannot encrypt PII.");
  return s;
}

export function encryptSecret(plaintext: string, secret?: string): string {
  const key = deriveKey(getSecret(secret));
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptSecret(blob: string, secret?: string): string {
  const [v, ivB64, tagB64, dataB64] = blob.split(":");
  if (v !== "v1") throw new Error("Unrecognised ciphertext format.");
  const key = deriveKey(getSecret(secret));
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

/** Mask a sensitive value for display/logs, e.g. UPI "abc***@oksbi", acct "****1234". */
export function maskSecret(value: string): string {
  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return value.length <= 4 ? "****" : `****${value.slice(-4)}`;
}
