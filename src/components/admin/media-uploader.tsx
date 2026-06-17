"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Film, X, Loader2, Star } from "lucide-react";

const MAX_IMAGES = 7;
const MAX_BYTES = 20 * 1024 * 1024;

async function upload(file: File, kind: "image" | "video"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Upload failed.");
  return data.url as string;
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
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const imgInput = React.useRef<HTMLInputElement>(null);
  const vidInput = React.useRef<HTMLInputElement>(null);

  async function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);

    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setError(`You can upload up to ${MAX_IMAGES} images.`);
      return;
    }
    const toUpload = files.slice(0, room);

    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of toUpload) {
        if (f.size > MAX_BYTES) throw new Error(`${f.name} exceeds 20MB.`);
        urls.push(await upload(f, "image"));
      }
      setImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES));
      if (files.length > room) {
        setError(`Only ${room} more image${room === 1 ? "" : "s"} could be added (max ${MAX_IMAGES}).`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onPickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) {
      setError(`${file.name} exceeds 20MB.`);
      return;
    }
    setBusy(true);
    try {
      setVideo(await upload(file, "video"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
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
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-background py-10 text-sm text-muted transition-colors hover:border-accent hover:text-accent cursor-pointer"
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

      {busy ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={15} className="animate-spin" /> Uploading…
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-danger" role="alert">{error}</p>
      ) : null}
    </div>
  );
}
