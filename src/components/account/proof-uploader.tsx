"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, X, Loader2 } from "lucide-react";

const MAX = 6;
const MAX_BYTES = 20 * 1024 * 1024;

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

/**
 * Photo/video proof uploader. Controlled — owns no copy of the list. When
 * `name` is set it also emits a hidden input (JSON) so it can ride along a
 * <form> server action; controlled usage (server actions called directly) can
 * leave `name` unset.
 */
export function ProofUploader({
  endpoint,
  value,
  onChange,
  name,
}: {
  endpoint: string;
  value: string[];
  onChange: (urls: string[]) => void;
  name?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const input = React.useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);

    const room = MAX - value.length;
    if (room <= 0) {
      setError(`You can attach up to ${MAX} files.`);
      return;
    }

    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of files.slice(0, room)) {
        if (f.size > MAX_BYTES) throw new Error(`${f.name} exceeds 20MB.`);
        const fd = new FormData();
        fd.append("file", f);
        fd.append("kind", f.type.startsWith("video") ? "video" : "image");
        const res = await fetch(endpoint, { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Upload failed.");
        urls.push(data.url as string);
      }
      onChange([...value, ...urls].slice(0, MAX));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {name ? <input type="hidden" name={name} value={JSON.stringify(value)} /> : null}
      <div className="flex flex-wrap gap-2">
        {value.map((url) => (
          <div
            key={url}
            className="relative h-16 w-16 overflow-hidden rounded-lg border border-border bg-surface-2"
          >
            {isVideoUrl(url) ? (
              <video src={url} className="h-full w-full object-cover" muted />
            ) : (
              <Image src={url} alt="proof" fill sizes="64px" className="object-cover" />
            )}
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              aria-label="Remove"
              className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-background/90 text-foreground shadow transition-colors hover:bg-danger hover:text-white cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {value.length < MAX ? (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-border text-faint transition-colors hover:border-accent hover:text-accent disabled:opacity-50 cursor-pointer"
            aria-label="Add photo or video"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          </button>
        ) : null}
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime"
          multiple
          hidden
          onChange={onPick}
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
