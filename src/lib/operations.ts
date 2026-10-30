import type { NumberPosition } from "./pdf/engine";
import type { RedactionBox } from "./pdf/render";
import { LIMITS, safeFilename } from "./site";
import type { ToolDef } from "./tools";
export type LocalFile = { id: string; name: string; type: string; size: number; bytes: Uint8Array };
export type OutputFile = { name: string; bytes: Uint8Array; mime: string };
export type ToolOptions = {
  ranges: string;
  splitMode: "ranges" | "each";
  angle: number;
  compression: "lossless" | "recommended" | "extreme";
  scale: number;
  quality: number;
  pageSize: "fit" | "a4";
  orientation: "auto" | "portrait" | "landscape";
  margin: number;
  order: number[];
  rotations: Record<number, number>;
  position: NumberPosition;
  start: number;
  fontSize: number;
  withTotal: boolean;
  prefix: string;
  padDigits: number;
  watermarkText: string;
  opacity: number;
  watermarkRotation: number;
  color: string;
  signature: Uint8Array | null;
  signaturePage: number;
  signatureCorner: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  signatureWidth: number;
  password: string;
  passwordConfirm: string;
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  paper: "a4" | "letter" | "legal" | "a3";
  landscape: boolean;
  boxes: RedactionBox[];
  language: "eng" | "hin" | "eng+hin";
  title: string;
  author: string;
  subject: string;
  keywords: string;
  clearMetadata: boolean;
  confirm: boolean;
  text: string;
  wordMode: "text" | "visual";
  fieldValues: Record<string, string>;
  summaryLength: "short" | "medium" | "long";
};
export const DEFAULT_OPTIONS: ToolOptions = {
  ranges: "1",
  splitMode: "ranges",
  angle: 90,
  compression: "lossless",
  scale: 1.5,
  quality: 0.9,
  pageSize: "a4",
  orientation: "auto",
  margin: 24,
  order: [],
  rotations: {},
  position: "bottom-center",
  start: 1,
  fontSize: 11,
  withTotal: true,
  prefix: "",
  padDigits: 0,
  watermarkText: "CONFIDENTIAL",
  opacity: 0.25,
  watermarkRotation: -35,
  color: "#64748b",
  signature: null,
  signaturePage: 0,
  signatureCorner: "bottom-right",
  signatureWidth: 170,
  password: "",
  passwordConfirm: "",
  cropTop: 20,
  cropBottom: 20,
  cropLeft: 20,
  cropRight: 20,
  paper: "a4",
  landscape: false,
  boxes: [],
  language: "eng",
  title: "",
  author: "",
  subject: "",
  keywords: "",
  clearMetadata: false,
  confirm: false,
  text: "",
  wordMode: "text",
  fieldValues: {},
  summaryLength: "medium",
};
export const ACCEPT: Record<ToolDef["accept"], string> = {
  pdf: ".pdf,application/pdf",
  image: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
  document: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  spreadsheet: ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  presentation: ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation",
  text: ".txt,text/plain",
  "pdf-image": ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp",
};
export function identifyFile(
  bytes: Uint8Array,
  name: string,
): "pdf" | "image" | "document" | "spreadsheet" | "presentation" | "text" | "invalid" {
  if (new TextDecoder("latin1").decode(bytes.subarray(0, 1024)).includes("%PDF-")) return "pdf";
  if (
    (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) ||
    (new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP")
  )
    return "image";
  if (
    /\.docx$/i.test(name) &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 3 &&
    bytes[3] === 4
  )
    return "document";
  if (
    /\.xlsx$/i.test(name) &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 3 &&
    bytes[3] === 4
  )
    return "spreadsheet";
  if (
    /\.pptx$/i.test(name) &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 3 &&
    bytes[3] === 4
  )
    return "presentation";
  if (/\.txt$/i.test(name)) {
    try {
      const t = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return t.includes("\0") ? "invalid" : "text";
    } catch {
      return "invalid";
    }
  }
  return "invalid";
}
export function validateSelection(
  tool: ToolDef,
  files: { name: string; size: number }[],
  existing: { size: number }[] = [],
) {
  if (!files.length) throw new Error("Choose a file to continue.");
  if (!tool.multiple && files.length > 1) throw new Error("This tool accepts one file at a time.");
  if (files.length + existing.length > LIMITS.files)
    throw new Error(`Use at most ${LIMITS.files} files at once.`);
  if (tool.slug === "compare" && files.length + existing.length > 2)
    throw new Error("Compare accepts exactly two PDFs.");
  if (files.some((f) => f.size === 0))
    throw new Error("An empty file was selected. Choose a non-empty document.");
  if (files.some((f) => f.size > LIMITS.fileBytes))
    throw new Error("The per-file safety limit is 100 MB. Split or resize this document first.");
  if ([...files, ...existing].reduce((s, f) => s + f.size, 0) > LIMITS.totalBytes)
    throw new Error("The total safety limit is 300 MB per session.");
}
export type ToolResult = {
  files: OutputFile[];
  notes: string[];
  previewText?: string;
  metrics?: { before: number; after: number };
};
export type ToolHooks = {
  signal: AbortSignal;
  onProgress: (percent: number | null, label: string) => void;
  env?: import("./pdf/render").CanvasEnv;
  normalize?: (bytes: Uint8Array, type: string) => Promise<{ bytes: Uint8Array; type: string }>;
};
export async function executeTool(
  slug: string,
  files: LocalFile[],
  o: ToolOptions,
  hooks: ToolHooks,
): Promise<ToolResult> {
  const { signal, onProgress, env, normalize } = hooks;
  const engine = await import("./pdf/engine");
  const check = () => {
    if (signal.aborted) throw new engine.PdfError("Processing cancelled.", "CANCELLED");
  };
  check();
  if (!files.length && !(slug === "text-to-pdf" && o.text.trim()))
    throw new engine.PdfError("Choose a document first.", "INPUT");
  const bytes = files[0]?.bytes ?? new Uint8Array(),
    base = safeFilename((files[0]?.name || "document").replace(/\.[^.]+$/, "")),
    output: OutputFile[] = [],
    notes: string[] = [];
  const pdf = (b: Uint8Array, name = `${base}-${slug}.pdf`) =>
    output.push({ bytes: b, name, mime: "application/pdf" });
  const text = (value: string, name: string, mime = "text/plain;charset=utf-8") =>
    output.push({ bytes: new TextEncoder().encode(value), name, mime });
  const progress = (done: number, total: number) =>
    onProgress(Math.round((done / total) * 100), `Processed ${done} of ${total} pages`);
  let previewText: string | undefined, metrics: { before: number; after: number } | undefined;
  switch (slug) {
    case "merge":
      pdf(await engine.mergePdfs(files.map((f) => f.bytes)), "merged.pdf");
      break;
    case "split": {
      const parts =
        o.splitMode === "each"
          ? await engine.splitEveryPage(bytes)
          : await engine.splitByRanges(bytes, o.ranges);
      parts.forEach((p) => pdf(p.bytes, p.name));
      break;
    }
    case "extract-pages":
      pdf(await engine.extractPages(bytes, o.ranges));
      break;
    case "remove-pages":
      pdf(await engine.removePages(bytes, o.ranges));
      break;
    case "organize":
      pdf(await engine.organizePdf(bytes, o.order, o.rotations));
      break;
    case "rotate":
      for (let i = 0; i < files.length; i++) {
        check();
        pdf(
          await engine.rotatePdf(files[i].bytes, o.angle),
          `${i + 1}-${safeFilename(files[i].name.replace(/\.pdf$/i, ""))}-rotated.pdf`,
        );
        onProgress(
          Math.round(((i + 1) / files.length) * 100),
          `Rotated ${i + 1} of ${files.length} files`,
        );
      }
      break;
    case "compress": {
      const r = await (
        await import("./pdf/render")
      ).compressPdf(bytes, o.compression, { signal, onProgress: progress, env });
      pdf(r.bytes);
      metrics = { before: r.before, after: r.after };
      notes.push(r.mode);
      break;
    }
    case "repair":
      pdf(await (await import("./pdf/secure")).repairPdf(bytes, signal));
      notes.push(
        "A readable PDF was produced. Review every page; missing source content cannot be recreated.",
      );
      break;
    case "pdf-to-jpg":
    case "pdf-to-png":
      output.push(
        ...(await (
          await import("./pdf/render")
        ).pdfToImages(bytes, {
          signal,
          scale: o.scale,
          quality: o.quality,
          format: slug === "pdf-to-png" ? "png" : "jpeg",
          pages: o.ranges.trim() || undefined,
          onProgress: progress,
          env,
        })),
      );
      break;
    case "jpg-to-pdf": {
      const render = await import("./pdf/render"),
        images = [];
      for (const file of files) {
        check();
        images.push(
          normalize
            ? await normalize(file.bytes, file.type)
            : await render.normalizeImage(file.bytes, file.type),
        );
      }
      pdf(
        await engine.imagesToPdf(images, {
          pageSize: o.pageSize,
          orientation: o.orientation,
          margin: o.margin,
        }),
        "images.pdf",
      );
      break;
    }
    case "pdf-to-word":
      output.push({
        bytes: await (await import("./pdf/convert")).pdfToDocx(bytes, signal, env),
        name: `${base}.docx`,
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      notes.push(
        "Structured export: headings, bordered and simple tables, bold/italic and embedded page images are detected. Multi-column order, charts and original fonts are simplified, not reconstructed.",
      );
      break;
    case "word-to-pdf":
      if (o.wordMode === "visual") {
        pdf(
          await (
            await import("./pdf/convertClient")
          ).wordToPdf(bytes, (p) => onProgress(p, "Rendering DOCX locally"), signal),
        );
        notes.push(
          "Image-based conversion. Complex Office layouts may differ and text is not selectable.",
        );
      } else {
        const converted = await (await import("./pdf/convert")).docxTextToPdf(bytes, signal);
        pdf(converted.bytes);
        notes.push(
          "Searchable text-first conversion. Layout is simplified; use Visual mode if exact appearance matters more than selectable text.",
        );
        for (const warning of converted.warnings) notes.push(warning);
      }
      break;
    case "pdf-to-markdown":
      previewText = await (await import("./pdf/convert")).pdfToMarkdown(bytes, signal, env);
      text(previewText, `${base}.md`, "text/markdown;charset=utf-8");
      notes.push(
        "Headings, lists and simple tables become Markdown, with small page images embedded. Multi-column order and appearance are simplified.",
      );
      break;
    case "pdf-to-excel": {
      const converted = await (await import("./pdf/convert")).pdfToXlsx(bytes, signal);
      output.push({
        bytes: converted.bytes,
        name: `${base}.xlsx`,
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      notes.push(
        `Workbook with ${converted.sheets} page ${converted.sheets === 1 ? "sheet" : "sheets"}. Simple positional grids are rebuilt; review numbers before relying on them.`,
      );
      if (converted.truncated)
        notes.push("The spreadsheet exceeded the 250,000-cell budget; later rows were skipped.");
      break;
    }
    case "excel-to-pdf": {
      const converted = await (await import("./pdf/convert")).xlsxToPdf(bytes, signal);
      pdf(converted.bytes);
      for (const warning of converted.warnings) notes.push(warning);
      break;
    }
    case "pdf-to-powerpoint": {
      const converted = await (await import("./pdf/pptx")).pdfToPptx(bytes, signal, env);
      output.push({
        bytes: converted.bytes,
        name: `${base}.pptx`,
        mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });
      notes.push(
        `Editable deck with ${converted.slides} ${converted.slides === 1 ? "slide" : "slides"}, one per page. Text, simple tables and embedded images become editable shapes; charts and precise layout are simplified.`,
      );
      if (converted.truncated)
        notes.push(
          "Some crowded pages were truncated to fit readable slides; check the last shapes on each slide.",
        );
      break;
    }
    case "powerpoint-to-pdf": {
      const converted = await (await import("./pdf/pptx")).pptxToPdf(bytes, signal);
      pdf(converted.bytes);
      for (const warning of converted.warnings) notes.push(warning);
      break;
    }
    case "fill-pdf-form": {
      const result = await engine.fillFormFields(bytes, o.fieldValues);
      pdf(result.bytes);
      notes.push(
        `Updated ${result.filled.length} field${result.filled.length === 1 ? "" : "s"}. Fields stay editable; use Flatten to make them static.`,
      );
      if (result.skipped.length)
        notes.push(
          `${result.skipped.length} field${result.skipped.length === 1 ? " was" : "s were"} skipped (read-only, unsupported or invalid value).`,
        );
      break;
    }
    case "summarize": {
      const summary = await (
        await import("./pdf/convert")
      ).pdfSummary(bytes, o.summaryLength, signal);
      previewText = summary.summary;
      text(summary.summary, `${base}-summary.txt`);
      notes.push(
        `Extractive summary: ${summary.picked} of ${summary.total} sentences, chosen locally by word frequency. This is not AI understanding; verify against the source.`,
      );
      if (summary.truncated)
        notes.push("Only the first 500,000 characters were considered for this summary.");
      break;
    }
    case "inspect": {
      const ai = await import("./ai/inspect");
      const insight = await ai.inspectDocument(bytes, { signal });
      previewText = ai.summarizeInsight(insight);
      text(
        ai.renderInsightReport(insight, files[0]?.name ?? "document.pdf"),
        `${base}-insight.md`,
        "text/markdown",
      );
      notes.push(
        "On-device analysis only: word-frequency language and topic guesses, pattern counts and PDF metadata. It does not understand or verify content.",
      );
      if (insight.truncated)
        notes.push("Only the first 500,000 characters were analyzed for this report.");
      break;
    }
    case "pdf-to-text":
      previewText = await (await import("./pdf/convert")).pdfToText(bytes, signal);
      text(previewText, `${base}.txt`);
      break;
    case "text-to-pdf": {
      const input = o.text.trim()
        ? o.text
        : new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      pdf(await engine.textToPdf(input, o.title || base, o.fontSize));
      break;
    }
    case "page-numbers":
      pdf(
        await engine.addPageNumbers(bytes, {
          position: o.position,
          start: o.start,
          fontSize: o.fontSize,
          withTotal: o.withTotal,
          prefix: o.prefix,
          padDigits: o.padDigits,
        }),
      );
      break;
    case "watermark":
      pdf(
        await engine.addWatermark(bytes, {
          text: o.watermarkText,
          fontSize: o.fontSize,
          opacity: o.opacity,
          rotation: o.watermarkRotation,
          color: {
            r: parseInt(o.color.slice(1, 3), 16) / 255,
            g: parseInt(o.color.slice(3, 5), 16) / 255,
            b: parseInt(o.color.slice(5, 7), 16) / 255,
          },
        }),
      );
      break;
    case "sign":
      if (!o.signature) throw new engine.PdfError("Type or draw a signature first.", "INPUT");
      pdf(
        await engine.signPdf(bytes, o.signature, {
          page: o.signaturePage,
          corner: o.signatureCorner,
          width: o.signatureWidth,
        }),
      );
      notes.push(
        "Visual electronic signature only. This is not a certificate-backed digital signature.",
      );
      break;
    case "protect":
      if (o.password !== o.passwordConfirm)
        throw new engine.PdfError("The two passwords do not match.", "INPUT");
      pdf(await (await import("./pdf/secure")).protectPdf(bytes, o.password, undefined, signal));
      notes.push(
        "AES-256 opening-password encryption. Store the password safely; there is no password recovery service.",
      );
      break;
    case "unlock":
      pdf(await (await import("./pdf/secure")).unlockPdf(bytes, o.password, signal));
      notes.push("Use this unprotected copy only where you have authorization.");
      break;
    case "crop":
      pdf(
        await engine.cropPdf(bytes, {
          top: o.cropTop,
          bottom: o.cropBottom,
          left: o.cropLeft,
          right: o.cropRight,
        }),
      );
      notes.push(
        "Crop changes the visible page boundary. Hidden content is not removed. Use Redact for sensitive information.",
      );
      break;
    case "resize":
      pdf(await engine.resizePdf(bytes, o.paper, o.landscape));
      break;
    case "flatten":
      pdf(await engine.flattenPdf(bytes));
      notes.push(
        "Standard form fields are now static. Other annotations and layers are not flattened.",
      );
      break;
    case "redact":
    case "sanitize":
      if (!o.confirm)
        throw new engine.PdfError(
          "Confirm you understand that the output is image-based and original text, forms and signatures will be removed.",
          "INPUT",
        );
      {
        const render = await import("./pdf/render");
        pdf(
          slug === "redact"
            ? await render.redactPdf(bytes, o.boxes, {
                scale: o.scale,
                signal,
                onProgress: progress,
                env,
              })
            : await render.rasterizePdf(bytes, {
                scale: o.scale,
                signal,
                onProgress: progress,
                env,
              }),
        );
        notes.push(
          "Fresh image-only PDF: no original selectable text, metadata, attachments, forms or links. Review visible content before sharing.",
        );
        if (slug === "redact") {
          const pages = (await engine.loadPdf(bytes)).getPageCount();
          text(
            render.formatRedactionLog(o.boxes, pages, files[0]?.name ?? "document.pdf", o.scale),
            `${base}-redaction-log.md`,
            "text/markdown",
          );
          notes.push(`${o.boxes.length} redacted regions recorded in the downloadable audit log.`);
        }
        break;
      }
    case "ocr": {
      let input = bytes;
      if (identifyFile(bytes, files[0].name) === "image") {
        const render = await import("./pdf/render");
        const image = normalize
          ? await normalize(bytes, files[0].type)
          : await render.normalizeImage(bytes, files[0].type);
        input = await engine.imagesToPdf([image], {
          pageSize: "fit",
          orientation: "auto",
          margin: 0,
        });
      }
      const r = await (
        await import("./pdf/convertClient")
      ).ocrPdf(input, o.language, { signal, onProgress: (p, label) => onProgress(p, label) });
      pdf(r.bytes, `${base}-searchable.pdf`);
      text(r.text, `${base}-ocr.txt`);
      previewText = r.text;
      notes.push(
        `OCR mean confidence: ${r.confidence}%. This is not a guarantee of accuracy. Check names, numbers and sensitive content.`,
      );
      break;
    }
    case "metadata":
      pdf(
        await engine.setMetadata(bytes, {
          title: o.title,
          author: o.author,
          subject: o.subject,
          keywords: o.keywords,
          clear: o.clearMetadata,
        }),
      );
      break;
    case "compare":
      if (files.length !== 2)
        throw new engine.PdfError("Choose exactly two PDFs to compare.", "INPUT");
      {
        const r = await (
          await import("./pdf/render")
        ).comparePdfs(bytes, files[1].bytes, { signal, onProgress: progress, env });
        output.push(...r.images);
        text(
          JSON.stringify(
            { method: "pixel comparison; RGB summed difference > 60", pages: r.summary },
            null,
            2,
          ),
          "comparison.json",
          "application/json",
        );
        notes.push(
          `${r.summary.filter((p) => p.changedPixels > 0).length} of ${r.summary.length} pages have visual differences. Red pixels mark changes; this is not semantic or legal review.`,
        );
        break;
      }
    case "extract-images": {
      const r = await (await import("./pdf/render")).extractEmbeddedImages(bytes, signal);
      output.push(...r.images);
      notes.push(
        `Extracted ${r.images.length} distinct images.${r.skipped ? ` ${r.skipped} unsupported image objects were skipped.` : ""}`,
      );
      break;
    }
    case "pdf-to-csv":
      previewText = await (await import("./pdf/convert")).pdfToCsv(bytes, signal);
      text(previewText, `${base}.csv`, "text/csv;charset=utf-8");
      notes.push(
        "CSV uses page, row, column and text fields. Review inferred columns; spreadsheet-formula prefixes are escaped.",
      );
      break;
    default:
      throw new engine.PdfError("This tool is not available.", "UNKNOWN");
  }
  check();
  if (!output.length || output.some((f) => !f.bytes.length))
    throw new engine.PdfError("The tool did not create a valid output.", "OUTPUT");
  return { files: output, notes, previewText, metrics };
}
