import type { MetadataRoute } from "next";
import { TOOLS } from "@/lib/tools";
import { PAGES, GUIDES } from "@/lib/content";
import { absolute } from "@/lib/site";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absolute(), lastModified: "2026-10-28", changeFrequency: "monthly", priority: 1 },
    {
      url: absolute("pipelines/"),
      lastModified: "2026-10-30",
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: absolute("oauth/callback/"),
      lastModified: "2026-10-30",
      changeFrequency: "yearly" as const,
      priority: 0.1,
    },
    ...TOOLS.map((t) => ({
      url: absolute(`tools/${t.slug}/`),
      lastModified: "2026-10-28",
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...PAGES.map((p) => ({
      url: absolute(`${p.slug}/`),
      lastModified: p.updated || "2026-10-25",
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
    { url: absolute("guides/"), changeFrequency: "monthly", priority: 0.6 },
    ...GUIDES.map((g) => ({
      url: absolute(`guides/${g.slug}/`),
      lastModified: g.updated || "2026-10-25",
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
