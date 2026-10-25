import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PAGES } from "@/lib/content";
import { absolute } from "@/lib/site";
import ArticlePage from "@/components/ArticlePage";
export const dynamicParams = false;
export function generateStaticParams() {
  return PAGES.map((p) => ({ page: p.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params,
    p = PAGES.find((p) => p.slug === page);
  if (!p) return {};
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: absolute(`${page}/`) },
    openGraph: { title: p.title, description: p.description, url: absolute(`${page}/`) },
  };
}
export default async function Info({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params,
    p = PAGES.find((p) => p.slug === page);
  if (!p) notFound();
  return <ArticlePage article={p} />;
}
