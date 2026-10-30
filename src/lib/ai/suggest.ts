import type { DocumentInsight } from "./inspect";
export type ToolSuggestion = { slug: string; reason: string };
const MB = 1024 * 1024;
export function suggestNextTools(
  insight: DocumentInsight,
  opts: { currentSlug?: string; sizeBytes?: number } = {},
): ToolSuggestion[] {
  const out: ToolSuggestion[] = [];
  if (insight.scannedPages > 0)
    out.push({
      slug: "ocr",
      reason: `${insight.scannedPages} of ${insight.pages} pages look scanned — OCR adds selectable text.`,
    });
  if (insight.formFields > 0)
    out.push({
      slug: "fill-pdf-form",
      reason: `${insight.formFields} fillable fields detected.`,
    });
  if (insight.emails + insight.phones > 0)
    out.push({
      slug: "redact",
      reason: `${insight.emails} email and ${insight.phones} phone-like patterns found — review before sharing.`,
    });
  if ((opts.sizeBytes ?? 0) > 8 * MB)
    out.push({ slug: "compress", reason: "Large file — compression may shrink it." });
  if (!insight.title) out.push({ slug: "metadata", reason: "No document title is stored." });
  if (insight.pages > 40)
    out.push({ slug: "split", reason: "Long document — split out the parts you need." });
  return out.filter((s) => s.slug !== opts.currentSlug).slice(0, 3);
}
