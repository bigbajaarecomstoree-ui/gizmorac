import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Truck, RotateCcw, Headset } from "lucide-react";
import type { Category } from "@/lib/types";
import { policies } from "@/lib/data/policies";
import { WHATSAPP_LINK } from "@/lib/constants";

const TRUST = [
  { icon: Truck, label: "PAN India shipping" },
  { icon: ShieldCheck, label: "Secure checkout" },
  { icon: RotateCcw, label: "7-day replacement" },
  { icon: Headset, label: "WhatsApp support" },
];

export function SiteFooter({
  whatsappHref = WHATSAPP_LINK,
  supportEmail,
  supportPhone,
  categories = [],
}: {
  whatsappHref?: string;
  supportEmail?: string;
  supportPhone?: string;
  categories?: Category[];
} = {}) {
  return (
    <footer className="mt-10 border-t border-border bg-surface/40 sm:mt-16">
      <div className="shell">
        <div className="grid grid-cols-2 gap-4 border-b border-border py-10 sm:grid-cols-4">
          {TRUST.map((t) => (
            <div key={t.label} className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-surface text-accent">
                <t.icon size={18} />
              </span>
              <span className="text-sm text-muted">{t.label}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-1">
              <Image
                src="/logo.png"
                alt=""
                width={523}
                height={586}
                className="h-9 w-auto object-contain"
              />
              <span className="font-display text-lg font-bold tracking-tight">
                GIZMO<span className="text-accent">RAC</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Premium gadgets designed for productivity, health, travel and
              everyday convenience — tested and shipped across India.
            </p>
          </div>

          <div>
            <h4 className="tech-label mb-4">Shop</h4>
            <ul className="space-y-2.5 text-sm">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/shop?category=${c.slug}`}
                    className="text-muted transition-colors hover:text-accent"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="tech-label mb-4">Discover</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/shop" className="text-muted hover:text-accent">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/shop?sort=popular" className="text-muted hover:text-accent">
                  Best Sellers
                </Link>
              </li>
              <li>
                <Link href="/shop?sort=newest" className="text-muted hover:text-accent">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link href="/shop?sort=discount" className="text-muted hover:text-accent">
                  Today&apos;s Deals
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="tech-label mb-4">Help</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/#faq" className="text-muted hover:text-accent">
                  FAQs
                </Link>
              </li>
              <li>
                <Link href="/policies/shipping" className="text-muted hover:text-accent">
                  Shipping
                </Link>
              </li>
              <li>
                <Link href="/policies/returns" className="text-muted hover:text-accent">
                  Returns &amp; Replacement
                </Link>
              </li>
              <li>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted hover:text-accent"
                >
                  Contact us
                </a>
              </li>
              {supportEmail ? (
                <li>
                  <a href={`mailto:${supportEmail}`} className="text-muted hover:text-accent">
                    {supportEmail}
                  </a>
                </li>
              ) : null}
              {supportPhone ? (
                <li>
                  <a href={`tel:${supportPhone.replace(/\s+/g, "")}`} className="text-muted hover:text-accent">
                    {supportPhone}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          <div>
            <h4 className="tech-label mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm">
              {policies.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/policies/${p.slug}`}
                    className="text-muted transition-colors hover:text-accent"
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border py-6 sm:flex-row">
          <p className="text-xs text-faint">
            © {new Date().getFullYear()} GIZMORAC. All rights reserved.
          </p>
          <div className="flex items-center gap-2 font-mono text-[0.625rem] uppercase tracking-wider text-faint">
            {["UPI", "Visa", "Mastercard", "GoKwik", "PhonePe", "COD"].map((m) => (
              <span
                key={m}
                className="rounded border border-border bg-surface px-2 py-1"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
