import { openDocument, checkAbort } from "./render";
import { PdfError } from "./engine";
export type TextItem = { str: string; x: number; y: number; width: number };
export type ExtractedPage = { page: number; lines: string[]; rows: TextItem[][] };
export async function extractTextPages(
  bytes: Uint8Array,
  signal?: AbortSignal,
): Promise<ExtractedPage[]> {
  const { doc, destroy } = await openDocument(bytes),
    pages: ExtractedPage[] = [];
  let characters = 0;
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      checkAbort(signal);
      const page = await doc.getPage(i),
        content = await page.getTextContent(),
        items: TextItem[] = [];
      for (const entry of content.items) {
        if ("str" in entry && entry.str.trim()) {
          items.push({
            str: entry.str,
            x: entry.transform[4],
            y: entry.transform[5],
            width: entry.width,
          });
          characters += entry.str.length;
          if (characters > 5000000)
            throw new PdfError(
              "This document contains too much text for one conversion. Split it first.",
              "LIMIT",
            );
        }
      }
      items.sort((a, b) => b.y - a.y || a.x - b.x);
      const rows: TextItem[][] = [];
      let current: TextItem[] = [],
        currentY: number | null = null;
      for (const item of items) {
        if (currentY === null || Math.abs(item.y - currentY) <= 2.5) {
          current.push(item);
          currentY ??= item.y;
        } else {
          rows.push(current.sort((a, b) => a.x - b.x));
          current = [item];
          currentY = item.y;
        }
      }
      if (current.length) rows.push(current.sort((a, b) => a.x - b.x));
      pages.push({
        page: i,
        rows,
        lines: rows.map((row) =>
          row
            .map((item) => item.str)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim(),
        ),
      });
      page.cleanup();
    }
  } finally {
    await destroy();
  }
  return pages;
}
export async function pdfToText(bytes: Uint8Array, signal?: AbortSignal) {
  const pages = await extractTextPages(bytes, signal);
  if (!pages.some((p) => p.lines.length))
    throw new PdfError("No selectable text was found. Use OCR for scanned documents.", "NO_TEXT");
  return pages.map((p) => p.lines.join("\n")).join("\n\n― page break ―\n\n");
}
export async function pdfToDocx(bytes: Uint8Array, signal?: AbortSignal) {
  const pages = await extractTextPages(bytes, signal);
  if (!pages.some((p) => p.lines.length))
    throw new PdfError("No editable text was found. Run OCR before PDF to Word.", "NO_TEXT");
  const { Document, Packer, Paragraph, TextRun, PageBreak } = await import("docx");
  const children: InstanceType<typeof Paragraph>[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (i) children.push(new Paragraph({ children: [new PageBreak()] }));
    if (!pages[i].lines.length)
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "[This page has no selectable text. OCR may be needed.]",
              italics: true,
            }),
          ],
        }),
      );
    for (const line of pages[i].lines)
      children.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: line, size: 22 })],
        }),
      );
  }
  return new Uint8Array(
    await Packer.toBuffer(
      new Document({
        creator: "PDFORGE",
        title: "Editable text from PDF",
        sections: [{ children }],
      }),
    ),
  );
}
export function csvCell(value: string) {
  const safe = /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
export async function pdfToCsv(bytes: Uint8Array, signal?: AbortSignal) {
  const pages = await extractTextPages(bytes, signal);
  if (!pages.some((p) => p.rows.length))
    throw new PdfError("No selectable text was found. Use OCR before extracting CSV.", "NO_TEXT");
  const records: string[][] = [["page", "row", "column", "text"]];
  for (const page of pages)
    page.rows.forEach((row, index) => {
      let column = 0,
        current = "",
        right = 0;
      const flush = () => {
        if (current)
          records.push([String(page.page), String(index + 1), String(++column), current]);
      };
      for (const item of row) {
        const gap = item.x - right;
        if (current && gap > Math.max(12, (item.width / Math.max(1, item.str.length)) * 2)) {
          flush();
          current = "";
        }
        current += (current ? " " : "") + item.str;
        right = item.x + item.width;
      }
      flush();
    });
  return "\uFEFF" + records.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
export function inspectDocxZip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw new PdfError("This is not a valid DOCX ZIP container.", "INVALID");
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true),
    total = 0;
  if (count > 2000 || count === 65535)
    throw new PdfError(
      "This DOCX has too many parts or uses unsupported ZIP64 packaging.",
      "LIMIT",
    );
  let hasDocument = false;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50)
      throw new PdfError("This DOCX archive has an invalid directory.", "INVALID");
    const unpacked = view.getUint32(offset + 24, true),
      nameLength = view.getUint16(offset + 28, true),
      extra = view.getUint16(offset + 30, true),
      comment = view.getUint16(offset + 32, true);
    if (offset + 46 + nameLength + extra + comment > bytes.length)
      throw new PdfError("The DOCX archive is truncated.", "INVALID");
    total += unpacked;
    if (unpacked > 80 * 1024 * 1024 || total > 150 * 1024 * 1024 || unpacked === 0xffffffff)
      throw new PdfError("This DOCX expands beyond the safe 150 MB limit.", "LIMIT");
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (name === "word/document.xml") hasDocument = true;
    if (/vbaProject\.bin$/i.test(name))
      throw new PdfError(
        "Macro-enabled Office files are not supported. Save as a plain .docx first.",
        "UNSUPPORTED",
      );
    offset += 46 + nameLength + extra + comment;
  }
  if (!hasDocument) throw new PdfError("The archive does not contain a Word document.", "INVALID");
  return { parts: count, expandedBytes: total };
}
