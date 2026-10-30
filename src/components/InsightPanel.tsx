"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FileSearch, LoaderCircle, TriangleAlert } from "lucide-react";
import { identifyFile, type LocalFile } from "@/lib/operations";
import type { DocumentInsight } from "@/lib/ai/inspect";
import type { ToolSuggestion } from "@/lib/ai/suggest";
import { getTool } from "@/lib/tools";

export function DuplicateNotice({ files }: { files: LocalFile[] }) {
  const [result, setResult] = useState<{ key: string; pairs: [number, number][] } | null>(null);
  const key = files.map((f) => f.id).join(",");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hashes: string[] = [];
      for (const f of files) {
        try {
          const digest = await crypto.subtle.digest("SHA-256", f.bytes as BufferSource);
          hashes.push(
            [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join(""),
          );
        } catch {
          return;
        }
      }
      if (cancelled) return;
      const pairs: [number, number][] = [];
      for (let i = 0; i < hashes.length && pairs.length < 3; i++)
        for (let j = i + 1; j < hashes.length && pairs.length < 3; j++)
          if (hashes[i] === hashes[j]) pairs.push([i + 1, j + 1]);
      setResult({ key, pairs });
    })();
    return () => {
      cancelled = true;
    };
  }, [files, key]);
  if (!result || result.key !== key || !result.pairs.length) return null;
  return (
    <p className="duplicate-notice" role="note">
      <TriangleAlert size={16} aria-hidden="true" />{" "}
      {result.pairs.map(([a, b]) => `Files ${a} and ${b} appear identical`).join("; ")} (same
      content hash). Remove one to avoid processing it twice.
    </p>
  );
}

type PanelResult =
  | { id: string; insight: DocumentInsight; suggestions: ToolSuggestion[] }
  | { id: string; insight: null; suggestions: [] };

export default function InsightPanel({
  file,
  currentSlug,
}: {
  file: LocalFile;
  currentSlug: string;
}) {
  const [result, setResult] = useState<PanelResult | null>(null);
  const isPdf = identifyFile(file.bytes, file.name) === "pdf";
  useEffect(() => {
    let cancelled = false;
    if (identifyFile(file.bytes, file.name) !== "pdf") return;
    (async () => {
      try {
        const [{ inspectDocument }, { suggestNextTools }] = await Promise.all([
          import("@/lib/ai/inspect"),
          import("@/lib/ai/suggest"),
        ]);
        const insight = await inspectDocument(file.bytes);
        if (cancelled) return;
        setResult({
          id: file.id,
          insight,
          suggestions: suggestNextTools(insight, { currentSlug, sizeBytes: file.size }),
        });
      } catch {
        if (!cancelled) setResult({ id: file.id, insight: null, suggestions: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, currentSlug]);
  if (!isPdf) return null;
  if (!result || result.id !== file.id)
    return (
      <p className="settings-note" role="status">
        <LoaderCircle size={14} aria-hidden="true" className="spin" /> Reading document facts on
        your device…
      </p>
    );
  const { insight, suggestions } = result;
  if (!insight) return null;
  const facts = [
    `${insight.pages} pages · ${insight.words.toLocaleString("en-US")} words`,
    insight.fullyScanned
      ? "Fully scanned — no selectable text"
      : `${insight.scannedPages} of ${insight.pages} pages look scanned`,
    `Language guess: ${insight.language.label} (${insight.language.confidence})`,
  ];
  if (insight.title) facts.push(`Title: ${insight.title}`);
  if (insight.formFields) facts.push(`${insight.formFields} form fields`);
  if (insight.emails + insight.phones > 0)
    facts.push(`${insight.emails} email · ${insight.phones} phone-like patterns`);
  return (
    <section className="insight-panel" aria-label="Document insight">
      <h2>
        <FileSearch size={16} aria-hidden="true" /> Document insight
      </h2>
      <ul>
        {facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
        {insight.keywords.length > 0 && (
          <li>Top topics: {insight.keywords.slice(0, 5).join(", ")}</li>
        )}
      </ul>
      {suggestions.length > 0 && (
        <p className="insight-suggest">
          Suggested next:{" "}
          {suggestions.map((s, index) => (
            <span key={s.slug}>
              {index > 0 && " · "}
              <Link href={`/tools/${s.slug}/`} prefetch={false} title={s.reason}>
                {getTool(s.slug)?.name ?? s.slug}
              </Link>
            </span>
          ))}
        </p>
      )}
      <p className="settings-note">Measured on your device — guesses, not understanding.</p>
    </section>
  );
}
