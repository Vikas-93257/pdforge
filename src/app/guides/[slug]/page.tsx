import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticlePage from "@/components/ArticlePage";
import { GUIDES } from "@/lib/content";
import { absolute, safeJson } from "@/lib/site";
export const dynamicParams = false;
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params,
    g = GUIDES.find((g) => g.slug === slug);
  if (!g) return {};
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: absolute(`guides/${slug}/`) },
    openGraph: {
      type: "article",
      title: g.title,
      description: g.description,
      url: absolute(`guides/${slug}/`),
    },
  };
}
export default async function Guide({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params,
    g = GUIDES.find((g) => g.slug === slug);
  if (!g) notFound();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJson({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: g.title,
            description: g.description,
            mainEntityOfPage: absolute(`guides/${slug}/`),
            dateModified: "2026-10-25",
            author: { "@type": "Organization", name: "PDFORGE" },
            publisher: { "@type": "Organization", name: "PDFORGE" },
          }),
        }}
      />
      <ArticlePage article={g} guide />
    </>
  );
}
