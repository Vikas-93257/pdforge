import { assetUrl, LIMITS } from "../site";
import { PdfError, selectedPages, loadPdf } from "./engine";
import { losslessOptimize } from "./secure";
import { imageDimensions } from "./imageHeader";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
export type CanvasEnv = {
  createCanvas(w: number, h: number): { canvas: unknown; ctx: unknown };
  toBytes(canvas: unknown, format: "jpeg" | "png", quality: number): Promise<Uint8Array>;
};
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | undefined;
export async function getPdfjs() {
  if (!pdfjsPromise)
    pdfjsPromise = (async () => {
      if (typeof window === "undefined") {
        const mod = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const { createRequire } = await import(
          /* webpackIgnore: true */ /* turbopackIgnore: true */ "node:module"
        );
        mod.GlobalWorkerOptions.workerSrc = createRequire(import.meta.url).resolve(
          "pdfjs-dist/legacy/build/pdf.worker.mjs",
        );
        return mod as unknown as typeof import("pdfjs-dist");
      }
      const mod = await import("pdfjs-dist");
      mod.GlobalWorkerOptions.workerSrc = assetUrl("/engines/pdfjs/pdf.worker.min.mjs");
      return mod;
    })();
  return pdfjsPromise;
}
export function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new PdfError("Processing cancelled.", "CANCELLED");
}
export async function openDocument(bytes: Uint8Array) {
  const pdfjs = await getPdfjs();
  const local = typeof window === "undefined";
  const prefix = local ? `${process.cwd()}/node_modules/pdfjs-dist/` : assetUrl("/engines/pdfjs/");
  const task = pdfjs.getDocument({
    data: bytes.slice(),
    cMapUrl: prefix + "cmaps/",
    cMapPacked: true,
    standardFontDataUrl: prefix + "standard_fonts/",
    wasmUrl: prefix + "wasm/",
    iccUrl: prefix + "iccs/",
    useSystemFonts: local,
    disableFontFace: local,
  });
  try {
    const doc = await task.promise;
    return {
      doc,
      destroy: async () => {
        await task.destroy();
      },
    };
  } catch (error) {
    await task.destroy().catch(() => {});
    const message = error instanceof Error ? error.message : String(error);
    throw new PdfError(
      /password/i.test(message)
        ? "This PDF needs its password. Use Unlock first."
        : "The PDF renderer could not read this file. Try Repair or choose another file.",
      /password/i.test(message) ? "ENCRYPTED" : "INVALID",
    );
  }
}
export function browserEnv(): CanvasEnv {
  return {
    createCanvas(w, h) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(w));
      canvas.height = Math.max(1, Math.floor(h));
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new PdfError("A 2D canvas is not available in this browser.", "BROWSER");
      return { canvas, ctx };
    },
    async toBytes(canvas, format, quality) {
      const c = canvas as HTMLCanvasElement;
      const blob = await new Promise<Blob>((resolve, reject) =>
        c.toBlob(
          (b) =>
            b
              ? resolve(b)
              : reject(new PdfError("The rendered page could not be exported.", "BROWSER")),
          format === "png" ? "image/png" : "image/jpeg",
          quality,
        ),
      );
      return new Uint8Array(await blob.arrayBuffer());
    },
  };
}
export async function renderPage(page: PDFPageProxy, scale: number, env: CanvasEnv) {
  const base = page.getViewport({ scale: 1 });
  const capped = Math.min(Math.max(0.1, scale), Math.sqrt(16000000 / (base.width * base.height)));
  const viewport = page.getViewport({ scale: capped });
  const { canvas, ctx } = env.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = ctx as CanvasRenderingContext2D;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, viewport.width, viewport.height);
  await page.render({ canvas: canvas as HTMLCanvasElement, canvasContext: context, viewport })
    .promise;
  return {
    canvas,
    ctx: context,
    width: Math.ceil(viewport.width),
    height: Math.ceil(viewport.height),
    pointWidth: base.width,
    pointHeight: base.height,
  };
}
export type RenderOpts = {
  scale?: number;
  format?: "jpeg" | "png";
  quality?: number;
  pages?: string;
  env?: CanvasEnv;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
};
export async function pdfToImages(bytes: Uint8Array, opts: RenderOpts = {}) {
  const env = opts.env ?? browserEnv(),
    { doc, destroy } = await openDocument(bytes);
  const numbers = opts.pages
    ? selectedPages(opts.pages, doc.numPages)
    : Array.from({ length: doc.numPages }, (_, i) => i + 1);
  if (numbers.length > LIMITS.renderPages) {
    await destroy();
    throw new PdfError(
      `Render up to ${LIMITS.renderPages} pages at once. Split larger documents first.`,
      "LIMIT",
    );
  }
  const result = [];
  let outputBytes = 0;
  try {
    for (let i = 0; i < numbers.length; i++) {
      checkAbort(opts.signal);
      const page = await doc.getPage(numbers[i]),
        render = await renderPage(page, opts.scale ?? 1.5, env),
        format = opts.format ?? "jpeg";
      const data = await env.toBytes(render.canvas, format, opts.quality ?? 0.9);
      outputBytes += data.length;
      if (outputBytes > 250 * 1024 * 1024)
        throw new PdfError(
          "Rendered output exceeds the 250 MB safety budget. Export a smaller page range.",
          "LIMIT",
        );
      result.push({
        name: `page-${String(numbers[i]).padStart(3, "0")}.${format === "jpeg" ? "jpg" : "png"}`,
        bytes: data,
        mime: format === "jpeg" ? "image/jpeg" : "image/png",
      });
      page.cleanup();
      opts.onProgress?.(i + 1, numbers.length);
    }
  } finally {
    await destroy();
  }
  return result;
}
export const renderPages = pdfToImages;
export function smallestCandidate(
  original: Uint8Array,
  candidates: { bytes: Uint8Array; mode: string }[],
) {
  let best = { bytes: original, mode: "Already optimized — original preserved" };
  for (const candidate of candidates)
    if (candidate.bytes.length < best.bytes.length) best = candidate;
  return best;
}
export async function compressPdf(
  bytes: Uint8Array,
  level: "lossless" | "recommended" | "extreme" = "lossless",
  opts: {
    env?: CanvasEnv;
    signal?: AbortSignal;
    onProgress?: (done: number, total: number) => void;
  } = {},
) {
  await loadPdf(bytes);
  const candidates: { bytes: Uint8Array; mode: string }[] = [];
  checkAbort(opts.signal);
  let losslessFailed = false;
  try {
    candidates.push({
      bytes: await losslessOptimize(bytes, opts.signal),
      mode: "Lossless optimization — text preserved",
    });
  } catch (error) {
    if (error instanceof PdfError && error.code === "CANCELLED") throw error;
    losslessFailed = true;
  }
  if (level !== "lossless") {
    const images = await pdfToImages(bytes, {
      env: opts.env,
      signal: opts.signal,
      scale: level === "extreme" ? 1 : 1.5,
      quality: level === "extreme" ? 0.45 : 0.7,
      format: "jpeg",
      onProgress: opts.onProgress,
    });
    const { PDFDocument } = await import("pdf-lib");
    const output = await PDFDocument.create();
    const { doc, destroy } = await openDocument(bytes);
    try {
      for (let i = 0; i < images.length; i++) {
        const p = await doc.getPage(i + 1),
          v = p.getViewport({ scale: 1 }),
          image = await output.embedJpg(images[i].bytes);
        output
          .addPage([v.width, v.height])
          .drawImage(image, { x: 0, y: 0, width: v.width, height: v.height });
      }
    } finally {
      await destroy();
    }
    candidates.push({
      bytes: await output.save(),
      mode: "Image-based compression — text, forms and links flattened",
    });
  }
  const selected = smallestCandidate(bytes, candidates);
  return {
    bytes: selected.bytes,
    before: bytes.length,
    after: selected.bytes.length,
    mode:
      losslessFailed && selected.bytes === bytes
        ? "Lossless processing unavailable — original preserved"
        : selected.mode,
  };
}
export async function getPageCount(bytes: Uint8Array) {
  const { doc, destroy } = await openDocument(bytes);
  try {
    return doc.numPages;
  } finally {
    await destroy();
  }
}
export async function getThumbnails(bytes: Uint8Array, maxWidth = 150, signal?: AbortSignal) {
  const env = browserEnv(),
    { doc, destroy } = await openDocument(bytes);
  if (doc.numPages > LIMITS.renderPages) {
    await destroy();
    throw new PdfError(
      `Preview up to ${LIMITS.renderPages} pages. Split the document first.`,
      "LIMIT",
    );
  }
  const result = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      checkAbort(signal);
      const p = await doc.getPage(i),
        base = p.getViewport({ scale: 1 }),
        r = await renderPage(p, maxWidth / base.width, env);
      result.push({
        page: i,
        dataUrl: (r.canvas as HTMLCanvasElement).toDataURL("image/jpeg", 0.7),
        rotation: p.rotate,
      });
      p.cleanup();
    }
  } finally {
    await destroy();
  }
  return result;
}
export type RedactionBox = { page: number; x: number; y: number; width: number; height: number };
export async function rasterizePdf(
  bytes: Uint8Array,
  opts: {
    scale?: number;
    boxes?: RedactionBox[];
    env?: CanvasEnv;
    signal?: AbortSignal;
    onProgress?: (done: number, total: number) => void;
  } = {},
) {
  const env = opts.env ?? browserEnv(),
    { doc, destroy } = await openDocument(bytes);
  if (doc.numPages > LIMITS.renderPages) {
    await destroy();
    throw new PdfError(
      `Process at most ${LIMITS.renderPages} pages at once. Split larger PDFs first.`,
      "LIMIT",
    );
  }
  for (const b of opts.boxes ?? [])
    if (
      !Number.isInteger(b.page) ||
      b.page < 1 ||
      b.page > doc.numPages ||
      ![b.x, b.y, b.width, b.height].every(Number.isFinite) ||
      b.x < 0 ||
      b.y < 0 ||
      b.width <= 0 ||
      b.height <= 0 ||
      b.x + b.width > 1.001 ||
      b.y + b.height > 1.001
    ) {
      await destroy();
      throw new PdfError("A redaction region is outside the page or has no area.", "INPUT");
    }
  const { PDFDocument } = await import("pdf-lib");
  const out = await PDFDocument.create();
  let pixels = 0;
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      checkAbort(opts.signal);
      const page = await doc.getPage(i),
        r = await renderPage(page, opts.scale ?? 1.5, env);
      pixels += r.width * r.height;
      if (pixels > 80000000)
        throw new PdfError(
          "This rebuild exceeds the 80-megapixel session budget. Split the PDF or lower the resolution.",
          "LIMIT",
        );
      for (const b of (opts.boxes ?? []).filter((b) => b.page === i)) {
        r.ctx.fillStyle = "#000";
        r.ctx.fillRect(
          Math.max(0, Math.floor(b.x * r.width) - 2),
          Math.max(0, Math.floor(b.y * r.height) - 2),
          Math.ceil(b.width * r.width) + 4,
          Math.ceil(b.height * r.height) + 4,
        );
      }
      const png = await env.toBytes(r.canvas, "png", 1),
        image = await out.embedPng(png);
      out
        .addPage([r.pointWidth, r.pointHeight])
        .drawImage(image, { x: 0, y: 0, width: r.pointWidth, height: r.pointHeight });
      page.cleanup();
      opts.onProgress?.(i, doc.numPages);
    }
  } finally {
    await destroy();
  }
  out.setProducer("PDFORGE visual-only rebuild");
  return out.save();
}
export async function redactPdf(
  bytes: Uint8Array,
  boxes: RedactionBox[],
  opts: Omit<Parameters<typeof rasterizePdf>[1], "boxes"> = {},
) {
  if (!boxes.length)
    throw new PdfError("Select at least one region to redact. Nothing has been changed.", "INPUT");
  return rasterizePdf(bytes, { ...opts, boxes });
}
export async function normalizeImage(bytes: Uint8Array, type: string) {
  if (typeof createImageBitmap === "undefined")
    throw new PdfError("Image decoding is unavailable. Use a current browser.", "BROWSER");
  imageDimensions(bytes);
  const bitmap = await createImageBitmap(new Blob([bytes.slice().buffer], { type }));
  try {
    if (bitmap.width * bitmap.height > 24000000)
      throw new PdfError("This image exceeds 24 megapixels. Resize it before processing.", "LIMIT");
    const { canvas, ctx } = browserEnv().createCanvas(bitmap.width, bitmap.height);
    (ctx as CanvasRenderingContext2D).drawImage(bitmap, 0, 0);
    const jpeg = /jpe?g/i.test(type);
    return {
      bytes: await browserEnv().toBytes(canvas, jpeg ? "jpeg" : "png", 0.95),
      type: jpeg ? "image/jpeg" : "image/png",
    };
  } finally {
    bitmap.close();
  }
}
export async function comparePdfs(
  first: Uint8Array,
  second: Uint8Array,
  opts: {
    signal?: AbortSignal;
    onProgress?: (done: number, total: number) => void;
    env?: CanvasEnv;
  } = {},
) {
  const env = opts.env ?? browserEnv(),
    a = await openDocument(first),
    b = await openDocument(second);
  const total = Math.max(a.doc.numPages, b.doc.numPages);
  if (total > LIMITS.renderPages) {
    await a.destroy();
    await b.destroy();
    throw new PdfError("Split the documents before comparing more than 150 pages.", "LIMIT");
  }
  const images = [],
    summary = [];
  try {
    for (let i = 1; i <= total; i++) {
      checkAbort(opts.signal);
      const ar = i <= a.doc.numPages ? await renderPage(await a.doc.getPage(i), 1, env) : null,
        br = i <= b.doc.numPages ? await renderPage(await b.doc.getPage(i), 1, env) : null;
      const width = Math.max(ar?.width ?? 0, br?.width ?? 0),
        height = Math.max(ar?.height ?? 0, br?.height ?? 0);
      const ca = env.createCanvas(width, height),
        cb = env.createCanvas(width, height);
      const ac = ca.ctx as CanvasRenderingContext2D,
        bc = cb.ctx as CanvasRenderingContext2D;
      for (const c of [ac, bc]) {
        c.fillStyle = "#fff";
        c.fillRect(0, 0, width, height);
      }
      if (ar) ac.drawImage(ar.canvas as HTMLCanvasElement, 0, 0);
      if (br) bc.drawImage(br.canvas as HTMLCanvasElement, 0, 0);
      const ad = ac.getImageData(0, 0, width, height),
        bd = bc.getImageData(0, 0, width, height),
        diff = ac.createImageData(width, height);
      let changed = 0;
      for (let p = 0; p < ad.data.length; p += 4) {
        const delta =
          Math.abs(ad.data[p] - bd.data[p]) +
          Math.abs(ad.data[p + 1] - bd.data[p + 1]) +
          Math.abs(ad.data[p + 2] - bd.data[p + 2]);
        const different = !ar || !br || delta > 60;
        if (different) changed++;
        diff.data[p] = different ? 239 : Math.round((ad.data[p] + bd.data[p]) / 2);
        diff.data[p + 1] = different ? 68 : Math.round((ad.data[p + 1] + bd.data[p + 1]) / 2);
        diff.data[p + 2] = different ? 68 : Math.round((ad.data[p + 2] + bd.data[p + 2]) / 2);
        diff.data[p + 3] = 255;
      }
      ac.putImageData(diff, 0, 0);
      images.push({
        name: `difference-page-${String(i).padStart(3, "0")}.png`,
        bytes: await env.toBytes(ca.canvas, "png", 1),
        mime: "image/png",
      });
      summary.push({
        page: i,
        changedPixels: changed,
        totalPixels: width * height,
        changedPercent: Number(((100 * changed) / (width * height)).toFixed(3)),
        missingFromFirst: !ar,
        missingFromSecond: !br,
      });
      opts.onProgress?.(i, total);
    }
  } finally {
    await a.destroy();
    await b.destroy();
  }
  return { images, summary };
}
export async function extractEmbeddedImages(bytes: Uint8Array, signal?: AbortSignal) {
  const pdfjs = await getPdfjs(),
    { doc, destroy } = await openDocument(bytes),
    env = browserEnv(),
    seen = new Set<string>(),
    images = [];
  let skipped = 0;
  type Image = {
    width: number;
    height: number;
    data?: Uint8ClampedArray | Uint8Array;
    bitmap?: ImageBitmap;
    kind?: number;
  };
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      checkAbort(signal);
      const page = await doc.getPage(i),
        ops = await page.getOperatorList();
      for (let j = 0; j < ops.fnArray.length; j++) {
        const fn = ops.fnArray[j];
        if (
          ![
            pdfjs.OPS.paintImageXObject,
            pdfjs.OPS.paintInlineImageXObject,
            pdfjs.OPS.paintImageXObjectRepeat,
          ].includes(fn)
        )
          continue;
        try {
          let image: Image;
          if (fn === pdfjs.OPS.paintInlineImageXObject) image = ops.argsArray[j][0] as Image;
          else {
            const key = String(ops.argsArray[j][0]);
            image = await new Promise<Image>((resolve) => page.objs.get(key, resolve));
          }
          const { width, height } = image;
          if (!width || !height || width * height > 24000000) {
            skipped++;
            continue;
          }
          const { canvas, ctx } = env.createCanvas(width, height),
            c = ctx as CanvasRenderingContext2D;
          if (image.bitmap) c.drawImage(image.bitmap, 0, 0);
          else if (image.data) {
            const output = c.createImageData(width, height),
              source = image.data;
            if (source.length === width * height * 4) output.data.set(source);
            else if (source.length === width * height * 3) {
              for (let p = 0, k = 0; p < source.length; p += 3, k += 4) {
                output.data[k] = source[p];
                output.data[k + 1] = source[p + 1];
                output.data[k + 2] = source[p + 2];
                output.data[k + 3] = 255;
              }
            } else if (image.kind === 1) {
              const stride = Math.ceil(width / 8);
              for (let y = 0; y < height; y++)
                for (let x = 0; x < width; x++) {
                  const v = source[y * stride + (x >> 3)] & (128 >> x % 8) ? 255 : 0,
                    k = (y * width + x) * 4;
                  output.data[k] = output.data[k + 1] = output.data[k + 2] = v;
                  output.data[k + 3] = 255;
                }
            } else {
              skipped++;
              continue;
            }
            c.putImageData(output, 0, 0);
          } else {
            skipped++;
            continue;
          }
          const png = await env.toBytes(canvas, "png", 1),
            hash = Array.from(
              new Uint8Array(await crypto.subtle.digest("SHA-256", png.slice().buffer)),
            )
              .map((n) => n.toString(16).padStart(2, "0"))
              .join("");
          if (seen.has(hash)) continue;
          seen.add(hash);
          images.push({
            name: `embedded-${String(images.length + 1).padStart(3, "0")}-${width}x${height}.png`,
            bytes: png,
            mime: "image/png",
          });
        } catch {
          skipped++;
        }
      }
      page.cleanup();
    }
  } finally {
    await destroy();
  }
  if (!images.length)
    throw new PdfError(
      `No supported embedded raster images were found.${skipped ? ` ${skipped} image objects could not be exported.` : " Vector-only pages have no raster images."}`,
      "NO_IMAGES",
    );
  return { images, skipped };
}
export type PdfDocument = PDFDocumentProxy;
