"use client";
import { PDFDocument } from "pdf-lib";
import { PdfError } from "./engine";
import { inspectDocxZip } from "./convert";
import { browserEnv, checkAbort, openDocument, renderPage } from "./render";
import { LIMITS } from "../site";
export async function wordToPdf(
  bytes: Uint8Array,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
) {
  inspectDocxZip(bytes);
  checkAbort(signal);
  const mammoth = (await import("mammoth/mammoth.browser.min.js")).default,
    html2canvas = (await import("html2canvas")).default,
    purifier = (await import("dompurify")).default;
  const result = await mammoth.convertToHtml({ arrayBuffer: bytes.slice().buffer });
  const html = purifier.sanitize(result?.value || "", {
    FORBID_TAGS: [
      "script",
      "style",
      "iframe",
      "object",
      "embed",
      "video",
      "audio",
      "link",
      "form",
      "input",
      "svg",
      "math",
    ],
    FORBID_ATTR: ["style", "srcset"],
    ALLOWED_URI_REGEXP: /^(?:data:image\/(?:png|jpe?g|gif|webp);base64,|#)/i,
  });
  if (!html.trim()) throw new PdfError("This DOCX has no supported content.", "INPUT");
  onProgress?.(15);
  const width = 794,
    height = 1123,
    host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = `position:absolute;left:-10000px;top:0;width:${width}px;background:#fff;color:#111;z-index:-1;`;
  const target = document.createElement("div");
  target.id = "pdforge-docx-render";
  target.style.cssText = `width:${width}px;padding:56px;box-sizing:border-box;background:#fff;color:#111;font-family:Arial,sans-serif;font-size:15px;line-height:1.55;overflow-wrap:anywhere;`;
  target.innerHTML = html;
  const style = document.createElement("style");
  style.textContent =
    "#pdforge-docx-render p{margin:0 0 10px}#pdforge-docx-render h1{font-size:26px;margin:14px 0 10px}#pdforge-docx-render h2{font-size:21px;margin:12px 0 8px}#pdforge-docx-render h3{font-size:17px;margin:10px 0 6px}#pdforge-docx-render img{max-width:100%;height:auto}#pdforge-docx-render table{border-collapse:collapse;width:100%}#pdforge-docx-render td,#pdforge-docx-render th{border:1px solid #bbb;padding:6px}#pdforge-docx-render ul,#pdforge-docx-render ol{margin:0 0 10px 22px}";
  host.append(style, target);
  document.body.append(host);
  try {
    await Promise.all(
      Array.from(target.querySelectorAll("img")).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              const finish = () => {
                clearTimeout(timer);
                img.onload = null;
                img.onerror = null;
                resolve();
              };
              const timer = setTimeout(finish, 5000);
              img.onload = finish;
              img.onerror = finish;
            }),
      ),
    );
    checkAbort(signal);
    const total = Math.max(1, Math.ceil(target.scrollHeight / height));
    if (total > LIMITS.renderPages)
      throw new PdfError(
        "The DOCX is too long to render. Split it into smaller documents.",
        "LIMIT",
      );
    const pdf = await PDFDocument.create(),
      env = browserEnv();
    for (let i = 0; i < total; i++) {
      checkAbort(signal);
      const sliceHeight = Math.min(height, target.scrollHeight - i * height),
        canvas = await html2canvas(target, {
          scale: 1.5,
          x: 0,
          y: i * height,
          width,
          height: sliceHeight,
          backgroundColor: "#ffffff",
          logging: false,
          useCORS: false,
          allowTaint: false,
          windowWidth: width,
          windowHeight: height,
        });
      const image = await pdf.embedJpg(await env.toBytes(canvas, "jpeg", 0.92)),
        drawHeight = (sliceHeight / width) * 595.28;
      pdf
        .addPage([595.28, 841.89])
        .drawImage(image, { x: 0, y: 841.89 - drawHeight, width: 595.28, height: drawHeight });
      onProgress?.(20 + Math.round(((i + 1) / total) * 80));
      canvas.width = 0;
      canvas.height = 0;
    }
    pdf.setTitle("Rendered Word document");
    pdf.setProducer("PDFORGE — image-based DOCX conversion");
    return pdf.save();
  } finally {
    host.remove();
  }
}
export async function ocrPdf(
  bytes: Uint8Array,
  language: "eng" | "hin" | "eng+hin",
  opts: { signal?: AbortSignal; onProgress?: (pct: number, label: string) => void } = {},
) {
  const { LocalOcrWorker } = await import("./ocrWorker");
  const { doc, destroy } = await openDocument(bytes);
  if (doc.numPages > LIMITS.ocrPages) {
    await destroy();
    throw new PdfError(
      `OCR supports up to ${LIMITS.ocrPages} pages per run. Split longer documents first.`,
      "LIMIT",
    );
  }
  let currentPage = 1;
  let worker: InstanceType<typeof LocalOcrWorker> | undefined;
  try {
    checkAbort(opts.signal);
    opts.onProgress?.(0, "Loading local OCR engine");
    worker = new LocalOcrWorker(opts.signal, (status, progress) => {
      if (status === "recognizing text")
        opts.onProgress?.(
          Math.round(((currentPage - 1 + progress) / doc.numPages) * 100),
          `Recognizing page ${currentPage} of ${doc.numPages}`,
        );
    });
    await worker.initialize(language);
    const output = await PDFDocument.create(),
      texts: string[] = [];
    let confidence = 0,
      processedPixels = 0,
      outputBytes = 0;
    const env = browserEnv();
    for (let i = 1; i <= doc.numPages; i++) {
      checkAbort(opts.signal);
      currentPage = i;
      const page = await doc.getPage(i),
        r = await renderPage(page, 2, env),
        png = await env.toBytes(r.canvas, "png", 1);
      processedPixels += r.width * r.height;
      if (processedPixels > 100000000)
        throw new PdfError(
          "OCR exceeds the 100-megapixel session budget. Split the document into smaller jobs.",
          "LIMIT",
        );
      checkAbort(opts.signal);
      const image = png.slice();
      const data = await worker.request<{
        text: string;
        pdf: number[] | Uint8Array | null;
        confidence: number;
      }>(
        "recognize",
        { image, options: { pdfTitle: "Searchable document" }, output: { text: true, pdf: true } },
        [image.buffer],
      );
      if (!data.pdf) throw new PdfError("The OCR engine did not produce a searchable PDF.", "OCR");
      outputBytes += data.pdf.length;
      if (outputBytes > 128 * 1024 * 1024)
        throw new PdfError(
          "OCR output exceeds the 128 MB session budget. Split the document.",
          "LIMIT",
        );
      const part = await PDFDocument.load(new Uint8Array(data.pdf));
      (await output.copyPages(part, part.getPageIndices())).forEach((p) => output.addPage(p));
      texts.push(data.text.trim());
      confidence += data.confidence;
      page.cleanup();
      opts.onProgress?.(
        Math.round((i / doc.numPages) * 100),
        `Recognized page ${i} of ${doc.numPages}`,
      );
    }
    output.setProducer("PDFORGE local OCR / Tesseract");
    return {
      bytes: await output.save(),
      text: texts.join("\n\n― page break ―\n\n"),
      confidence: Math.round(confidence / doc.numPages),
    };
  } finally {
    worker?.close();
    await destroy();
  }
}
