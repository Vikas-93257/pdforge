import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ShieldCheck, Info, Plus } from "lucide-react";
import { TOOLS, CATEGORIES, getTool } from "@/lib/tools";
import { absolute, safeJson } from "@/lib/site";
import { ToolIcon } from "@/components/ToolIcons";
import ToolDiscovery from "@/components/ToolDiscovery";
import { discoveryFor } from "@/lib/discovery";
import ToolRunner from "@/components/ToolRunner";
export const dynamicParams = false;
export function generateStaticParams() {
  return TOOLS.map((tool) => ({ slug: tool.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params,
    t = getTool(slug);
  if (!t) return {};
  const detail = discoveryFor(t);
  const title = detail?.title || `${t.name} — Free & private`;
  const description =
    detail?.description ||
    `${t.description} Free in your browser. No document uploads or sign-up. See the tool’s steps, output options and honest limitations.`;
  return {
    title,
    description,
    alternates: { canonical: absolute(`tools/${slug}/`) },
    openGraph: {
      title: `${title} | PDFORGE`,
      description,
      url: absolute(`tools/${slug}/`),
    },
    twitter: { card: "summary_large_image", title: `${title} | PDFORGE`, description },
  };
}
export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params,
    tool = getTool(slug);
  if (!tool) notFound();
  const related = TOOLS.filter((t) => t.category === tool.category && t.slug !== slug).slice(0, 4),
    category = CATEGORIES.find((c) => c.id === tool.category);
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": absolute(`tools/${slug}/#app`),
        name: tool.name,
        url: absolute(`tools/${slug}/`),
        description: discoveryFor(tool)?.description || tool.description,
        publisher: { "@id": absolute("#publisher") },
        inLanguage: "en",
        license: absolute("licenses/"),
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Modern browser with JavaScript and WebAssembly",
        browserRequirements: "Requires JavaScript, WebAssembly, Workers and Canvas",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [tool.description, "Local document processing", "No account required"],
        softwareHelp: { "@type": "WebPage", url: absolute("security/") },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absolute() },
          { "@type": "ListItem", position: 2, name: tool.name, item: absolute(`tools/${slug}/`) },
        ],
      },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(schema) }} />
      <div className="shell tool-page">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/#tools" prefetch={false}>
            <ArrowLeft size={14} aria-hidden="true" /> All tools
          </Link>
          <span>/</span>
          <span>{category?.name}</span>
        </nav>
        <div className="tool-page-heading">
          <span className={`tool-title-icon category-${tool.category}`}>
            <ToolIcon name={tool.icon} size={32} />
          </span>
          <div>
            <div className="eyebrow">FREE. PRIVATE. READY WHEN YOU ARE.</div>
            <h1>
              {tool.name}
              <span className="heading-dot">.</span>
            </h1>
            <p>{tool.description}</p>
          </div>
        </div>
        <div className="tool-layout">
          <div className="tool-main">
            <ToolRunner key={tool.slug} tool={tool} />
            <aside className="limitation-note" aria-label="Important limitations">
              <Info size={20} aria-hidden="true" />
              <div>
                <h2>Good to know before you start</h2>
                <p>{tool.limitation}</p>
              </div>
            </aside>
          </div>
          <aside className="tool-sidebar">
            <div className="sidebar-privacy">
              <ShieldCheck size={25} strokeWidth={1.6} aria-hidden="true" />
              <h2>Your file. Your business.</h2>
              <p>
                Processing happens on your device. We don’t receive your document content, filenames
                or passwords.
              </p>
              <Link href="/privacy/" prefetch={false}>
                How privacy works <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <div className="sidebar-steps">
              <span className="eyebrow">HOW IT WORKS</span>
              <h2>A few clicks. That’s all.</h2>
              <ol>
                {tool.steps.map((step, i) => (
                  <li key={step}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <p>{step}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="sidebar-limits">
              <h2>Built-in safety limits</h2>
              <p>
                100 MB per file · 300 MB total
                <br />
                Up to 50 files per session
                <br />
                150 rendered pages · 40 OCR pages
              </p>
              <p>
                Large or complex documents can hit device-memory limits sooner. Keep a backup; edits
                can invalidate digital signatures.
              </p>
              <Link href="/security/" prefetch={false}>
                Read all limitations <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>
          </aside>
        </div>
        <ToolDiscovery tool={tool} />
        <section className="tool-faq">
          <div>
            <span className="eyebrow">USEFUL TO KNOW</span>
            <h2>About {tool.name}</h2>
          </div>
          <div className="faq-list">
            {tool.faqs.map((f) => (
              <details key={f.q}>
                <summary>
                  {f.q}
                  <Plus size={17} aria-hidden="true" />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
        {related.length > 0 && (
          <section className="related-section">
            <div className="section-heading">
              <h2>One thing leads to another.</h2>
              <Link href="/#tools" className="text-link" prefetch={false}>
                All 38 tools <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div className="related-grid">
              {related.map((t) => (
                <Link
                  href={`/tools/${t.slug}/`}
                  key={t.slug}
                  className={`tool-card category-${t.category}`}
                  prefetch={false}
                >
                  <span className="tool-icon">
                    <ToolIcon name={t.icon} />
                  </span>
                  <h3>{t.name}</h3>
                  <p>{t.description}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
