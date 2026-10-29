import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFName,
  PDFRadioGroup,
  PDFTextField,
  degrees,
  rgb,
  type PDFPage,
  pushGraphicsState,
  popGraphicsState,
  concatTransformationMatrix,
} from "pdf-lib";
import { embedTextFont } from "./fonts";

export class PdfError extends Error {
  constructor(
    message: string,
    public code = "PDF_ERROR",
  ) {
    super(message);
    this.name = "PdfError";
  }
}
export function finite(value: number, min: number, max: number, label: string) {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new PdfError(`${label} must be between ${min} and ${max}.`, "INPUT");
  return value;
}
export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  if (!bytes.length) throw new PdfError("This file is empty.", "INVALID");
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false });
    if (!doc.getPageCount()) throw new Error("No pages");
    return doc;
  } catch (error) {
    if (error instanceof PdfError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new PdfError(
      /encrypt|password/i.test(message)
        ? "This PDF is password-protected. Use Unlock first with a password you know."
        : "This file could not be read as a PDF. Try Repair, or choose a valid document.",
      /encrypt|password/i.test(message) ? "ENCRYPTED" : "INVALID",
    );
  }
}
export function parseRanges(spec: string, max: number): number[][] {
  if (!Number.isInteger(max) || max < 1) throw new PdfError("The document has no pages.", "RANGE");
  const groups = spec
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!groups.length || groups.length > 1000)
    throw new PdfError("Enter 1–1000 page groups, for example 1-3,5.", "RANGE");
  return groups.map((group) => {
    const m = group.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m)
      throw new PdfError(`Invalid range “${group}”. Use 2 or 1-4, separated by commas.`, "RANGE");
    const start = Number(m[1]),
      end = m[2] ? Number(m[2]) : start;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 1 ||
      end < start ||
      end > max
    )
      throw new PdfError(`Range “${group}” is outside this document (1–${max}).`, "RANGE");
    return Array.from({ length: end - start + 1 }, (_, i) => i + start);
  });
}
export function selectedPages(spec: string, max: number) {
  return [...new Set(parseRanges(spec, max).flat())];
}
export function validIndices(indices: number[], count: number) {
  if (
    !indices.length ||
    indices.length > 15000 ||
    indices.some((i) => !Number.isInteger(i) || i < 0 || i >= count)
  )
    throw new PdfError("Choose valid pages and keep at least one page.", "RANGE");
  return indices;
}
export async function mergePdfs(list: Uint8Array[]) {
  if (list.length < 2 || list.length > 50)
    throw new PdfError("Add between 2 and 50 PDFs to merge.", "INPUT");
  const out = await PDFDocument.create();
  for (const bytes of list) {
    const source = await loadPdf(bytes);
    (await out.copyPages(source, source.getPageIndices())).forEach((p) => out.addPage(p));
  }
  return out.save();
}
export async function splitByRanges(bytes: Uint8Array, spec: string) {
  const source = await loadPdf(bytes);
  const groups = parseRanges(spec, source.getPageCount());
  const results = [];
  for (let i = 0; i < groups.length; i++) {
    const out = await PDFDocument.create();
    (
      await out.copyPages(
        source,
        groups[i].map((n) => n - 1),
      )
    ).forEach((p) => out.addPage(p));
    results.push({
      name: `split-${String(i + 1).padStart(3, "0")}-pages-${groups[i][0]}-${groups[i].at(-1)}.pdf`,
      bytes: await out.save(),
    });
  }
  return results;
}
export async function splitEveryPage(bytes: Uint8Array) {
  const d = await loadPdf(bytes);
  return splitByRanges(
    bytes,
    Array.from({ length: d.getPageCount() }, (_, i) => String(i + 1)).join(","),
  );
}
export async function extractPages(bytes: Uint8Array, spec: string) {
  const source = await loadPdf(bytes);
  const out = await PDFDocument.create();
  (
    await out.copyPages(
      source,
      selectedPages(spec, source.getPageCount()).map((n) => n - 1),
    )
  ).forEach((p) => out.addPage(p));
  return out.save();
}
export async function removePages(bytes: Uint8Array, spec: string) {
  const d = await loadPdf(bytes);
  const remove = new Set(selectedPages(spec, d.getPageCount()));
  const keep = d.getPageIndices().filter((i) => !remove.has(i + 1));
  if (!keep.length)
    throw new PdfError(
      "Keep at least one page. You selected the entire document for removal.",
      "INPUT",
    );
  return organizePdf(bytes, keep);
}
export async function rotatePdf(bytes: Uint8Array, angle: number) {
  if (![90, 180, 270].includes(angle)) throw new PdfError("Choose 90°, 180° or 270°.", "INPUT");
  const d = await loadPdf(bytes);
  d.getPages().forEach((p) => p.setRotation(degrees((p.getRotation().angle + angle) % 360)));
  return d.save();
}
export async function organizePdf(
  bytes: Uint8Array,
  order: number[],
  rotations: Record<number, number> = {},
) {
  const source = await loadPdf(bytes);
  validIndices(order, source.getPageCount());
  const out = await PDFDocument.create();
  (await out.copyPages(source, order)).forEach((p, i) => {
    const a = rotations[order[i]] ?? 0;
    if (!Number.isFinite(a) || a % 90 !== 0)
      throw new PdfError("Page rotation must be a multiple of 90°.", "INPUT");
    p.setRotation(degrees((((p.getRotation().angle + a) % 360) + 360) % 360));
    out.addPage(p);
  });
  return out.save();
}
export type NumberPosition =
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "top-left"
  | "top-center"
  | "top-right";
