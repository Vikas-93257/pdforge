import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  MousePointer2,
  Download,
  LockKeyhole,
  Check,
  Plus,
} from "lucide-react";
import ToolCatalog from "@/components/ToolCatalog";
import { absolute, safeJson } from "@/lib/site";
export const metadata: Metadata = {
  alternates: { canonical: absolute() },
  title: "PDFORGE — Free PDF tools. No uploads. No sign-up.",
};
const faqs = [
  {
    q: "Are all 37 tools really free?",
    a: "Yes. No subscriptions, premium tools, daily-use quotas or added PDFORGE watermarks. Device memory and safety limits still apply: 100 MB per file, 300 MB total and up to 50 files. Rendering is limited to 150 pages per run; OCR to 40.",
  },
  {
    q: "Do my files leave my device?",
    a: "Document processing happens in your browser. PDFORGE does not upload document content, filenames or passwords. The hosting provider still receives ordinary page and public-asset requests, including your IP address. There are no analytics or tracking cookies in the app.",
  },
  {
    q: "Can it replace a desktop PDF editor?",
    a: "For many everyday tasks, yes. It does not provide full-fidelity Office conversion, certificate-based signatures, advanced PDF editing, password cracking or a legal document review. Each tool explains its limits before you run it.",
  },
  {
    q: "Which browsers work best?",
    a: "Use a current version of Chrome, Edge, Firefox or Safari with JavaScript and WebAssembly enabled. Large files and OCR need enough free device memory. The release includes automated Chromium, Firefox and WebKit-engine tests. Real Safari/iOS and other device-specific behavior should still be checked for your deployment.",
  },
];
export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJson({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "PDFORGE",
            url: absolute(),
            description: "Free browser-based PDF tools with no document uploads.",
            inLanguage: "en",
            "@id": absolute("#website"),
            publisher: { "@id": absolute("#publisher") },
          }),
        }}
      />
      <section className="hero shell">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="status-dot" /> BIG ON PRIVACY. ZERO ON PRICE.
          </div>
          <h1>
            Your PDFs.
            <br />
            Your device.
            <br />
            <span>Your rules.</span>
          </h1>
          <p className="hero-description">
            Merge, compress, convert PDF text to Word and more.
            <br />A whole PDF toolkit. Right in your browser.
            <br />
            <strong>No uploads. No sign-ups. No catch.</strong>
          </p>
          <div className="hero-actions">
            <Link className="button button-green" href="#tools" prefetch={false}>
              Find your tool <ArrowDown size={18} aria-hidden="true" />
            </Link>
            <Link className="text-link" href="/privacy/" prefetch={false}>
              Private by design <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="hero-footnote">
            <Check size={15} aria-hidden="true" /> 37 free tools <span>·</span> No added watermarks{" "}
            <span>·</span> On-device processing
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-grid" />
          <div className="art-label">
            <span className="status-dot" /> YOUR LOCAL WORKSPACE
          </div>
          <div className="document document-back">
            <span className="paper-tag paper-tag-peach">PDF</span>
            <div className="paper-lines">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="document document-front">
            <div className="paper-head">
              <span className="paper-tag">PDF</span>
              <span>
                Less busywork.
                <br />
                More done.
              </span>
            </div>
            <div className="paper-graphic">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="paper-lines">
              <i />
              <i />
              <i />
            </div>
            <div className="paper-footer">
              <span>Made for your everyday.</span>
              <Check size={16} />
            </div>
          </div>
          <span className="art-plus">
            <Plus size={22} />
          </span>
          <div className="art-privacy">
            <div>
              <LockKeyhole size={20} />
            </div>
            <span>
              Stays here.
              <br />
              <strong>On your device.</strong>
            </span>
            <span className="art-check">
              <Check size={16} />
            </span>
          </div>
          <div className="art-note">
            Your files don’t need
            <br />a round trip to the cloud.
            <svg width="50" height="30" viewBox="0 0 50 30">
              <path
                d="M4 4c4 19 20 22 40 13m-8-5 10 4-6 9"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </div>
        </div>
      </section>
      <div className="trust-strip">
        <div className="shell">
          <span>
            <ShieldCheck size={18} aria-hidden="true" /> Files processed on your device
          </span>
          <span>
            <LockKeyhole size={18} aria-hidden="true" /> No document-storage server
          </span>
          <span>
            <Check size={18} aria-hidden="true" /> Every tool free to use
          </span>
        </div>
      </div>
      <ToolCatalog />
      <section className="how-section shell" id="how-it-works" aria-labelledby="how-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">LESS COMPLICATED. MORE USEFUL.</span>
            <h2 id="how-title">Three steps. Then get on with your day.</h2>
          </div>
        </div>
        <div className="steps-grid">
          {[
            {
              icon: MousePointer2,
              title: "Pick your tool",
              text: "Thirty useful ways to give your documents a little order. Nothing to install.",
            },
            {
              icon: ShieldCheck,
              title: "Work right here",
              text: "Your browser does the work. Your documents aren’t sent to a processing server.",
            },
            {
              icon: Download,
              title: "Take it with you",
              text: "Review your result and download it. Clear the workspace when you’re done.",
            },
          ].map((s, i) => (
            <div className="how-step" key={s.title}>
              <div className="step-top">
                <s.icon size={25} strokeWidth={1.5} aria-hidden="true" />
                <span>0{i + 1}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="privacy-panel shell">
        <div className="privacy-stamp" aria-hidden="true">
          <ShieldCheck size={64} strokeWidth={1.2} />
          <span>
            LOCAL
            <br />
            BY DESIGN
          </span>
        </div>
        <div>
          <span className="eyebrow">YOUR DOCUMENTS ARE YOUR BUSINESS.</span>
          <h2>
            Good tools shouldn’t
            <br />
            ask for your files. Or your card.
          </h2>
          <p>
            PDFORGE runs on open-source engines, inside your browser. No processing backend, no
            account system, and no business model built around your documents.
          </p>
          <Link href="/about/" className="text-link" prefetch={false}>
            A different approach to PDF tools <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>
      <section className="faq-section shell">
        <div>
          <span className="eyebrow">A FEW GOOD QUESTIONS</span>
          <h2>
            Clear answers.
            <br />
            No fine print.
          </h2>
          <p>
            Need the technical details?
            <br />
            <Link href="/security/" className="text-link" prefetch={false}>
              Read our security notes <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </p>
        </div>
        <div className="faq-list">
          {faqs.map((f) => (
            <details key={f.q}>
              <summary>
                {f.q}
                <Plus size={18} aria-hidden="true" />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
