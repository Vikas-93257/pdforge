import fs from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb, PDFName, PDFString } from "pdf-lib";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from "docx";
import { protectPdf } from "../src/lib/pdf/secure";
import { buildXlsx } from "../src/lib/pdf/xlsx";
import { pdfToPptx } from "../src/lib/pdf/pptx";
const dir = "tests/fixtures";
await fs.mkdir(dir, { recursive: true });
async function simple(names: string[]) {
  const d = await PDFDocument.create(),
    font = await d.embedFont(StandardFonts.Helvetica);
  for (const [index, name] of names.entries()) {
    const p = d.addPage([612, 792]);
    p.drawText(name, { x: 50, y: 735, size: 22, font });
    p.drawText(index === 0 ? "SENSITIVE ACCOUNT 314159" : "Public synthetic test content", {
      x: 50,
      y: 690,
      size: 15,
      font,
    });
    p.drawText("Item", { x: 50, y: 620, size: 12, font });
    p.drawText("Amount", { x: 270, y: 620, size: 12, font });
    p.drawText("Notebook", { x: 50, y: 595, size: 12, font });
    p.drawText("1250", { x: 270, y: 595, size: 12, font });
    p.drawText("=SUM(A1:A2)", { x: 50, y: 570, size: 12, font });
    p.drawRectangle({ x: 50, y: 465, width: 220, height: 60, color: rgb(0.84, 0.9, 0.82) });
    p.drawText("PDFORGE local test 2026", { x: 64, y: 488, size: 13, font });
  }
  return d.save();
}
const three = await simple(["ALPHA PAGE ONE", "ALPHA PAGE TWO", "ALPHA PAGE THREE"]),
  two = await simple(["BETA PAGE ONE", "BETA PAGE TWO"]),
  one = await simple(["PDFORGE LOCAL TEST 2026"]);
await fs.writeFile(`${dir}/three-pages.pdf`, three);
await fs.writeFile(`${dir}/two-pages.pdf`, two);
await fs.writeFile(`${dir}/one-page.pdf`, one);
const canvas = createCanvas(640, 360),
  c = canvas.getContext("2d");
c.fillStyle = "#ffffff";
c.fillRect(0, 0, 640, 360);
c.fillStyle = "#1c6746";
c.fillRect(20, 20, 290, 320);
c.fillStyle = "#d8a45a";
c.fillRect(330, 20, 290, 320);
c.fillStyle = "#fff";
c.font = "bold 36px sans-serif";
c.fillText("LOCAL IMAGE", 72, 190);
await fs.writeFile(`${dir}/image.png`, canvas.toBuffer("image/png"));
const jpg = canvas.toBuffer("image/jpeg", 93);
await fs.writeFile(`${dir}/image.jpg`, jpg);
await fs.writeFile(`${dir}/image.webp`, canvas.toBuffer("image/webp", 90));
const exif = Buffer.from([
  0xff, 0xe1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0, 0, 0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 1, 0, 0x12,
  1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0,
]);
await fs.writeFile(
  `${dir}/rotated-photo.jpg`,
  Buffer.concat([jpg.subarray(0, 2), exif, jpg.subarray(2)]),
);
const imageDoc = await PDFDocument.create(),
  image = await imageDoc.embedPng(canvas.toBuffer("image/png"));
imageDoc.addPage([640, 360]).drawImage(image, { x: 0, y: 0, width: 640, height: 360 });
await fs.writeFile(`${dir}/with-image.pdf`, await imageDoc.save());
const scan = createCanvas(1200, 1500),
  s = scan.getContext("2d");
s.fillStyle = "#fff";
s.fillRect(0, 0, 1200, 1500);
s.fillStyle = "#111";
s.font = "bold 64px sans-serif";
s.fillText("PDFORGE LOCAL TEST", 80, 170);
s.font = "52px sans-serif";
s.fillText("INVOICE 2026", 80, 300);
s.fillText("TOTAL 1250", 80, 420);
s.fillText("Browser OCR verification", 80, 540);
await fs.writeFile(`${dir}/scan.png`, scan.toBuffer("image/png"));
const scanned = await PDFDocument.create(),
  scanImage = await scanned.embedPng(scan.toBuffer("image/png"));
