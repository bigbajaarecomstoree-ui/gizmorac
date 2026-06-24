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