export function visiblePage(page: PDFPage) {
  const box = page.getCropBox(),
    angle = ((page.getRotation().angle % 360) + 360) % 360;
  return {
    box,
    angle,
    width: angle % 180 ? box.height : box.width,
    height: angle % 180 ? box.width : box.height,
  };
}
function inVisibleCoordinates(page: PDFPage, draw: (width: number, height: number) => void) {
  const { box: b, angle, width, height } = visiblePage(page);
  const m: Record<number, [number, number, number, number, number, number]> = {
    0: [1, 0, 0, 1, b.x, b.y],
    90: [0, 1, -1, 0, b.x + b.width, b.y],
    180: [-1, 0, 0, -1, b.x + b.width, b.y + b.height],
    270: [0, -1, 1, 0, b.x, b.y + b.height],
  };
  if (!m[angle])
    throw new PdfError("Non-quarter-turn page rotations are unsupported.", "UNSUPPORTED");
  page.pushOperators(pushGraphicsState(), concatTransformationMatrix(...m[angle]));
  draw(width, height);
  page.pushOperators(popGraphicsState());
}
export async function addPageNumbers(
  bytes: Uint8Array,
  opts: {
    position: NumberPosition;
    start: number;
    fontSize: number;
    withTotal: boolean;
    margin?: number;
  },
) {
  finite(opts.start, 1, 1000000, "Starting number");
  if (!Number.isInteger(opts.start))
    throw new PdfError("The starting number must be a whole number.", "INPUT");
  finite(opts.fontSize, 6, 72, "Font size");
  if (!/^(top|bottom)-(left|center|right)$/.test(opts.position))
    throw new PdfError("Choose a valid number position.", "INPUT");
  const d = await loadPdf(bytes),
    font = await embedTextFont(d, "0123456789 /"),
    pages = d.getPages();
  pages.forEach((p, i) =>
    inVisibleCoordinates(p, (w, h) => {
      const n = opts.start + i,
        label = opts.withTotal ? `${n} / ${opts.start + pages.length - 1}` : String(n),
        width = font.widthOfTextAtSize(label, opts.fontSize),
        margin = opts.margin ?? 28;
      const [v, horizontal] = opts.position.split("-");
      if (w < width + margin * 2 || h < opts.fontSize + margin * 2)
        throw new PdfError(
          "This page is too small for the chosen number size and margins.",
          "INPUT",
        );
      p.drawText(label, {
        font,
        size: opts.fontSize,
        x:
          horizontal === "left"
            ? margin
            : horizontal === "right"
              ? w - margin - width
              : (w - width) / 2,
        y: v === "bottom" ? margin : h - margin - opts.fontSize,
        color: rgb(0.22, 0.25, 0.32),
      });
    }),
  );
  return d.save();
}
export async function addWatermark(
  bytes: Uint8Array,
  opts: {
    text: string;
    fontSize: number;
    opacity: number;
    rotation: number;
    color: { r: number; g: number; b: number };
  },
) {
  if (!opts.text.trim() || opts.text.length > 300)
    throw new PdfError("Enter 1–300 characters of watermark text.", "INPUT");
  finite(opts.fontSize, 6, 160, "Font size");
  finite(opts.opacity, 0.01, 1, "Opacity");
  finite(opts.rotation, -180, 180, "Rotation");
  const d = await loadPdf(bytes),
    font = await embedTextFont(d, opts.text, true);
  for (const p of d.getPages())
    inVisibleCoordinates(p, (w, h) => {
      const textWidth = font.widthOfTextAtSize(opts.text, opts.fontSize);
      const r = (opts.rotation * Math.PI) / 180;
      p.drawText(opts.text, {
        font,
        size: opts.fontSize,
        x: w / 2 - (textWidth / 2) * Math.cos(r) + (opts.fontSize / 2) * Math.sin(r),
        y: h / 2 - (textWidth / 2) * Math.sin(r) - (opts.fontSize / 2) * Math.cos(r),
        opacity: opts.opacity,
        rotate: degrees(opts.rotation),
        color: rgb(opts.color.r, opts.color.g, opts.color.b),
      });
    });
  return d.save();
}
export async function imagesToPdf(
  images: { bytes: Uint8Array; type: string }[],
  opts: { pageSize: "fit" | "a4"; orientation: "auto" | "portrait" | "landscape"; margin: number },
) {
  if (!images.length) throw new PdfError("Add at least one supported image.", "INPUT");
  finite(opts.margin, 0, 100, "Image margin");
  const out = await PDFDocument.create();
  for (const image of images) {
    let embedded;
    try {
      embedded =
        image.bytes[0] === 0x89 ? await out.embedPng(image.bytes) : await out.embedJpg(image.bytes);
    } catch {
      throw new PdfError(
        "The image could not be decoded. Choose JPG, PNG or a supported WebP image.",
        "INVALID",
      );
    }
    const iw = embedded.width,
      ih = embedded.height;
    let pw: number, ph: number;
    if (opts.pageSize === "fit") {
      pw = iw + opts.margin * 2;
      ph = ih + opts.margin * 2;
    } else {
      const landscape =
        opts.orientation === "landscape" || (opts.orientation === "auto" && iw > ih);
      [pw, ph] = landscape ? [841.89, 595.28] : [595.28, 841.89];
    }
    const scale = Math.min((pw - opts.margin * 2) / iw, (ph - opts.margin * 2) / ih);
    out.addPage([pw, ph]).drawImage(embedded, {
      x: (pw - iw * scale) / 2,
      y: (ph - ih * scale) / 2,
      width: iw * scale,
      height: ih * scale,
    });
  }
  return out.save();
}
export async function signPdf(
  bytes: Uint8Array,
  png: Uint8Array,
  opts: {
    page: number;
    corner: "bottom-right" | "bottom-left" | "top-right" | "top-left";
    width: number;
    margin?: number;
  },
) {
  const d = await loadPdf(bytes);
  finite(opts.width, 30, 500, "Signature width");
  if (!/^(top|bottom)-(left|right)$/.test(opts.corner))
    throw new PdfError("Choose a valid signature corner.", "INPUT");
  const index = opts.page === 0 ? d.getPageCount() - 1 : opts.page - 1;
  validIndices([index], d.getPageCount());
  const image = await d.embedPng(png),
    page = d.getPage(index);
  inVisibleCoordinates(page, (w, h) => {
    const margin = opts.margin ?? 30;
    if (w <= margin * 2 || h <= margin * 2)
      throw new PdfError("This page is too small for the signature margins.", "INPUT");
    const width = Math.min(
        opts.width,
        w - margin * 2,
        ((h - margin * 2) * image.width) / image.height,
      ),
      height = (image.height / image.width) * width;
    const [v, horizontal] = opts.corner.split("-");
    page.drawImage(image, {
      x: horizontal === "right" ? w - margin - width : margin,
      y: v === "bottom" ? margin : h - margin - height,
      width,
      height,
    });
  });
  return d.save();
}
export async function cropPdf(
  bytes: Uint8Array,
  margins: { top: number; bottom: number; left: number; right: number },
) {
  for (const [key, v] of Object.entries(margins)) finite(v, 0, 2000, `${key} margin`);
  const d = await loadPdf(bytes);
  for (const p of d.getPages()) {
    const { box, angle } = visiblePage(p),
      m = margins;
    const r =
      angle === 90
        ? { left: m.top, right: m.bottom, top: m.right, bottom: m.left }
        : angle === 180
          ? { left: m.right, right: m.left, top: m.bottom, bottom: m.top }
          : angle === 270
            ? { left: m.bottom, right: m.top, top: m.left, bottom: m.right }
            : m;
    if (box.width <= r.left + r.right || box.height <= r.top + r.bottom)
      throw new PdfError(
        "These margins remove the entire visible page. Use smaller margins.",
        "INPUT",
      );
    p.setCropBox(
      box.x + r.left,
      box.y + r.bottom,
      box.width - r.left - r.right,
      box.height - r.top - r.bottom,
    );
  }
  return d.save();
}
const PAPER = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  legal: [612, 1008],
  a3: [841.89, 1190.55],
} as const;
export async function resizePdf(bytes: Uint8Array, size: keyof typeof PAPER, landscape = false) {
  if (!PAPER[size]) throw new PdfError("Choose a supported paper size.", "INPUT");
  const source = await loadPdf(bytes),
    out = await PDFDocument.create();
  if (source.getForm().getFields().length)
    throw new PdfError("Flatten filled form fields before resizing this document.", "INPUT");
  for (const p of source.getPages()) {
    let [w, h]: number[] = [...PAPER[size]];
    if (landscape) [w, h] = [h, w];
    const target = out.addPage([w, h]);
    if (!p.node.Contents()) continue;
    const { box, angle, width, height } = visiblePage(p),
      embedded = await out.embedPage(p, {
        left: box.x,
        bottom: box.y,
        right: box.x + box.width,
        top: box.y + box.height,
      }),
      scale = Math.min(w / width, h / height),
      x = (w - width * scale) / 2,
      y = (h - height * scale) / 2;
    target.drawPage(embedded, {
      x: x + (angle === 180 ? box.width : angle === 270 ? box.height : 0) * scale,
      y: y + (angle === 90 ? box.width : angle === 180 ? box.height : 0) * scale,
      width: box.width * scale,
      height: box.height * scale,
      rotate: degrees(-angle),
    });
  }
  return out.save();
}
export async function flattenPdf(bytes: Uint8Array) {
  const d = await loadPdf(bytes),
    form = d.getForm();
  if (form.hasXFA())
    throw new PdfError(
      "XFA forms are not supported. Export a standard PDF from the original application first.",
      "UNSUPPORTED",
    );
  form.flatten();
  return d.save();
}

