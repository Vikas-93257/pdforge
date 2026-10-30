import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Code2 } from "lucide-react";
import { Brand } from "@/components/Brand";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { SITE_URL, absolute, assetUrl, safeJson } from "@/lib/site";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "PDFORGE — Free PDF tools. No uploads. No sign-up.", template: "%s | PDFORGE" },
  description:
    "38 free PDF tools that run on your device. Merge, split, compress, convert, sign and protect PDFs in your browser. No uploads, accounts or subscriptions.",
  applicationName: "PDFORGE",
  category: "productivity",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { other: { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } }
      : {}),
  },
  openGraph: {
    type: "website",
    siteName: "PDFORGE",
    locale: "en_US",
    title: "Your PDFs. Your device. Your rules.",
    description: "Free, private PDF tools. No uploads. No sign-up.",
    images: [
      {
        url: absolute("og.png"),
        width: 1200,
        height: 630,
        alt: "PDFORGE — Your PDFs. Your device. Your rules.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PDFORGE — Free, private PDF tools",
    description: "38 tools. No uploads. No accounts. Built for your browser.",
    images: [absolute("og.png")],
  },
  icons: {
    icon: [{ url: assetUrl("/icon.svg"), type: "image/svg+xml" }],
    apple: assetUrl("/apple-touch-icon.png"),
  },
  manifest: assetUrl("/manifest.webmanifest"),
  referrer: "strict-origin-when-cross-origin",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f8f3",
  colorScheme: "light",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJson({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": absolute("#publisher"),
              name: "PDFORGE project",
              url: absolute(),
              logo: absolute("apple-touch-icon.png"),
              description:
                "Project publishing free browser-local PDF tools; original application source is privately maintained.",
            }),
          }}
        />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="shell header-inner">
            <Brand />
            <nav className="main-nav" aria-label="Main navigation">
              <Link href="/#tools" prefetch={false}>
                All tools
              </Link>
              <Link href="/guides/" prefetch={false}>
                Guides
              </Link>
              <Link href="/about/" prefetch={false}>
                Our approach
              </Link>
            </nav>
            <div className="header-right">
              <span className="local-badge">
                <span className="status-dot" />
                On your device
              </span>
              <Link href="/#tools" className="button button-dark button-small" prefetch={false}>
                Let’s get to work <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </header>
        <main id="main">
          <noscript>
            <div className="shell noscript-note">
              Document tools require JavaScript and WebAssembly so processing can happen on your
              device. The guides and privacy documentation are still readable without JavaScript.
            </div>
          </noscript>
          {children}
        </main>
        <footer className="site-footer">
          <div className="shell footer-top">
            <div className="footer-intro">
              <Brand />
              <p>
                A little less friction.
                <br />A lot more control over your documents.
              </p>
              <span className="footer-promise">
                <ShieldCheck size={16} aria-hidden="true" /> No accounts. No document uploads.
              </span>
            </div>
            <div>
              <h2>Get things done</h2>
              <Link href="/tools/merge/" prefetch={false}>
                Merge PDF
              </Link>
              <Link href="/tools/compress/" prefetch={false}>
                Compress PDF
              </Link>
              <Link href="/tools/pdf-to-word/" prefetch={false}>
                PDF to Word
              </Link>
              <Link href="/tools/sign/" prefetch={false}>
                Sign a PDF
              </Link>
              <Link href="/pipelines/" prefetch={false}>
                Pipelines
              </Link>
            </div>
            <div>
              <h2>Good to know</h2>
              <Link href="/privacy/" prefetch={false}>
                Privacy
              </Link>
              <Link href="/security/" prefetch={false}>
                Security & limitations
              </Link>
              <Link href="/accessibility/" prefetch={false}>
                Accessibility
              </Link>
              <Link href="/guides/" prefetch={false}>
                Practical guides
              </Link>
              <Link href="/terms/" prefetch={false}>
                Terms of use
              </Link>
            </div>
            <div>
              <h2>Built for privacy</h2>
              <Link href="/about/" prefetch={false}>
                About PDFORGE
              </Link>
              <Link href="/licenses/" prefetch={false}>
                Software licenses
              </Link>
              <Link href="/about/#software-license" prefetch={false}>
                About this software
              </Link>
              <Link href="/testing/" prefetch={false}>
                Testing & examples
              </Link>
              <a href={assetUrl("/sitemap.xml")}>Sitemap</a>
              <a href={assetUrl("/llms.txt")}>Machine-readable overview</a>
            </div>
          </div>
          <div className="shell footer-bottom">
            <span>PDFORGE · Free-to-use document tools</span>
            <span>
              <Code2 size={14} aria-hidden="true" /> Built for your browser. Not for tracking.
            </span>
          </div>
        </footer>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
