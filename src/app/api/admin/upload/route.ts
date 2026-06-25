import type { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { isAuthenticated } from "@/lib/auth";
import { saveUpload, deleteUpload, sniffMime } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};
const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  const kind = (form.get("kind") ?? "image").toString();

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

  const allowed = kind === "video" ? VIDEO_EXT : IMAGE_EXT;
  const ext = allowed[file.type];
  if (!ext) {
    return Response.json(
      {
        error:
          kind === "video"
            ? "Unsupported video type. Use MP4, WebM or MOV."
            : "Unsupported image type. Use JPG, PNG, WebP, GIF or AVIF.",
      },
      { status: 415 },
    );
  }

  // Random server-generated name — never trust the client filename (path traversal).
  const name = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    // Validate the real bytes, not just the declared MIME — block disguised files.
    const sniffed = sniffMime(bytes);
    if (!sniffed || allowed[sniffed] === undefined) {
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

/** Delete an uploaded Blob (admin-gated; only Blob URLs are removable). */
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let url = "";
  try {
    url = (((await request.json()) as { url?: string }).url ?? "").toString();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  await deleteUpload(url); // best-effort, never throws
  return Response.json({ ok: true });
}
