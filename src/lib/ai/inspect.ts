import { loadPdf } from "../pdf/engine";
import { extractTextPages } from "../pdf/convert";
import { identifyLanguage, stopwordsFor, type LanguageGuess } from "./language";
export type DocumentInsight = {
  pages: number;
  chars: number;
  words: number;
  textPages: number;
  scannedPages: number;
  fullyScanned: boolean;
  title: string;
  author: string;
  formFields: number;
  emails: number;
  phones: number;
  language: LanguageGuess;
  keywords: string[];
  phrases: string[];
  suggestedName: string;
  truncated: boolean;
};
const MAX_CHARS = 500000;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /(?:^|[\s(])\+?\d[\d\s().-]{6,}\d/g;
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
function topTerms(text: string, stop: Set<string>): { keywords: string[]; phrases: string[] } {
  const words = text
    .toLowerCase()
    .match(/[\p{L}\p{N}]{3,}/gu)
    ?.filter((w) => !stop.has(w) && !/^\d+$/.test(w));
  if (!words?.length) return { keywords: [], phrases: [] };
  const freq = new Map<string, number>(),
    pairs = new Map<string, number>();
  for (let i = 0; i < words.length; i++) {
    freq.set(words[i], (freq.get(words[i]) ?? 0) + 1);
    if (i + 1 < words.length) {
      const pair = `${words[i]} ${words[i + 1]}`;
      pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
    }
  }
  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const keywords = ranked.slice(0, 10).map(([w]) => w);
  const phrases = [...pairs.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([p]) => p);
  return { keywords, phrases };
}
export async function inspectDocument(
  bytes: Uint8Array,
  opts: { signal?: AbortSignal } = {},
): Promise<DocumentInsight> {
  const doc = await loadPdf(bytes);
  const pages = doc.getPageCount();
  let title = "",
    author = "",
    formFields = 0;
  try {
    title = doc.getTitle() ?? "";
  } catch {
    title = "";
  }
  try {
    author = doc.getAuthor() ?? "";
  } catch {
    author = "";
  }
  try {
    formFields = doc.getForm().getFields().length;
  } catch {
    formFields = 0;
  }
  const extracted = await extractTextPages(bytes, opts.signal);
  const pageChars = extracted.map((p) => p.lines.join("\n").replace(/\s+/g, " ").trim());
  const textPages = pageChars.filter((t) => t.length > 0).length;
  const scannedPages = pageChars.filter((t) => t.length < 40).length;
  let full = extracted
    .map((p) => p.lines.join("\n"))
    .join("\n")
    .replace(/[^\S\n]+/g, " ");
  const truncated = full.length > MAX_CHARS;
  if (truncated) full = full.slice(0, MAX_CHARS);
  const words = full.match(/[\p{L}\p{N}]+/gu) ?? [];
  const language = identifyLanguage(full);
  const { keywords, phrases } = topTerms(full, stopwordsFor(language.code));
  const emails = new Set(full.match(EMAIL) ?? []).size;
  const phones = full.match(PHONE)?.length ?? 0;
  const firstLine =
    full
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length >= 4 && l.length <= 80) ?? "";
  const suggestedName = slugify(title || firstLine) || "document";
  return {
    pages,
    chars: full.length,
    words: words.length,
    textPages,
    scannedPages,
    fullyScanned: pages > 0 && scannedPages === pages,
    title,
    author,
    formFields,
    emails,
    phones,
    language,
    keywords,
    phrases,
    suggestedName,
    truncated,
  };
}
export function summarizeInsight(i: DocumentInsight): string {
  const lines = [
    `${i.pages} pages · ${i.words.toLocaleString("en-US")} words · ${i.textPages} with text, ${i.scannedPages} look scanned.`,
    `Language guess: ${i.language.label} (${i.language.confidence} confidence).`,
  ];
  if (i.title) lines.push(`Title: ${i.title}`);
  if (i.formFields) lines.push(`${i.formFields} form fields detected.`);
  if (i.emails || i.phones)
    lines.push(`${i.emails} email addresses, ${i.phones} phone-like numbers (patterns only).`);
  if (i.keywords.length) lines.push(`Top topics: ${i.keywords.slice(0, 5).join(", ")}.`);
  return lines.join("\n");
}
export function renderInsightReport(i: DocumentInsight, sourceName: string): string {
  const row = (k: string, v: string) => `| ${k} | ${v} |\n`;
  return `# Document insight — ${sourceName}\n\n_Generated on-device by PDFORGE Inspect. Word-frequency guesses and pattern counts; it does not understand or verify content._\n\n## Facts\n\n| Measure | Value |\n| --- | --- |\n${row("Pages", String(i.pages))}${row("Words", i.words.toLocaleString("en-US"))}${row("Characters", i.chars.toLocaleString("en-US"))}${row("Pages with text", String(i.textPages))}${row("Pages that look scanned (<40 chars)", String(i.scannedPages))}${row("Title (metadata)", i.title || "—")}${row("Author (metadata)", i.author || "—")}${row("Form fields", String(i.formFields))}${row("Email addresses (patterns)", String(i.emails))}${row("Phone-like numbers (patterns)", String(i.phones))}${row("Suggested filename", `${i.suggestedName}.pdf`)}${i.truncated ? "\n_Only the first 500,000 characters were analyzed._\n" : ""}\n## Language guess\n\n${i.language.label} — ${i.language.confidence} confidence (script + stopword vote, no AI model).\n\n## Top topics\n\n${i.keywords.length ? i.keywords.map((k) => `- ${k}`).join("\n") : "_No distinctive keywords found._"}\n${i.phrases.length ? `\n## Repeated phrases\n\n${i.phrases.map((p) => `- ${p}`).join("\n")}\n` : ""}\n## What to do next\n\n${i.scannedPages > 0 ? `- Run OCR: ${i.scannedPages} of ${i.pages} pages look scanned.\n` : ""}${i.formFields > 0 ? `- Fill PDF form: ${i.formFields} fields detected.\n` : ""}${i.emails + i.phones > 0 ? `- Review for redaction: contact patterns were counted, never listed here.\n` : ""}${!i.title ? `- Set metadata: no document title is stored.\n` : ""}${i.scannedPages === 0 && i.formFields === 0 && i.emails + i.phones === 0 && i.title ? "_Nothing specific flagged — the document reads as ordinary digital text._\n" : ""}`;
}
