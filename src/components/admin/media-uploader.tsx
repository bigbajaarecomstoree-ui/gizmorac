"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Film, X, Loader2, Star, AlertCircle } from "lucide-react";

const MAX_IMAGES = 7;
const MAX_BYTES = 20 * 1024 * 1024;

const IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

/** A file currently being uploaded, or one that failed (kept until dismissed). */
type UploadItem = {
  id: string;
  name: string;
  progress: number; // 0–100 (bytes sent)
  status: "uploading" | "error";
  error?: string;
};

function mb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** Catch the common problems on the client so the error is instant + specific. */
function preflight(file: File, kind: "image" | "video"): string | null {
  const allowed = kind === "video" ? VIDEO_TYPES : IMAGE_TYPES;
  if (file.size === 0) return "This file is empty.";
  if (!allowed.includes(file.type)) {
    return kind === "video"
      ? `Unsupported format${file.type ? ` (${file.type})` : ""} — use MP4, WebM or MOV.`
      : `Unsupported format${file.type ? ` (${file.type})` : ""} — use JPG, PNG, WebP, GIF or AVIF.`;
  }
  if (file.size > MAX_BYTES) {
    return `Too large (${mb(file.size)}) — the limit is 20MB.`;
  }
  return null;
}

/** POST via XHR so we can report real upload progress (fetch can't). */
function uploadWithProgress(
  file: File,
  kind: "image" | "video",
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      let data: { url?: string; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON response */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.url) {
        resolve(data.url);
      } else {
        reject(new Error(data.error ?? "Upload failed. Please try again."));
      }
    };
    xhr.onerror = () => reject(new Error("Network error — check your connection."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(fd);
  });
}

