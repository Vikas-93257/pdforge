import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ArrowRight } from "lucide-react";
import type { Article } from "@/lib/content";
import { assetUrl } from "@/lib/site";
export default function ArticlePage({
  article,
  guide = false,
}: {
  article: Article;
  guide?: boolean;
}) {
  return (
    <article className="shell article-page">
      <Link className="breadcrumb" href={guide ? "/guides/" : "/"} prefetch={false}>
        <ArrowLeft size={14} aria-hidden="true" /> {guide ? "All guides" : "Back to PDFORGE"}
      </Link>
      <header className="article-header">
        <span className="eyebrow">{article.eyebrow}</span>
        <h1>
          {article.title}
          <span className="heading-dot">.</span>
        </h1>
        <p>{article.intro}</p>
        <div className="article-meta">PDFORGE documentation · Updated October 25, 2026</div>
      </header>
      <div className="article-layout">
        <nav className="article-toc" aria-label="On this page">
          <span className="eyebrow">ON THIS PAGE</span>
          {article.sections.map((s, i) => (
            <a href={`#${s.id || `section-${i + 1}`}`} key={s.heading}>
              {s.heading}
            </a>
          ))}
        </nav>
        <div className="article-content">
          {article.sections.map((s, i) => (
            <section key={s.heading} id={s.id || `section-${i + 1}`}>
              <h2>{s.heading}</h2>
              {s.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {s.bullets && (
                <ul>
                  {s.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          {article.slug === "licenses" && (
            <section>
              <h2>Download notices</h2>
              <p>
                <a href={assetUrl("/licenses/third-party.txt")}>
                  Third-party license inventory <ArrowUpRight size={13} aria-hidden="true" />
                </a>
              </p>
              <p>
                <a href={assetUrl("/source-assets.json")}>
                  Font and OCR model provenance & SHA-256 hashes
                </a>
              </p>
              <p>
                <a href={assetUrl("/engines/manifest.json")}>Processing engine asset hashes</a>
              </p>
            </section>
          )}
          <div className="article-callout">
            <h2>Ready for a little less busywork?</h2>
            <p>Choose a tool and keep your documents on your device.</p>
            <Link href="/#tools" className="button button-green" prefetch={false}>
              Explore all 30 tools <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
