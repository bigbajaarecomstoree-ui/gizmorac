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

const CARE_EMAIL = "care@gizmorac.com";

// Brand glyphs as inline SVG (lucide dropped brand/logo icons).
type IconProps = { size?: number; className?: string };
function InstagramIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function FacebookIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
    </svg>
  );
}
function YoutubeIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M23.5 6.5a3 3 0 0 0-2.1-2.1C19.5 4 12 4 12 4s-7.5 0-9.4.4A3 3 0 0 0 .5 6.5 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.5 3 3 0 0 0 2.1 2.1C4.5 20 12 20 12 20s7.5 0 9.4-.4a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.5zM9.6 15.5v-7l6.2 3.5z" />
    </svg>
  );
}
function XIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function SiteFooter({
  whatsappHref = WHATSAPP_LINK,
  supportEmail,
  supportPhone,
  categories = [],
  instagramUrl,
  facebookUrl,
  youtubeUrl,
  twitterUrl,
}: {
  whatsappHref?: string;
  supportEmail?: string;
  supportPhone?: string;
  categories?: Category[];
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  twitterUrl?: string;
} = {}) {
  const socials = [
    { url: instagramUrl, Icon: InstagramIcon, label: "Instagram" },
    { url: facebookUrl, Icon: FacebookIcon, label: "Facebook" },
    { url: youtubeUrl, Icon: YoutubeIcon, label: "YouTube" },
    { url: twitterUrl, Icon: XIcon, label: "X (Twitter)" },
  ].filter((s) => s.url && s.url.trim());
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
            {socials.length > 0 ? (
              <div className="mt-5 flex items-center gap-2.5">
                {socials.map(({ url, Icon, label }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            ) : null}
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
              <li>
                <a href={`mailto:${CARE_EMAIL}`} className="text-muted hover:text-accent">
                  {CARE_EMAIL}
                </a>
              </li>
              {supportEmail && supportEmail !== CARE_EMAIL ? (
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
