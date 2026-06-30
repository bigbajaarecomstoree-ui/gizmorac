import Link from "next/link";
import Image from "next/image";
import { Truck, ShieldCheck, RotateCcw, Banknote } from "lucide-react";
import { AuthForm } from "./auth-form";

const POINTS = [
  { icon: Truck, label: "Fast PAN-India shipping" },
  { icon: Banknote, label: "Cash on Delivery available" },
  { icon: RotateCcw, label: "7-day easy replacement" },
  { icon: ShieldCheck, label: "Secure, verified checkout" },
];

/** Faint abstract shapes + radial glow that give the brand panel subtle depth. */
function PanelDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-on-accent/10 blur-2xl" />
      <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-on-accent/[0.06] blur-3xl" />
      <div className="absolute right-10 top-24 h-40 w-40 rounded-full border border-on-accent/10" />
      <div className="absolute -right-8 bottom-28 h-24 w-24 rounded-full border border-on-accent/10" />
    </div>
  );
}

/**
 * Auth screen. Desktop is a two-column split — a brand panel beside the form.
 * Mobile gets a compact purple hero (with the trust points) above the form.
 */
export function AuthScreen({
  mode,
  next = "",
}: {
  mode: "login" | "signup";
  next?: string;
}) {
  const isSignup = mode === "signup";
  const heading = isSignup
    ? "Join GIZMORAC for a faster, smarter checkout."
    : "Track orders, manage warranties, and shop faster.";
  const sub =
    "Sign in to track your orders, save addresses, manage warranties, and enjoy a faster checkout.";

  return (
    <div className="shell py-12 sm:py-16">
      <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-2 lg:gap-0 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-border lg:bg-surface lg:shadow-sm">
        {/* brand panel — desktop only */}
        <div className="relative hidden flex-col justify-between bg-accent p-10 text-on-accent lg:flex">
          <PanelDecor />
          <Link href="/" className="relative z-10 flex items-center gap-2" aria-label="GIZMORAC home">
            <span className="absolute -left-3 -top-3 h-12 w-12 rounded-full bg-on-accent/20 blur-xl" />
            <Image src="/logo.png" alt="" width={523} height={586} className="relative h-9 w-auto" />
            <span className="relative font-display text-xl font-bold tracking-tight">GIZMORAC</span>
          </Link>

          <div className="relative z-10">
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight">
              {heading}
            </h2>
            <p className="mt-3 max-w-sm text-sm text-on-accent/80">{sub}</p>
          </div>

          <ul className="relative z-10 space-y-3">
            {POINTS.map((p) => (
              <li key={p.label} className="flex items-center gap-3 text-sm font-medium">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-on-accent/15">
                  <p.icon size={16} />
                </span>
                {p.label}
              </li>
            ))}
          </ul>
        </div>

        {/* compact hero — mobile only */}
        <div className="relative overflow-hidden rounded-2xl bg-accent p-5 text-on-accent lg:hidden">
          <PanelDecor />
          <p className="relative z-10 font-display text-lg font-bold leading-snug">{heading}</p>
          <div className="relative z-10 mt-3 grid grid-cols-2 gap-2">
            {POINTS.map((p) => (
              <span key={p.label} className="flex items-center gap-1.5 text-xs font-medium text-on-accent/90">
                <p.icon size={13} className="shrink-0" />
                {p.label}
              </span>
            ))}
          </div>
        </div>

        {/* form */}
        <div className="lg:p-10">
          <AuthForm mode={mode} next={next} />
        </div>
      </div>
    </div>
  );
}
