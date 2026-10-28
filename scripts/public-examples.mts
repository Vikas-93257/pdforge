import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { pdfToDocx } from "../src/lib/pdf/convert";
const dir = path.resolve("public/examples/pdf-to-word");
await fs.mkdir(dir, { recursive: true });
const pdf = await PDFDocument.create(),
  font = await pdf.embedFont(StandardFonts.Helvetica);
const pages = [
  [
    "PDFORGE public conversion example",
    "SYNTHETIC SAMPLE - NOT A CUSTOMER DOCUMENT",
    "This PDF contains selectable text.",
    "Convert it to DOCX to edit these words.",
    "This sample does not demonstrate complex layout reconstruction.",
  ],
  [
    "Second page of the synthetic example",
    "Page boundaries and editable text are the features being demonstrated.",
    "Inspect the real output rather than assuming every layout is preserved.",
    "END OF PUBLIC SAMPLE",
  ],
];
for (const lines of pages) {
  const p = pdf.addPage([612, 792]);
  lines.forEach((text, i) => p.drawText(text, { x: 48, y: 730 - i * 36, size: i ? 11 : 17, font }));
}
pdf.setTitle("PDFORGE synthetic selectable-text conversion sample");
pdf.setAuthor("PDFORGE project - synthetic test data");
pdf.setSubject("Public CC0 sample; not evidence of exact complex layout fidelity");
pdf.setProducer("PDFORGE public sample generator");
pdf.setCreationDate(new Date("2026-10-28T00:00:00Z"));
pdf.setModificationDate(new Date("2026-10-28T00:00:00Z"));
const bytes = await pdf.save();
await fs.writeFile(path.join(dir, "sample-input.pdf"), bytes);
await fs.writeFile(path.join(dir, "sample-output.docx"), await pdfToDocx(bytes));
await fs.writeFile(
  path.join(dir, "README.txt"),
  "PDFORGE public synthetic PDF-to-Word sample\n\nThe PDF contains simple selectable text. The DOCX was produced by the real PDFORGE text-focused converter; it is not a renamed PDF or a visual-layout reconstruction. Scans need OCR first. Inspect the result yourself. No customer document or personal data is included.\n\nSample document data: CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/). This does not change the restricted-use application license or upstream third-party terms.\n",
);
console.log("Generated actual synthetic PDF/DOCX pair; no customer documents used.");
