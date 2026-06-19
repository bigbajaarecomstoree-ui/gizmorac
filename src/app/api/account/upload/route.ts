import type { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { saveUpload } from "@/lib/storage";

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
    const url = await saveUpload(name, bytes, file.type);
    return Response.json({ url });
  } catch {
    return Response.json(
      { error: "Could not save the file. Please try again." },
      { status: 500 },
    );
  }
}
