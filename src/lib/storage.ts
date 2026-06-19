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
