"use client";

import * as React from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import type { DeviceArt } from "@/lib/types";
import { ProductArt } from "./product-art";
import { Badge } from "@/components/ui/badge";
import { Tilt } from "@/components/ui/tilt";
import { cn } from "@/lib/utils";

const VIEWS = ["Front", "Detail", "In use", "Box"];

type Slide =
  | { kind: "image"; src: string }
  | { kind: "video"; src: string };

/** Sale/badge tags overlaid on the image — only render when there's something to show. */
function Tags({ off, badges }: { off: number; badges: string[] }) {
  if (off <= 0 && badges.length === 0) return null;
  return (
    <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col items-start gap-1.5">
      {off > 0 ? (
        <Badge variant="accent" className="font-semibold shadow-sm">
          {off}% OFF
        </Badge>
      ) : null}
      {badges.map((b) => (
        <Badge key={b} variant="soft" className="shadow-sm">
          {b}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Product gallery. Renders uploaded photos + an optional video when present,
 * otherwise falls back to the device illustration with a thumbnail strip.
 */
export function ProductGallery({
  art,
  name,
  images = [],
  video = null,
  off = 0,
  badges = [],
}: {
  art: DeviceArt;
  name?: string;
  images?: string[];
  video?: string | null;
  off?: number;
  badges?: string[];
}) {
  const slides: Slide[] = [
    ...images.map((src) => ({ kind: "image" as const, src })),
    ...(video ? [{ kind: "video" as const, src: video }] : []),
  ];
  const hasMedia = slides.length > 0;
  const [active, setActive] = React.useState(0);

  // --- Fallback: original illustration gallery ---
  if (!hasMedia) {
    return (
      <div className="flex flex-col gap-3">
        <Tilt className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface">
          <div
            key={active}
            className="animate-rise h-full w-full transition-transform duration-500 group-hover:scale-105"
          >
            <ProductArt
              art={art}
              glyphClassName={cn(
                active === 0 && "text-accent",
                active === 1 && "scale-125",
                active === 2 && "opacity-90",
                active === 3 && "scale-90",
              )}
            />
          </div>
          <Tags off={off} badges={badges} />
        </Tilt>

        <div className="grid grid-cols-4 gap-3">
          {VIEWS.map((v, i) => (
            <button
              key={v}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View ${v}`}
              aria-pressed={i === active}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg border bg-surface transition-colors cursor-pointer",
                i === active ? "border-accent" : "border-border hover:border-border-bright",
              )}
            >
              <ProductArt art={art} glyphClassName="!h-[36%]" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const current = slides[Math.min(active, slides.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      {current.kind === "image" ? (
        <Tilt className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface">
          <Image
            src={current.src}
            alt={name ?? "Product image"}
            fill
            priority
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-contain"
          />
          <Tags off={off} badges={badges} />
        </Tilt>
      ) : (
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface">
          <video
            src={current.src}
            controls
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            className="h-full w-full bg-black object-contain"
          />
          <Tags off={off} badges={badges} />
        </div>
      )}

      {slides.length > 1 ? (
        <div className="grid grid-cols-5 gap-3">
          {slides.map((s, i) => (
            <button
              key={s.src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={s.kind === "video" ? "View video" : `View image ${i + 1}`}
              aria-pressed={i === active}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg border bg-surface transition-colors cursor-pointer",
                i === active ? "border-accent" : "border-border hover:border-border-bright",
              )}
            >
              {s.kind === "image" ? (
                <Image src={s.src} alt="" fill sizes="80px" className="object-cover" />
              ) : (
                <>
                  <video src={s.src} className="h-full w-full bg-black object-cover" muted />
                  <span className="absolute inset-0 grid place-items-center bg-black/30 text-white">
                    <Play size={18} className="fill-white" />
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