export function MediaUploader({
  defaultImages = [],
  defaultVideo = null,
}: {
  defaultImages?: string[];
  defaultVideo?: string | null;
}) {
  const [images, setImages] = React.useState<string[]>(defaultImages);
  const [video, setVideo] = React.useState<string | null>(defaultVideo);
  const [uploads, setUploads] = React.useState<UploadItem[]>([]);
  const [notice, setNotice] = React.useState<string | null>(null);
  const imgInput = React.useRef<HTMLInputElement>(null);
  const vidInput = React.useRef<HTMLInputElement>(null);
  // URLs uploaded in THIS session — safe to delete the blob if removed before
  // save. Pre-existing images are only unlinked (never deleted here).
  const sessionUploads = React.useRef<Set<string>>(new Set());

  const busy = uploads.some((u) => u.status === "uploading");

  function patch(id: string, next: Partial<UploadItem>) {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...next } : u)));
  }
  function dropRow(id: string) {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }

  /** Run one upload end-to-end, tracking it as a status row. */
  async function runUpload(
    file: File,
    kind: "image" | "video",
    onDone: (url: string) => void,
  ) {
    const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const problem = preflight(file, kind);
    if (problem) {
      setUploads((prev) => [
        ...prev,
        { id, name: file.name, progress: 0, status: "error", error: problem },
      ]);
      return;
    }

    setUploads((prev) => [
      ...prev,
      { id, name: file.name, progress: 0, status: "uploading" },
    ]);
    try {
      const url = await uploadWithProgress(file, kind, (pct) =>
        patch(id, { progress: pct }),
      );
      dropRow(id); // success → the thumbnail/preview is the confirmation
      onDone(url);
    } catch (err) {
      patch(id, {
        status: "error",
        error: err instanceof Error ? err.message : "Upload failed.",
      });
    }
  }

  async function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setNotice(null);

    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setNotice(`You can upload up to ${MAX_IMAGES} images.`);
      return;
    }
    const toUpload = files.slice(0, room);
    if (files.length > room) {
      setNotice(
        `Only ${room} more image${room === 1 ? "" : "s"} could be added (max ${MAX_IMAGES}).`,
      );
    }

    for (const file of toUpload) {
      await runUpload(file, "image", (url) => {
        sessionUploads.current.add(url);
        setImages((prev) => [...prev, url].slice(0, MAX_IMAGES));
      });
    }
  }

  async function onPickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setNotice(null);
    await runUpload(file, "video", (url) => setVideo(url));
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
    if (sessionUploads.current.has(url)) {
      sessionUploads.current.delete(url);
      fetch("/api/admin/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      }).catch(() => {}); // best-effort cleanup
    }
  }

  return (
    <div className="space-y-4">
      {/* hidden fields submitted with the product form */}
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="video" value={video ?? ""} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">
            Images <span className="font-normal text-faint">({images.length}/{MAX_IMAGES})</span>
          </span>
          <button
            type="button"
            onClick={() => imgInput.current?.click()}
            disabled={busy || images.length >= MAX_IMAGES}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-bright px-3 py-1.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent disabled:opacity-50 cursor-pointer"
          >
            <ImagePlus size={15} /> Add images
          </button>
          <input
            ref={imgInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            multiple
            hidden
            onChange={onPickImages}
          />
        </div>

        {images.length === 0 ? (
          <button
            type="button"
            onClick={() => imgInput.current?.click()}
            disabled={busy}
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-background py-10 text-sm text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-60 cursor-pointer"
          >
            <ImagePlus size={22} />
            Upload product photos (up to {MAX_IMAGES}, max 20MB each)
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((url, i) => (
              <div
                key={url}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-surface"
              >
                <Image src={url} alt="" fill sizes="120px" className="object-cover" />
                {i === 0 ? (
                  <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-[0.625rem] font-semibold text-on-accent">
                    <Star size={10} /> Main
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  aria-label="Remove image"
                  className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-background/90 text-foreground shadow transition-colors hover:bg-danger hover:text-white cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-faint">
          The first image is the main photo. JPG, PNG, WebP, GIF or AVIF.
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Video <span className="font-normal text-faint">(optional)</span></span>
          {!video ? (
            <button
              type="button"
              onClick={() => vidInput.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-bright px-3 py-1.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent disabled:opacity-50 cursor-pointer"
            >
              <Film size={15} /> Add video
            </button>
          ) : null}
          <input
            ref={vidInput}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            hidden
            onChange={onPickVideo}
          />
        </div>
        {video ? (
          <div className="relative overflow-hidden rounded-xl border border-border bg-black">
            <video src={video} controls className="max-h-64 w-full" />
            <button
              type="button"
              onClick={() => setVideo(null)}
              aria-label="Remove video"
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-background/90 text-foreground shadow transition-colors hover:bg-danger hover:text-white cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <p className="text-xs text-faint">MP4, WebM or MOV — max 20MB.</p>
        )}
      </div>

      {/* Per-file upload status: a progress bar while uploading, a specific
          error if the file was rejected (format/size/server). Successful
          uploads disappear here and show up as a thumbnail/preview above. */}
      {uploads.length > 0 ? (
        <ul className="space-y-2">
          {uploads.map((u) =>
            u.status === "uploading" ? (
              <li
                key={u.id}
                className="rounded-lg border border-border bg-surface px-3 py-2.5"
              >
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-foreground">
                    <Loader2 size={14} className="shrink-0 animate-spin text-accent" />
                    <span className="truncate">{u.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-xs text-muted">
                    {u.progress >= 100 ? "Finishing…" : `${u.progress}%`}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-200"
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
              </li>
            ) : (
              <li
                key={u.id}
                role="alert"
                className="flex items-start justify-between gap-3 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2.5"
              >
                <span className="flex min-w-0 items-start gap-2 text-sm">
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-danger" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{u.name}</span>
                    <span className="text-danger">{u.error}</span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => dropRow(u.id)}
                  aria-label="Dismiss"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-danger hover:text-white cursor-pointer"
                >
                  <X size={13} />
                </button>
              </li>
            ),
          )}
        </ul>
      ) : null}

      {notice ? (
        <p className="text-sm text-danger" role="alert">{notice}</p>
      ) : null}
    </div>
  );
}