export type FormFieldInfo = {
  name: string;
  type: "text" | "checkbox" | "choice";
  value: string;
  options: string[];
  readOnly: boolean;
};

export async function listFormFields(bytes: Uint8Array): Promise<FormFieldInfo[]> {
  const d = await loadPdf(bytes),
    form = d.getForm();
  if (form.hasXFA())
    throw new PdfError(
      "XFA forms are not supported. Export a standard PDF from the original application first.",
      "UNSUPPORTED",
    );
  const fields = form.getFields();
  if (fields.length > 2000)
    throw new PdfError("This form has too many fields to fill in one run.", "LIMIT");
  return fields.map((field) => {
    const name = field.getName(),
      readOnly = field.isReadOnly();
    if (field instanceof PDFTextField) {
      return { name, type: "text", value: field.getText() ?? "", options: [], readOnly };
    }
    if (field instanceof PDFCheckBox) {
      return {
        name,
        type: "checkbox",
        value: field.isChecked() ? "true" : "false",
        options: [],
        readOnly,
      };
    }
    if (field instanceof PDFDropdown) {
      return {
        name,
        type: "choice",
        value: (field.getSelected() ?? []).join(", "),
        options: field.getOptions(),
        readOnly,
      };
    }
    if (field instanceof PDFRadioGroup) {
      return {
        name,
        type: "choice",
        value: field.getSelected() ?? "",
        options: field.getOptions(),
        readOnly,
      };
    }
    return { name, type: "text", value: "", options: [], readOnly: true };
  });
}