scanned.addPage([600, 750]).drawImage(scanImage, { x: 0, y: 0, width: 600, height: 750 });
await fs.writeFile(`${dir}/scanned.pdf`, await scanned.save());
GlobalFonts.registerFromPath("public/fonts/NotoSansDevanagari.ttf", "Noto Devanagari");
const hc = createCanvas(1200, 1200),
  h = hc.getContext("2d");
h.fillStyle = "#fff";
h.fillRect(0, 0, 1200, 1200);
h.fillStyle = "#111";
h.font = '72px "Noto Devanagari"';
h.fillText("नमस्ते भारत", 70, 180);
h.fillText("हिंदी दस्तावेज़", 70, 330);
h.fillText("2026", 70, 480);
await fs.writeFile(`${dir}/hindi-scan.png`, hc.toBuffer("image/png"));
{
  const d = await PDFDocument.create(),
    font = await d.embedFont(StandardFonts.Helvetica),
    bold = await d.embedFont(StandardFonts.HelveticaBold),
    page = d.addPage([612, 792]);
  page.drawText("TWO COLUMN PROBE 2026", { x: 50, y: 740, size: 20, font: bold });
  for (let r = 0; r < 12; r++) {
    page.drawText(`Left column narrative row ${r + 1} continues`, {
      x: 50,
      y: 700 - r * 24,
      size: 11,
      font,
    });
    page.drawText(`Right column sidebar note ${r + 1} here`, {
      x: 330,
      y: 700 - r * 24,
      size: 11,
      font,
    });
  }
  await fs.writeFile(`${dir}/two-column.pdf`, await d.save());
}
{
  const d = await PDFDocument.create(),
    font = await d.embedFont(StandardFonts.Helvetica),
    bold = await d.embedFont(StandardFonts.HelveticaBold),
    page = d.addPage([612, 792]);
  page.drawText("RULED TABLE PROBE 2026", { x: 50, y: 740, size: 20, font: bold });
  const xs = [50, 95, 180, 290],
    ys = [700, 665, 630, 595, 560, 525];
  for (const x of xs)
    page.drawLine({
      start: { x, y: 525 },
      end: { x, y: 700 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  for (const y of ys)
    page.drawLine({
      start: { x: 50, y },
      end: { x: 290, y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  const grid = [
    ["Item", "Qty", "Price"],
    ["Apples", "12", "3.50"],
    ["Bread", "2", "1.20"],
    ["Milk", "6", "4.80"],
    ["Cheese", "3", "2.10"],
  ];
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[r].length; c++)
      page.drawText(grid[r][c], { x: xs[c] + 3, y: ys[r] - 22, size: 11, font: r ? font : bold });
  await fs.writeFile(`${dir}/ruled-table.pdf`, await d.save());
}
{
  const d = await PDFDocument.create(),
    font = await d.embedFont(StandardFonts.Helvetica),
    bold = await d.embedFont(StandardFonts.HelveticaBold),
    page = d.addPage([612, 792]);
  page.drawText("MIXED CONTENT PROBE 2026", { x: 50, y: 740, size: 20, font: bold });
  page.drawText("Introductory paragraph placed above the figure.", {
    x: 50,
    y: 705,
    size: 12,
    font,
  });
  const fig = createCanvas(200, 120),
    fx = fig.getContext("2d");
  fx.fillStyle = "#1c6746";
  fx.fillRect(0, 0, 200, 120);
  fx.fillStyle = "#edf4e6";
  fx.font = "bold 26px sans-serif";
  fx.fillText("FIGURE-A", 28, 68);
  const embedded = await d.embedPng(fig.toBuffer("image/png"));
  page.drawImage(embedded, { x: 100, y: 500, width: 200, height: 120 });
  page.drawText("Figure A caption sits directly below the image.", {
    x: 100,
    y: 480,
    size: 11,
    font,
  });
  page.drawText("Closing paragraph after the captioned figure.", { x: 50, y: 440, size: 12, font });
  await fs.writeFile(`${dir}/text-image.pdf`, await d.save());
}
const rich = await PDFDocument.load(one);
rich.setTitle("PRIVATE DOCUMENT TITLE");
rich.setAuthor("PRIVATE AUTHOR 9182");
rich.setSubject("PRIVATE SUBJECT");
rich.setKeywords(["PRIVATE KEYWORD"]);
await rich.attach(new TextEncoder().encode("HIDDEN ATTACHMENT SECRET 271828"), "private.txt", {
  mimeType: "text/plain",
});
const link = rich.context.obj({
  Type: "Annot",
  Subtype: "Link",
  Rect: [50, 200, 180, 220],
  Border: [0, 0, 0],
  A: { Type: "Action", S: "URI", URI: PDFString.of("https://sensitive.invalid/private") },
});
rich.getPage(0).node.addAnnot(rich.context.register(link));
const xmp = rich.context.flateStream(
  new TextEncoder().encode("<x:xmpmeta>HIDDEN XMP SECRET 999</x:xmpmeta>"),
  { Type: "Metadata", Subtype: "XML" },
);
rich.catalog.set(PDFName.of("Metadata"), rich.context.register(xmp));
await fs.writeFile(`${dir}/metadata.pdf`, await rich.save());
const form = await PDFDocument.create(),
  fp = form.addPage([612, 792]),
  field = form.getForm().createTextField("approval");
field.setText("APPROVED 2026");
field.addToPage(fp, { x: 60, y: 650, width: 250, height: 32 });
await fs.writeFile(`${dir}/form.pdf`, await form.save());
const docx = new Document({
  sections: [
    {
      children: [
        new Paragraph({
          children: [new TextRun({ text: "Document conversion fixture 2026", bold: true })],
        }),
        new Paragraph("Real text. Local processing. No upload."),
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Item")] }),
                new TableCell({ children: [new Paragraph("Amount")] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Notebook")] }),
                new TableCell({ children: [new Paragraph("1250")] }),
              ],
            }),
          ],
        }),
      ],
    },
  ],
});
await fs.writeFile(`${dir}/sample.docx`, await Packer.toBuffer(docx));
const workbook = await buildXlsx([
  {
    name: "Items",
    grid: [
      ["Item", "Amount"],
      ["Notebook", "1250"],
      ["Pen", "120"],
    ],
  },
  {
    name: "Notes",
    grid: [["Document conversion fixture 2026"], ["Local spreadsheet processing. No upload."]],
  },
]);
if (workbook.truncated) throw new Error("Synthetic workbook exceeded the cell budget.");
await fs.writeFile(`${dir}/sample.xlsx`, workbook.bytes);
const deck = await pdfToPptx(three);
if (deck.slides !== 3 || deck.truncated) throw new Error("Synthetic deck is incomplete.");
await fs.writeFile(`${dir}/sample.pptx`, deck.bytes);
await fs.writeFile(
  `${dir}/text.txt`,
  "A local text document.\nहिंदी दस्तावेज़ English 2026\nNo uploads.",
);
await fs.writeFile(`${dir}/protected.pdf`, await protectPdf(one, "correct-horse-2026"));
const plain = await PDFDocument.load(one);
const repairable = await plain.save({ useObjectStreams: false });
await fs.writeFile(
  `${dir}/repairable.pdf`,
  Buffer.from(
    Buffer.from(repairable)
      .toString("binary")
      .replace(/startxref\s+\d+/, "startxref\n1"),
    "binary",
  ),
);
await fs.writeFile(`${dir}/bad.pdf`, "%PDF-1.7\nThis is deliberately not a valid PDF\n%%EOF");
await fs.writeFile(`${dir}/invalid.pdf`, "This is not a PDF.");
await fs.writeFile(`${dir}/empty.pdf`, new Uint8Array());
console.log("Synthetic fixtures generated. No personal documents used.");
