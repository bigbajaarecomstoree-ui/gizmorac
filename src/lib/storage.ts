import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// Persists an uploaded file and returns its public URL.
//
// - Production (Vercel): if BLOB_READ_WRITE_TOKEN is set, store on Vercel Blob
//   so uploads survive redeploys (the serverless filesystem is ephemeral).
// - Local dev: write to /public/uploads so it works with zero config.
export async function saveUpload(
  name: string,
  bytes: Buffer,
  contentType: string,
): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${name}`, bytes, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return `/uploads/${name}`;
}

/**
 * Detect a file's real type from its magic bytes — never trust the client's
 * declared Content-Type. Returns the detected MIME, or "" if unrecognised.
 */
export function sniffMime(buf: Buffer): string {
  const b = buf.subarray(0, 16);
  const sig = (...n: number[]) => n.every((v, i) => b[i] === v);
  const ascii = (off: number, s: string) =>
    [...s].every((c, i) => b[off + i] === c.charCodeAt(0));

  if (sig(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (sig(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (ascii(0, "GIF8")) return "image/gif";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  if (sig(0x1a, 0x45, 0xdf, 0xa3)) return "video/webm";
  if (ascii(4, "ftyp")) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (brand.startsWith("avi")) return "image/avif"; // avif / avis
    if (brand.startsWith("qt")) return "video/quicktime";
    return "video/mp4"; // isom / mp41 / mp42 / iso5 / dash …
  }
  return "";
}

/**
 * Best-effort delete of a previously uploaded file. Only Vercel Blob URLs are
 * removed (local /uploads files are left on the read-only prod FS). Never throws
 * — a failed cleanup must not block the admin action.
 */
export async function deleteUpload(url: string): Promise<void> {
  if (!url) return;
  if (
    process.env.BLOB_READ_WRITE_TOKEN &&
    url.includes(".public.blob.vercel-storage.com")
  ) {
    try {
      const { del } = await import("@vercel/blob");
      await del(url);
    } catch {
      // swallow — orphaned-blob cleanup is non-critical
    }
  }
}
