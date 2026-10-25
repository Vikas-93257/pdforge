"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, X } from "lucide-react";
import { CATEGORIES, TOOLS, type ToolCategory } from "@/lib/tools";
import { ToolIcon } from "./ToolIcons";
export default function ToolCatalog() {
  const [category, setCategory] = useState<ToolCategory | "all">("all"),
    [query, setQuery] = useState("");
  const results = TOOLS.filter(
    (t) =>
      (category === "all" || t.category === category) &&
      `${t.name} ${t.description}`.toLowerCase().includes(query.toLowerCase().trim()),
  );
  return (
    <section className="tools-section shell" id="tools" aria-labelledby="tools-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE EVERYDAY TOOLKIT</span>
          <h2 id="tools-title">Big tasks. Small clicks.</h2>
          <p>Pick a tool. Keep your files to yourself.</p>
        </div>
        <div className="catalog-search">
          <Search size={18} aria-hidden="true" />
          <label htmlFor="tool-search" className="sr-only">
            Search PDF tools
          </label>
          <input
            id="tool-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find your tool…"
            type="search"
            autoComplete="off"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="filter-tabs" role="group" aria-label="Filter tools by category">
        <button
          className={category === "all" ? "active" : ""}
          onClick={() => setCategory("all")}
          aria-pressed={category === "all"}
        >
          All tools <span>{TOOLS.length}</span>
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={category === c.id ? "active" : ""}
            onClick={() => setCategory(c.id)}
            aria-pressed={category === c.id}
          >
            {c.name}
          </button>
        ))}
      </div>
      <p className="sr-only" role="status">
        {results.length} tools found
      </p>
      <div className="tool-grid">
        {results.map((t) => (
          <Link
            href={`/tools/${t.slug}/`}
            key={t.slug}
            className={`tool-card category-${t.category}`}
            prefetch={false}
          >
            <div className="tool-card-top">
              <span className="tool-icon">
                <ToolIcon name={t.icon} />
              </span>
              <ArrowUpRight className="card-arrow" size={19} aria-hidden="true" />
            </div>
            <h3>{t.name}</h3>
            <p>{t.description}</p>
            <span className="tool-card-bottom">
              {t.slug === "merge" || t.slug === "compress" || t.slug === "sign" ? (
                <span className="popular-label">ESSENTIAL</span>
              ) : (
                <span className="tool-number">
                  {String(TOOLS.indexOf(t) + 1).padStart(2, "0")} / {TOOLS.length}
                </span>
              )}
              <span>Free to use</span>
            </span>
          </Link>
        ))}
      </div>
      {!results.length && (
        <div className="empty-search">
          <h3>No tools found for “{query}”</h3>
          <p>Try “merge”, “image” or “text”, or choose another category.</p>
          <button
            className="button button-outline"
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
          >
            Show all tools
          </button>
        </div>
      )}
    </section>
  );
}
