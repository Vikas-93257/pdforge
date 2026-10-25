import type { MetadataRoute } from "next";
import { TOOLS } from "@/lib/tools";
import { PAGES, GUIDES } from "@/lib/content";
import { absolute } from "@/lib/site";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absolute(), changeFrequency: "monthly", priority: 1 },
    ...TOOLS.map((t) => ({
      url: absolute(`tools/${t.slug}/`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...PAGES.map((p) => ({
      url: absolute(`${p.slug}/`),
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
    { url: absolute("guides/"), changeFrequency: "monthly", priority: 0.6 },
    ...GUIDES.map((g) => ({
      url: absolute(`guides/${g.slug}/`),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
