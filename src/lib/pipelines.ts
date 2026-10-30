import {
  executeTool,
  identifyFile,
  type LocalFile,
  type ToolHooks,
  type ToolOptions,
  type ToolResult,
} from "./operations";
import { getTool, type ToolDef } from "./tools";
import { LIMITS } from "./site";
import { PdfError } from "./pdf/engine";

export type OutputKind = "pdf" | "image" | "document" | "spreadsheet" | "presentation" | "text";

const PDF_OUT = [
  "merge",
  "split",
  "organize",
  "extract-pages",
  "remove-pages",
  "rotate",
  "compress",
  "repair",
  "jpg-to-pdf",
  "word-to-pdf",
  "excel-to-pdf",
  "powerpoint-to-pdf",
  "text-to-pdf",
  "page-numbers",
  "watermark",
  "sign",
  "protect",
  "unlock",
  "crop",
  "resize",
  "flatten",
  "redact",
  "sanitize",
  "ocr",
  "metadata",
  "fill-pdf-form",
] as const;

export const OUTPUT_KIND: Record<string, OutputKind> = Object.fromEntries([
  ...PDF_OUT.map((slug) => [slug, "pdf" as const]),
  ["pdf-to-jpg", "image"],
  ["pdf-to-png", "image"],
  ["extract-images", "image"],
  ["compare", "image"],
  ["pdf-to-word", "document"],
  ["pdf-to-excel", "spreadsheet"],
  ["pdf-to-powerpoint", "presentation"],
  ["pdf-to-text", "text"],
  ["pdf-to-markdown", "text"],
  ["pdf-to-csv", "text"],
  ["summarize", "text"],
]) as Record<string, OutputKind>;

export const PIPELINE_EXCLUDED: Record<string, string> = {
  organize: "needs page-by-page order controls",
  sign: "needs a drawn or typed signature",
  redact: "needs boxes drawn on the page",
  metadata: "needs explicit field values to avoid wiping fields",
  compare: "needs exactly two input documents",
  "text-to-pdf": "needs typed text rather than a file",
  "fill-pdf-form": "needs a value for each form field",
};

export const PIPELINE_LIMITS = { maxSteps: 8, maxFiles: LIMITS.files } as const;

export const isPipelineEligible = (slug: string) => !(slug in PIPELINE_EXCLUDED);

export function acceptsOutput(kind: OutputKind, accept: ToolDef["accept"]) {
  return kind === accept || (accept === "pdf-image" && (kind === "pdf" || kind === "image"));
}

export function validateChain(slugs: string[]) {
  if (!slugs.length) throw new PdfError("A pipeline needs at least one step.", "INPUT");
  if (slugs.length > PIPELINE_LIMITS.maxSteps)
    throw new PdfError(
      `Pipelines are limited to ${PIPELINE_LIMITS.maxSteps} steps. Split longer workflows.`,
      "LIMIT",
    );
  const tools = slugs.map((slug) => {
    const tool = getTool(slug);
    if (!tool) throw new PdfError(`Unknown pipeline step: ${slug}.`, "INPUT");
    return tool;
  });
  for (let i = 0; i + 1 < tools.length; i++) {
    const kind = OUTPUT_KIND[tools[i].slug],
      next = tools[i + 1];
    if (!kind || !acceptsOutput(kind, next.accept))
      throw new PdfError(
        `${tools[i].name} produces ${kind ?? "unknown"} output, which ${next.name} cannot open.`,
        "INPUT",
      );
  }
  return tools;
}

export type PipelineStep = { slug: string; options?: Partial<ToolOptions> };
export type PipelinePreset = {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
};
export type PipelineStage = { slug: string; name: string; inFiles: number; outFiles: number };
export type PipelineResult = ToolResult & { stages: PipelineStage[] };

