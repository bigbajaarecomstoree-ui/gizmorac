import type { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { saveUpload, sniffMime } from "@/lib/storage";
import { limitByIp, rateLimit } from "@/lib/rate-limit";

// Customer-authenticated upload for support-ticket photo/video proof.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export async function POST(request: NextRequest) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return Response.json({ error: "Please log in." }, { status: 401 });
  }

  // A logged-in account (cheap to create) could otherwise loop 20MB uploads to
  // run up Blob storage/egress cost — bound it with a per-IP burst limit plus a
  // per-customer daily ceiling (no schema; Upstash counters).
  const burst = await limitByIp("upload", 10, 60);
  if (burst) return Response.json({ error: burst }, { status: 429 });
  const daily = await rateLimit(`upload-day:${customer.id}`, 40, 86400);
  if (!daily.allowed) {
    return Response.json(
      { error: "Daily upload limit reached. Please try again tomorrow." },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: "The file is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "File exceeds the 20MB limit." },
      { status: 413 },
    );
  }

  const ext = EXT[file.type];
  if (!ext) {
    return Response.json(
      { error: "Unsupported file. Use a photo (JPG, PNG, WebP) or video (MP4, MOV, WebM)." },
      { status: 415 },
    );
  }

  // Random server-generated name — never trust the client filename.
  const name = `proof-${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    // Validate the real bytes, not just the declared MIME — block disguised files.
    const sniffed = sniffMime(bytes);
    if (!sniffed || EXT[sniffed] === undefined) {
      return Response.json(
        { error: "The file's contents don't match an allowed type." },
        { status: 415 },
      );
    }
    const url = await saveUpload(name, bytes, file.type);
    return Response.json({ url });
  } catch {
    return Response.json(
      { error: "Could not save the file. Please try again." },
      { status: 500 },
    );
  }
}
