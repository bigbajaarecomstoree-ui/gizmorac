import type { Metadata } from "next";
import { IBM_Plex_Sans, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/constants";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "gadgets",
    "smart gadgets",
    "tyre inflator",
    "thermal printer",
    "knee massager",
    "BP monitor",
    "India",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${dmSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* Track input modality so focus rings show for keyboard users only. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement;function m(){d.setAttribute('data-input','mouse')}function k(e){if(e.key==='Tab'||e.key==='Enter'||e.key===' '||e.key.indexOf('Arrow')===0){d.setAttribute('data-input','keyboard')}}window.addEventListener('mousedown',m,true);window.addEventListener('pointerdown',m,true);window.addEventListener('touchstart',m,true);window.addEventListener('keydown',k,true);})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
