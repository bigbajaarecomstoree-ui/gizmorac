import {
  Sparkles,
  Zap,
  Bluetooth,
  Wifi,
  Usb,
  Smartphone,
  Printer,
  Camera,
  Headphones,
  BatteryCharging,
  Gauge,
  Droplets,
  Ruler,
  ShieldCheck,
  Truck,
  Timer,
  Volume2,
  type LucideIcon,
} from "lucide-react";

/** Pick a relevant icon for a benefit line by keyword — falls back to a spark. */
function iconFor(text: string): LucideIcon {
  const t = text.toLowerCase();
  const map: [RegExp, LucideIcon][] = [
    [/ink[- ]?free|ink/, Droplets],
    [/bluetooth/, Bluetooth],
    [/wi[- ]?fi|wireless/, Wifi],
    [/usb|type[- ]?c/, Usb],
    [/android|ios|iphone|phone|app|compatible/, Smartphone],
    [/print|dpi|label/, Printer],
    [/camera|lens|cam|recording|video|night vision/, Camera],
    [/mic|audio|noise|sound/, Volume2],
    [/headphone|earbud|earphone/, Headphones],
    [/battery|charge|charging|rechargeable/, BatteryCharging],
    [/fast|speed|quick|performance/, Gauge],
    [/size|mm|dimension|compact|portable|fold/, Ruler],
    [/warranty|guarantee|secure|protect/, ShieldCheck],
    [/ship|deliver|dispatch/, Truck],
    [/hour|day|time|instant/, Timer],
    [/power|watt|\bw\b/, Zap],
  ];
  for (const [re, icon] of map) if (re.test(t)) return icon;
  return Sparkles;
}

/**
 * Benefits-first layout: turns the product highlights into a scannable grid of
 * icon tiles ("people scan, nobody reads") instead of a plain bullet list.
 */
export function ProductBenefits({ highlights }: { highlights: string[] }) {
  if (highlights.length === 0) return null;
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">Why you&apos;ll love it</p>
      <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {highlights.map((h) => {
          const Icon = iconFor(h);
          return (
            <li
              key={h}
              className="flex items-start gap-3 rounded-xl border border-border bg-surface px-3.5 py-3"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                <Icon size={16} />
              </span>
              <span className="self-center text-sm leading-snug text-foreground">{h}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
