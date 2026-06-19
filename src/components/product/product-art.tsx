import {
  Printer,
  Gauge,
  PersonStanding,
  Eye,
  HeartPulse,
  Fingerprint,
  Keyboard,
  Usb,
  Zap,
  Wind,
  Smartphone,
  Webcam,
  Mouse,
  Laptop,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { DeviceArt } from "@/lib/types";
import { cn } from "@/lib/utils";

const GLYPH: Record<DeviceArt, LucideIcon> = {
  printer: Printer,
  inflator: Gauge,
  "knee-massager": PersonStanding,
  "eye-massager": Eye,
  "bp-monitor": HeartPulse,
  oximeter: Fingerprint,
  keyboard: Keyboard,
  "usb-hub": Usb,
  charger: Zap,
  vacuum: Wind,
  mount: Smartphone,
  webcam: Webcam,
  mouse: Mouse,
  stand: Laptop,
  "neck-massager": Waves,
};

/**
 * Placeholder product visual rendered as a precision "instrument module".
 * Swap this slot for <Image> when real product photography is available.
 */
export function ProductArt({
  art,
  className,
  glyphClassName,
}: {
  art: DeviceArt;
  className?: string;
  glyphClassName?: string;
}) {
  const Glyph = GLYPH[art] ?? Printer;
  return (
    <div
      className={cn(
        "relative grid h-full w-full place-items-center overflow-hidden bg-gradient-to-br from-surface-2 to-background",
        className,
      )}
      aria-hidden="true"
    >
      {/* instrument grid + ambient glow */}
      <div className="grid-ticks absolute inset-0 opacity-60" />
      <div className="glow-amber absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 opacity-70" />

      {/* corner registration ticks */}
      <span className="absolute left-3 top-3 h-3 w-3 border-l border-t border-border-bright" />
      <span className="absolute right-3 top-3 h-3 w-3 border-r border-t border-border-bright" />
      <span className="absolute bottom-3 left-3 h-3 w-3 border-b border-l border-border-bright" />
      <span className="absolute bottom-3 right-3 h-3 w-3 border-b border-r border-border-bright" />

      {/* power LED */}
      <span className="absolute right-4 top-4 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
      </span>

      <Glyph
        className={cn(
          "relative h-[42%] max-h-28 w-auto text-foreground/80 transition-colors duration-300",
          glyphClassName,
        )}
        strokeWidth={1.25}
      />
    </div>
  );
}