export const PIPELINES: PipelinePreset[] = [
  {
    id: "searchable-scan",
    name: "Scan to searchable PDF",
    description: "Recognize English text in a scan, then losslessly shrink the result.",
    steps: [{ slug: "ocr" }, { slug: "compress" }],
  },
  {
    id: "share-ready",
    name: "Clean and shrink for sharing",
    description: "Rebuild pages as clean images without metadata or attachments, then compress.",
    steps: [{ slug: "sanitize" }, { slug: "compress" }],
  },
  {
    id: "office-pdf-pack",
    name: "Word to compact PDF",
    description: "Convert a DOCX to searchable PDF, then losslessly shrink it.",
    steps: [{ slug: "word-to-pdf" }, { slug: "compress" }],
  },
  {
    id: "sheet-pdf-pack",
    name: "Excel to compact PDF",
    description: "Render an XLSX workbook to searchable PDF, then losslessly shrink it.",
    steps: [{ slug: "excel-to-pdf" }, { slug: "compress" }],
  },
  {
    id: "deck-pdf-pack",
    name: "Slides to compact PDF",
    description: "Convert a PPTX deck to searchable PDF, then losslessly shrink it.",
    steps: [{ slug: "powerpoint-to-pdf" }, { slug: "compress" }],
  },
  {
    id: "split-and-flatten",
    name: "Split every page, flatten forms",
    description: "Split a PDF into one file per page, then make every form field static.",
    steps: [{ slug: "split", options: { splitMode: "each" } }, { slug: "flatten" }],
  },
  {
    id: "repair-and-read",
    name: "Repair, then recognize text",
    description: "Attempt structural recovery first, then run English OCR on the result.",
    steps: [{ slug: "repair" }, { slug: "ocr" }],
  },
  {
    id: "images-to-pdf",
    name: "Embedded images back into a PDF",
    description: "Extract embedded raster images, then pack them into one new PDF.",
    steps: [{ slug: "extract-images" }, { slug: "jpg-to-pdf" }],
  },
];

const uid = () =>
  typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;

export async function executePipeline(
  steps: PipelineStep[],
  files: LocalFile[],
  base: ToolOptions,
  hooks: ToolHooks,
): Promise<PipelineResult> {
  const tools = validateChain(steps.map((s) => s.slug));
  if (tools.some((t) => t.slug === "redact" || t.slug === "sanitize") && !base.confirm)
    throw new PdfError(
      "This pipeline rebuilds pages as images. Confirm that original text, forms and signatures will be removed.",
      "INPUT",
    );
  const first = tools[0];
  for (const file of files) {
    const kind = identifyFile(file.bytes, file.name);
    const ok =
      kind === first.accept ||
      (first.accept === "pdf-image" && (kind === "pdf" || kind === "image"));
    if (!ok)
      throw new PdfError(
        `“${file.name}” cannot start this pipeline: ${first.name} needs ${first.accept} input.`,
        "INPUT",
      );
  }
  const { signal, onProgress } = hooks;
  const notes: string[] = [],
    stages: PipelineStage[] = [];
  let current = files,
    previewText: string | undefined,
    metrics: ToolResult["metrics"];
  for (let i = 0; i < tools.length; i++) {
    if (signal.aborted) throw new PdfError("Processing cancelled.", "CANCELLED");
    const tool = tools[i],
      options = { ...base, ...steps[i].options },
      label = `Step ${i + 1} of ${tools.length} · ${tool.name}`;
    onProgress(null, `${label}…`);
    const inFiles = current.length;
    const runOne = (batch: LocalFile[]) =>
      executeTool(tool.slug, batch, options, {
        signal,
        onProgress: (percent, stepLabel) => onProgress(percent, `${label} — ${stepLabel}`),
        env: hooks.env,
        normalize: hooks.normalize,
      });
    const results: ToolResult[] = [];
    if (tool.multiple) results.push(await runOne(current));
    else for (const file of current) results.push(await runOne([file]));
    current = [];
    for (const result of results) {
      if (tools.length > 1)
        for (const note of result.notes) notes.push(`Step ${i + 1} (${tool.name}): ${note}`);
      else notes.push(...result.notes);
      if (result.previewText !== undefined) previewText = result.previewText;
      if (result.metrics !== undefined) metrics = result.metrics;
      for (const file of result.files) {
        current.push({
          id: uid(),
          name: file.name,
          type: file.mime,
          size: file.bytes.length,
          bytes: file.bytes,
        });
        if (current.length > PIPELINE_LIMITS.maxFiles)
          throw new PdfError(
            `The pipeline produced more than ${PIPELINE_LIMITS.maxFiles} files. Narrow the input first.`,
            "LIMIT",
          );
      }
    }
    stages.push({ slug: tool.slug, name: tool.name, inFiles, outFiles: current.length });
  }
  return {
    files: current.map((f) => ({ name: f.name, bytes: f.bytes, mime: f.type })),
    notes,
    previewText,
    metrics,
    stages,
  };
}
