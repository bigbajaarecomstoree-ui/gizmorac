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

/**
 * Auth screen. On desktop it's a two-column split — a brand panel beside the
 * form — so the page fills the width instead of a lone centred card. On
 * mobile/tablet it collapses to just the centred form.
 */
export function AuthScreen({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  return (
    <div className="shell py-12 sm:py-16">
      {/* Card chrome only kicks in on desktop, where it becomes the split panel.
          On mobile/tablet this is a plain wrapper and the form keeps its own card. */}
      <div className="mx-auto grid max-w-5xl overflow-hidden lg:grid-cols-2 lg:rounded-2xl lg:border lg:border-border lg:bg-surface lg:shadow-sm">
        {/* brand panel — desktop only */}
        <div className="relative hidden flex-col justify-between bg-accent p-10 text-on-accent lg:flex">
          <Link href="/" className="flex items-center gap-2" aria-label="GIZMORAC home">
            <Image src="/logo.png" alt="" width={523} height={586} className="h-9 w-auto" />
            <span className="font-display text-xl font-bold tracking-tight">
              GIZMORAC
            </span>
          </Link>

          <div>
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight">
              {isSignup
                ? "Join GIZMORAC for a faster, smarter checkout."
                : "Welcome back to premium gadgets, built for India."}
            </h2>
            <p className="mt-3 max-w-sm text-sm text-on-accent/80">
              Track every order, save your addresses, claim member offers and
              check out in seconds.
            </p>
          </div>

          <ul className="space-y-3">
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

        {/* form */}
        <div className="lg:p-10">
          <AuthForm mode={mode} />
        </div>
      </div>
    </div>
  );
}