export async function fillFormFields(bytes: Uint8Array, values: Record<string, string>) {
  const d = await loadPdf(bytes),
    form = d.getForm();
  if (form.hasXFA())
    throw new PdfError(
      "XFA forms are not supported. Export a standard PDF from the original application first.",
      "UNSUPPORTED",
    );
  const filled: string[] = [],
    skipped: string[] = [];
  for (const field of form.getFields()) {
    const name = field.getName();
    if (!(name in values)) continue;
    const raw = values[name] ?? "";
    if (raw.length > 10000) {
      skipped.push(name);
      continue;
    }
    try {
      if (field.isReadOnly()) {
        skipped.push(name);
        continue;
      }
      if (field instanceof PDFTextField) {
        const max = field.getMaxLength();
        field.setText(max !== undefined ? raw.slice(0, max) : raw);
        filled.push(name);
      } else if (field instanceof PDFCheckBox) {
        if (/^(true|1|yes|on|checked)$/i.test(raw.trim())) field.check();
        else field.uncheck();
        filled.push(name);
      } else if (field instanceof PDFDropdown || field instanceof PDFRadioGroup) {
        if (field.getOptions().includes(raw)) {
          field.select(raw);
          filled.push(name);
        } else skipped.push(name);
      } else skipped.push(name);
    } catch {
      skipped.push(name);
    }
  }
  if (!filled.length)
    throw new PdfError(
      "No fillable fields were updated. Check the field names and values.",
      "NO_FIELDS",
    );
  try {
    const { StandardFonts } = await import("pdf-lib");
    form.updateFieldAppearances(await d.embedFont(StandardFonts.Helvetica));
  } catch {
    // Appearances are a rendering hint; values are already stored.
  }
  return { bytes: await d.save(), filled, skipped };
}
export type MetadataInput = {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  clear?: boolean;
};
export async function setMetadata(bytes: Uint8Array, metadata: MetadataInput) {
  const d = await loadPdf(bytes);
  d.catalog.delete(PDFName.of("Metadata"));
  d.setTitle(metadata.clear ? "" : metadata.title.slice(0, 1000));
  d.setAuthor(metadata.clear ? "" : metadata.author.slice(0, 1000));
  d.setSubject(metadata.clear ? "" : metadata.subject.slice(0, 2000));
  d.setKeywords(
    metadata.clear
      ? []
      : metadata.keywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
  );
  if (metadata.clear) {
    d.setProducer("");
    d.setCreator("");
    const info = d.context.lookup(d.context.trailerInfo.Info);
    if (info && "delete" in info) {
      const dictionary = info as { delete: (key: PDFName) => void };
      dictionary.delete(PDFName.of("CreationDate"));
      dictionary.delete(PDFName.of("ModDate"));
    }
  }
  return d.save();
}
export async function getMetadata(bytes: Uint8Array) {
  const d = await loadPdf(bytes);
  return {
    pages: d.getPageCount(),
    title: d.getTitle() || "",
    author: d.getAuthor() || "",
    subject: d.getSubject() || "",
    keywords: d.getKeywords() || "",
    producer: d.getProducer() || "",
    created: d.getCreationDate()?.toISOString() || "",
  };
}
export async function textToPdf(text: string, title = "Text document", size = 12) {
  if (!text.trim()) throw new PdfError("The text document is empty.", "INPUT");
  if (text.length > 2000000)
    throw new PdfError("Text is too long. Split it into smaller files.", "LIMIT");
  finite(size, 8, 32, "Text size");
  const d = await PDFDocument.create(),
    font = await embedTextFont(d, text + title);
  d.setTitle(title.slice(0, 200));
  const margin = 48,
    width = 595.28,
    maxWidth = width - margin * 2,
    lineHeight = size * 1.55;
  let page: PDFPage = d.addPage([width, 841.89]),
    y = 841.89 - margin - size;
  const line = (s: string) => {
    if (y < margin + size) {
      page = d.addPage([width, 841.89]);
      y = 841.89 - margin - size;
    }
    if (s) page.drawText(s, { x: margin, y, size, font, color: rgb(0.12, 0.15, 0.2) });
    y -= lineHeight;
  };
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (!raw.trim()) {
      line("");
      continue;
    }
    let current = "";
    for (const word of raw.replace(/\t/g, "    ").split(/ +/)) {
      const trial = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(trial, size) <= maxWidth) current = trial;
      else {
        if (current) line(current);
        current = "";
        for (const character of word) {
          if (font.widthOfTextAtSize(current + character, size) > maxWidth && current) {
            line(current);
            current = "";
          }
          current += character;
        }
      }
    }
    if (current) line(current);
  }
  return d.save();
}
export function toBlob(bytes: Uint8Array, mime: string) {
  return new Blob([bytes.slice().buffer as ArrayBuffer], { type: mime });
}
