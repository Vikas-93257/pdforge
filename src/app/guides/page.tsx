import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { GUIDES } from "@/lib/content";
import { absolute } from "@/lib/site";
export const metadata: Metadata = {
  title: "Practical PDF guides",
  description:
    "Helpful guides to lossless PDF compression, permanent redaction and local English/Hindi OCR, with clear limitations and verification steps.",
  alternates: { canonical: absolute("guides/") },
};
export default function Guides() {
  return (
    <div className="shell guides-page">
      <header className="article-header">
        <span className="eyebrow">A LITTLE KNOW-HOW GOES A LONG WAY.</span>
        <h1>
          Better documents.
          <br />
          Fewer surprises<span className="heading-dot">.</span>
        </h1>
        <p>
          Practical guides to choosing the right operation and checking that the result does what
          you need.
        </p>
      </header>
      <div className="guides-grid">
        {GUIDES.map((g, i) => (
          <Link href={`/guides/${g.slug}/`} className="guide-card" key={g.slug} prefetch={false}>
            <div className="guide-graphic">
              <BookOpen size={40} strokeWidth={1.2} aria-hidden="true" />
              <span>FIELD NOTES / 0{i + 1}</span>
            </div>
            <div>
              <h2>{g.title}</h2>
              <p>{g.description}</p>
              <span className="text-link">
                Read the guide <ArrowUpRight size={16} aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
