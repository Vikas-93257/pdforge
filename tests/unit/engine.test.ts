import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PDFDocument, PDFName, degrees } from "pdf-lib";
import { createCanvas, loadImage, type Canvas } from "@napi-rs/canvas";
import JSZip from "jszip";
import * as core from "../../src/lib/pdf/engine";
import * as render from "../../src/lib/pdf/render";
import * as secure from "../../src/lib/pdf/secure";
import * as convert from "../../src/lib/pdf/convert";
import * as pptx from "../../src/lib/pdf/pptx";
import {
  validateSelection,
  identifyFile,
  DEFAULT_OPTIONS,
  executeTool,
} from "../../src/lib/operations";
import { TOOLS, getTool } from "../../src/lib/tools";
import { safeFilename, fmtBytes, safeJson } from "../../src/lib/site";
const file = async (name: string) => new Uint8Array(await fs.readFile(`tests/fixtures/${name}`));
const env: render.CanvasEnv = {
  createCanvas(w, h) {
    const canvas = createCanvas(w, h);
    return { canvas, ctx: canvas.getContext("2d") };
  },
  async toBytes(c, f, q) {
    return new Uint8Array(
      f === "png"
        ? (c as Canvas).toBuffer("image/png")
        : (c as Canvas).toBuffer("image/jpeg", Math.round(q * 100)),
    );
  },
};
const text = convert.pdfToText;
const pages = async (b: Uint8Array) => (await core.loadPdf(b)).getPageCount();
for (const [spec, max, expected] of [
  ["1", 3, [[1]]],
  ["1-3, 5", 5, [[1, 2, 3], [5]]],
  ["3,1,3", 3, [[3], [1], [3]]],
  ["2 - 4", 4, [[2, 3, 4]]],
] as const)
  test(`ranges: ${spec}`, () => assert.deepEqual(core.parseRanges(spec, max), expected));
for (const spec of [
  "",
  "0",
  "-1",
  "4",
  "2-1",
  "1-4",
  "1.5",
  "one",
  "1:3",
  "1-2-3",
  "999999999999999999999",
  "1,<script>",
])
  test(`reject invalid range ${JSON.stringify(spec)}`, () =>
    assert.throws(() => core.parseRanges(spec, 3), core.PdfError));
test("selected pages deduplicate while preserving requested order", () =>
  assert.deepEqual(core.selectedPages("3,1-2,3", 3), [3, 1, 2]));
test("loader rejects empty and malformed documents", async () => {
  await assert.rejects(core.loadPdf(new Uint8Array()), /empty/);
  await assert.rejects(core.loadPdf(await file("bad.pdf")), /could not be read/);
});
test("loader refuses encryption instead of ignoring it", async () => {
  await assert.rejects(
    core.loadPdf(await file("protected.pdf")),
    (e: unknown) => e instanceof core.PdfError && e.code === "ENCRYPTED",
  );
});
test("merge has exact page count and real text in source order", async () => {
  const out = await core.mergePdfs([await file("three-pages.pdf"), await file("two-pages.pdf")]);
  assert.equal(await pages(out), 5);
  const t = await text(out);
  assert.ok(t.indexOf("ALPHA PAGE THREE") < t.indexOf("BETA PAGE ONE"));
});
test("merge rejects one file", async () => {
  await assert.rejects(core.mergePdfs([await file("one-page.pdf")]), /between 2 and 50/);
});
test("split creates independent readable page ranges", async () => {
  const out = await core.splitByRanges(await file("three-pages.pdf"), "1-2,3");
  assert.equal(out.length, 2);
  assert.equal(await pages(out[0].bytes), 2);
  assert.equal(await pages(out[1].bytes), 1);
  assert.match(await text(out[1].bytes), /ALPHA PAGE THREE/);
});
test("duplicate split ranges cannot overwrite ZIP names", async () => {
  const out = await core.splitByRanges(await file("three-pages.pdf"), "1,1");
  assert.notEqual(out[0].name, out[1].name);
});
test("split every page creates three one-page PDFs", async () => {
  const out = await core.splitEveryPage(await file("three-pages.pdf"));
  assert.equal(out.length, 3);
  for (const item of out) assert.equal(await pages(item.bytes), 1);
});
test("extract preserves explicit page order", async () => {
  const out = await core.extractPages(await file("three-pages.pdf"), "3,1");
  assert.equal(await pages(out), 2);
  assert.ok((await text(out)).startsWith("ALPHA PAGE THREE"));
});
test("remove deletes only requested pages", async () => {
  const out = await core.removePages(await file("three-pages.pdf"), "2");
  assert.equal(await pages(out), 2);
  assert.doesNotMatch(await text(out), /ALPHA PAGE TWO/);
});
test("remove rejects deleting every page", async () => {
  await assert.rejects(core.removePages(await file("three-pages.pdf"), "1-3"), /Keep at least one/);
});
test("organize applies order, deletion and cumulative rotation", async () => {
  const out = await core.organizePdf(await file("three-pages.pdf"), [2, 0], { 2: 90 });
  const d = await core.loadPdf(out);
  assert.equal(d.getPageCount(), 2);
  assert.equal(d.getPage(0).getRotation().angle, 90);
  assert.ok((await text(out)).includes("ALPHA PAGE THREE"));
});
test("organize validates all indices and angles", async () => {
  const b = await file("three-pages.pdf");
  for (const indices of [[], [-1], [3], [0.5]])
    await assert.rejects(core.organizePdf(b, indices), /valid pages/);
  await assert.rejects(core.organizePdf(b, [0], { 0: 45 }), /multiple of 90/);
});
test("rotate changes every page and preserves text", async () => {
  const b = await file("three-pages.pdf"),
    out = await core.rotatePdf(b, 90);
  assert.deepEqual(
    (await core.loadPdf(out)).getPages().map((p) => p.getRotation().angle),
    [90, 90, 90],
  );
  assert.match(await text(out), /SENSITIVE ACCOUNT 314159/);
  await assert.rejects(core.rotatePdf(b, 45), /Choose 90/);
});
test("numbers contain actual increasing visible text", async () => {
  const out = await core.addPageNumbers(await file("three-pages.pdf"), {
    position: "bottom-center",
    start: 4,
    fontSize: 11,
    withTotal: true,
  });
  const t = await text(out);
  for (const number of ["4 / 6", "5 / 6", "6 / 6"]) assert.ok(t.includes(number));
});
test("numbering rejects fractional starting values and invalid positions", async () => {
  const b = await file("one-page.pdf");
  await assert.rejects(
    core.addPageNumbers(b, { position: "bottom-left", start: 1.5, fontSize: 11, withTotal: false }),
    /whole number/,
  );
  await assert.rejects(
    core.addPageNumbers(b, {
      position: "invalid" as core.NumberPosition,
      start: 1,
      fontSize: 11,
      withTotal: false,
    }),
    /valid number/,
  );
});
test("watermark embeds text, not a status-only no-op", async () => {
  const out = await core.addWatermark(await file("one-page.pdf"), {
    text: "REVIEW COPY",
    fontSize: 44,
    opacity: 0.4,
    rotation: -30,
    color: { r: 0.3, g: 0.4, b: 0.2 },
  });
  assert.match(await text(out), /REVIEW COPY/);
});
test("PNG and JPEG are genuinely embedded as two PDF pages", async () => {
  const out = await core.imagesToPdf(
    [
      { bytes: await file("image.png"), type: "image/png" },
      { bytes: await file("image.jpg"), type: "image/jpeg" },
    ],
    { pageSize: "a4", orientation: "auto", margin: 24 },
  );
  assert.equal(await pages(out), 2);
  assert.equal((await render.pdfToImages(out, { env, format: "png", scale: 0.3 })).length, 2);
});
test("signature creates an actual image resource", async () => {
  const out = await core.signPdf(await file("one-page.pdf"), await file("image.png"), {
      page: 1,
      corner: "bottom-right",
      width: 120,
    }),
    d = await core.loadPdf(out);
  assert.ok(d.getPage(0).node.Resources()?.get(PDFName.of("XObject")));
  assert.equal(await pages(out), 1);
});
test("signature page bounds are not silently clamped", async () => {
  await assert.rejects(
    core.signPdf(await file("one-page.pdf"), await file("image.png"), {
      page: 2,
      corner: "bottom-right",
      width: 120,
    }),
    /valid pages/,
  );
});
test("crop changes the box but intentionally retains underlying text", async () => {
  const out = await core.cropPdf(await file("one-page.pdf"), {
      top: 160,
      bottom: 20,
      left: 20,
      right: 20,
    }),
    p = (await core.loadPdf(out)).getPage(0);
  assert.equal(p.getCropBox().width, 572);
  assert.equal(p.getCropBox().height, 612);
  assert.equal(p.getMediaBox().height, 792);
  const raw = new TextDecoder("latin1").decode(
    await secure.unlockPdf(await secure.protectPdf(out, "test-password"), "test-password"),
  );
  assert.ok(raw.startsWith("%PDF-"));
  const unhide = await core.loadPdf(out);
  unhide.getPage(0).setCropBox(0, 0, 612, 792);
  assert.match(await text(await unhide.save()), /SENSITIVE ACCOUNT 314159/);
});
test("crop rejects zero-area output", async () => {
  await assert.rejects(
    core.cropPdf(await file("one-page.pdf"), { top: 500, bottom: 400, left: 0, right: 0 }),
    /entire visible page/,
  );
});
test("crop margins follow the displayed rotated page", async () => {
  const b = await core.rotatePdf(await file("one-page.pdf"), 90),
    out = await core.cropPdf(b, { top: 10, bottom: 30, left: 20, right: 40 }),
    p = (await core.loadPdf(out)).getPage(0);
  assert.equal(p.getCropBox().width, 572);
  assert.equal(p.getCropBox().height, 732);
});
test("resize preserves real text and requested paper dimensions", async () => {
  const out = await core.resizePdf(await file("three-pages.pdf"), "a4"),
    d = await core.loadPdf(out);
  assert.equal(d.getPageCount(), 3);
  assert.equal(d.getPage(0).getWidth(), 595.28);
  assert.match(await text(out), /ALPHA PAGE THREE/);
});
test("resize handles completely blank pages", async () => {
  const d = await PDFDocument.create();
  d.addPage();
  const out = await core.resizePdf(await d.save(), "letter", true),
    p = (await core.loadPdf(out)).getPage(0);
  assert.equal(p.getWidth(), 792);
  assert.equal(p.getHeight(), 612);
});
test("resize refuses unflattened form fields", async () => {
  await assert.rejects(core.resizePdf(await file("form.pdf"), "a4"), /Flatten filled form/);
});
test("resize honors a crop box and quarter-turn rotation", async () => {
  const d = await core.loadPdf(await file("one-page.pdf"));
  d.getPage(0).setCropBox(40, 100, 500, 650);
  d.getPage(0).setRotation(degrees(90));
  const out = await core.resizePdf(await d.save(), "a4", true);
  assert.equal((await core.loadPdf(out)).getPage(0).getWidth(), 841.89);
  const img = (await render.pdfToImages(out, { env, format: "png", scale: 0.5 }))[0];
  assert.ok(img.bytes.length > 1500);
});
test("flatten removes standard form fields and keeps their values visible", async () => {
  const out = await core.flattenPdf(await file("form.pdf")),
    d = await core.loadPdf(out);
  assert.equal(d.getForm().getFields().length, 0);
  assert.match(await text(out), /APPROVED 2026/);
});
test("metadata editing actually replaces fields and removes XMP", async () => {
  const out = await core.setMetadata(await file("metadata.pdf"), {
      title: "Public release",
      author: "Release Team",
      subject: "Updated",
      keywords: "one,two",
    }),
    d = await core.loadPdf(out);
  assert.equal(d.getTitle(), "Public release");
  assert.equal(d.getAuthor(), "Release Team");
  assert.ok(!d.catalog.has(PDFName.of("Metadata")));
  assert.ok(
    d.catalog.has(PDFName.of("Names")),
    "metadata editing is not falsely called attachment sanitization",
  );
});
test("clearing metadata removes standard identifying fields and dates", async () => {
  const out = await core.setMetadata(await file("metadata.pdf"), {
      title: "ignored",
      author: "ignored",
      subject: "ignored",
      keywords: "ignored",
      clear: true,
    }),
    d = await core.loadPdf(out);
  assert.equal(d.getTitle(), "");
  assert.equal(d.getAuthor(), "");
  assert.equal(d.getCreationDate(), undefined);
  assert.ok(!d.catalog.has(PDFName.of("Metadata")));
});
test("text-to-PDF preserves Latin and Hindi using bundled fonts", async () => {
  const out = await core.textToPdf(
    "हिंदी दस्तावेज़ English 2026\nA second line.",
    "Local document",
  );
  const t = await text(out);
  assert.match(t, /English 2026/);
  assert.match(t, /[\u0900-\u097f]/);
});
test("text wrapping paginates and retains the last line", async () => {
  const out = await core.textToPdf(
    Array.from({ length: 180 }, (_, i) => `Line ${i + 1}: a genuine text line.`).join("\n"),
  );
  assert.ok((await pages(out)) >= 4);
  assert.match(await text(out), /Line 180/);
});
test("unsupported scripts are rejected, never silently corrupted", async () => {
  await assert.rejects(core.textToPdf("Unsupported emoji 😀"), /cannot represent/);
});
test("empty text and excessive font sizes are rejected", async () => {
  await assert.rejects(core.textToPdf("   "), /empty/);
  await assert.rejects(core.textToPdf("test", "title", 100), /between 8 and 32/);
});
test("smallest-candidate selection never increases size", () => {
  const b = new Uint8Array(10);
  assert.equal(
    render.smallestCandidate(b, [{ bytes: new Uint8Array(12), mode: "larger" }]).bytes,
    b,
  );
  assert.equal(
    render.smallestCandidate(b, [
      { bytes: new Uint8Array(7), mode: "small" },
      { bytes: new Uint8Array(9), mode: "medium" },
    ]).bytes.length,
    7,
  );
});
test("lossless compression preserves selectable text and cannot enlarge output", async () => {
  const b = await file("three-pages.pdf"),
    out = await render.compressPdf(b, "lossless");
  assert.ok(out.after <= out.before);
  assert.match(await text(out.bytes), /SENSITIVE ACCOUNT 314159/);
  assert.equal(await pages(out.bytes), 3);
});
test("optional raster compression also chooses the smallest candidate", async () => {
  const b = await file("one-page.pdf"),
    out = await render.compressPdf(b, "extreme", { env });
  assert.ok(out.after <= out.before);
  assert.equal(await pages(out.bytes), 1);
});
test("PDF-to-image exports decodable PNG and JPEG, not renamed PDFs", async () => {
  const b = await file("one-page.pdf");
  for (const format of ["png", "jpeg"] as const) {
    const out = (await render.pdfToImages(b, { env, format, scale: 1 }))[0],
      image = await loadImage(out.bytes);
    assert.equal(image.width, 612);
    assert.equal(image.height, 792);
    assert.ok(out.bytes.length > 4000);
  }
});
test("redaction rebuild removes ALL source text, metadata and attachments", async () => {
  const out = await render.redactPdf(
      await file("metadata.pdf"),
      [{ page: 1, x: 0, y: 0, width: 1, height: 0.25 }],
      { env, scale: 1 },
    ),
    d = await core.loadPdf(out);
  assert.equal(d.getPageCount(), 1);
  assert.equal(d.getTitle(), undefined);
  assert.equal(d.getAuthor(), undefined);
  assert.ok(!d.catalog.has(PDFName.of("Metadata")));
  assert.ok(!d.catalog.has(PDFName.of("Names")));
  assert.equal((await convert.extractTextPages(out))[0].lines.length, 0);
  const png = (await render.pdfToImages(out, { env, format: "png", scale: 1 }))[0],
    image = await loadImage(png.bytes),
    c = createCanvas(612, 792),
    ctx = c.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const pixel = ctx.getImageData(200, 90, 1, 1).data;
  assert.ok(pixel[0] < 5 && pixel[1] < 5 && pixel[2] < 5, "redacted pixels are black");
});
test("redaction refuses empty, off-page, negative and nonexistent regions", async () => {
  const b = await file("one-page.pdf");
  await assert.rejects(render.redactPdf(b, [], { env }), /at least one/);
  for (const box of [
    { page: 2, x: 0, y: 0, width: 0.1, height: 0.1 },
    { page: 1, x: -1, y: 0, width: 0.1, height: 0.1 },
    { page: 1, x: 0.9, y: 0, width: 0.5, height: 0.1 },
    { page: 1, x: 0, y: 0, width: 0, height: 0.1 },
  ])
    await assert.rejects(render.redactPdf(b, [box], { env }), /outside the page/);
});
test("sanitization keeps visible marks but drops text and hidden objects", async () => {
  const out = await render.rasterizePdf(await file("metadata.pdf"), { env, scale: 1 }),
    d = await core.loadPdf(out);
  assert.equal((await convert.extractTextPages(out))[0].lines.length, 0);
  assert.ok(!d.catalog.has(PDFName.of("Names")));
  assert.ok(
    (await render.pdfToImages(out, { env, scale: 0.5, format: "png" }))[0].bytes.length > 3000,
  );
});
test("cancelled jobs reject before rendering or qpdf work", async () => {
  const controller = new AbortController();
  controller.abort();
  const b = await file("one-page.pdf");
  await assert.rejects(render.pdfToImages(b, { env, signal: controller.signal }), /cancelled/);
  await assert.rejects(secure.losslessOptimize(b, controller.signal), /cancelled/);
});
test("AES-256 protection requires the correct password to recover real text", async () => {
  const b = await file("one-page.pdf"),
    encrypted = await secure.protectPdf(b, "unit-test-password");
  assert.equal(await secure.isEncrypted(encrypted), true);
  await assert.rejects(secure.unlockPdf(encrypted, "wrong-password"), /Could not unlock/);
  const decrypted = await secure.unlockPdf(encrypted, "unit-test-password");
  assert.match(await text(decrypted), /SENSITIVE ACCOUNT 314159/);
  assert.equal(await secure.isEncrypted(decrypted), false);
});
test("native independent qpdf confirms AESv3 and readable structure", async (t) => {
  if (spawnSync("qpdf", ["--version"]).status !== 0) {
    t.skip("Optional native qpdf is not installed");
    return;
  }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pdforge-"));
  try {
    const target = path.join(dir, "protected.pdf");
    await fs.writeFile(
      target,
      await secure.protectPdf(await file("one-page.pdf"), "native-test-password"),
    );
    const result = spawnSync(
      "qpdf",
      ["--password=native-test-password", "--show-encryption", target],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0);
    assert.match(result.stdout, /AESv3/);
    const check = spawnSync("qpdf", ["--password=native-test-password", "--check", target], {
      encoding: "utf8",
    });
    assert.equal(check.status, 0, check.stderr);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
test("password validation rejects short, null and oversized UTF-8 values", async () => {
  const b = await file("one-page.pdf");
  for (const p of ["short", "password\0broken", "ह".repeat(60)])
    await assert.rejects(secure.protectPdf(b, p), /at least 8|at most 127/);
  await assert.rejects(secure.unlockPdf(b, "bad\0pass"), /without null/);
});
test("repair recovers damaged xref but never invents pages for garbage", async () => {
  const fixed = await secure.repairPdf(await file("repairable.pdf"));
  assert.equal(await pages(fixed), 1);
  assert.match(await text(fixed), /SENSITIVE ACCOUNT 314159/);
  await assert.rejects(secure.repairPdf(await file("bad.pdf")), /too damaged/);
});
test("PDF-to-DOCX writes a real, editable Word file", async () => {
  const out = await convert.pdfToDocx(await file("three-pages.pdf")),
    zip = await JSZip.loadAsync(out),
    xml = await zip.file("word/document.xml")!.async("string");
  assert.match(xml, /ALPHA PAGE ONE/);
  assert.match(xml, /ALPHA PAGE THREE/);
  assert.equal(convert.inspectDocxZip(out).parts > 0, true);
});
test("text extraction rejects scans with a useful OCR suggestion", async () => {
  await assert.rejects(convert.pdfToText(await file("scanned.pdf")), /Use OCR/);
  await assert.rejects(convert.pdfToDocx(await file("scanned.pdf")), /OCR/);
});
test("CSV contains real positional values and escapes formula execution", async () => {
  const csv = await convert.pdfToCsv(await file("one-page.pdf"));
  assert.match(csv, /"page","row","column","text"/);
  assert.match(csv, /Notebook/);
  assert.match(csv, /'=SUM\(A1:A2\)/);
  assert.equal(convert.csvCell('a"b'), '"a""b"');
  assert.equal(convert.csvCell("  +cmd"), '"\'  +cmd"');
});
test("DOCX preflight accepts actual Word files and rejects non-Word ZIPs", async () => {
  assert.ok(convert.inspectDocxZip(await file("sample.docx")).expandedBytes > 0);
  const zip = new JSZip();
  zip.file("test.txt", "not word");
  const nonWord = await zip.generateAsync({ type: "uint8array" });
  assert.throws(() => convert.inspectDocxZip(nonWord), /does not contain a Word/);
  for (const b of [new Uint8Array(), new Uint8Array([1, 2, 3])])
    assert.throws(() => convert.inspectDocxZip(b), /valid DOCX/);
});
test("DOCX preflight rejects macros before rendering", async () => {
  const zip = await JSZip.loadAsync(await file("sample.docx"));
  zip.file("word/vbaProject.bin", new Uint8Array([1]));
  const out = await zip.generateAsync({ type: "uint8array" });
  assert.throws(() => convert.inspectDocxZip(out), /Macro-enabled/);
});
test("DOCX preflight rejects declared ZIP bombs without decompressing", async () => {
  const b = (await file("sample.docx")).slice(),
    view = new DataView(b.buffer);
  for (let i = 0; i < b.length - 46; i++)
    if (view.getUint32(i, true) === 0x02014b50) {
      view.setUint32(i + 24, 200 * 1024 * 1024, true);
      break;
    }
  assert.throws(() => convert.inspectDocxZip(b), /safe 150 MB/);
});
test("catalog contains exactly 37 unique implemented tools", () => {
  assert.equal(TOOLS.length, 37);
  assert.equal(new Set(TOOLS.map((t) => t.slug)).size, 37);
  for (const t of TOOLS) {
    assert.ok(t.steps.length >= 3);
    assert.ok(t.limitation.length > 20);
  }
});
for (const [label, input, existing, slug, pattern] of [
  ["empty", [], [], "merge", /Choose a file/],
  ["zero bytes", [{ name: "a.pdf", size: 0 }], [], "merge", /empty file/],
  ["too large", [{ name: "a.pdf", size: 101 * 1024 * 1024 }], [], "merge", /100 MB/],
  [
    "too much total",
    [{ name: "a.pdf", size: 100 * 1024 * 1024 }],
    [{ size: 250 * 1024 * 1024 }],
    "merge",
    /300 MB/,
  ],
  [
    "single-file tool",
    [
      { name: "a", size: 1 },
      { name: "b", size: 1 },
    ],
    [],
    "split",
    /one file/,
  ],
  [
    "compare third file",
    [{ name: "a", size: 1 }],
    [{ size: 1 }, { size: 1 }],
    "compare",
    /exactly two/,
  ],
] as const)
  test(`selection validation: ${label}`, () =>
    assert.throws(() => validateSelection(getTool(slug)!, [...input], [...existing]), pattern));
test("content sniffing rejects extension disguises and invalid UTF-8", async () => {
  assert.equal(identifyFile(await file("one-page.pdf"), "wrong.bin"), "pdf");
  assert.equal(
    identifyFile(new TextEncoder().encode("<svg onload='bad()'/>"), "fake.png"),
    "invalid",
  );
  assert.equal(identifyFile(new Uint8Array([255, 254, 255]), "bad.txt"), "invalid");
  assert.equal(identifyFile(await file("image.webp"), "image.webp"), "image");
});
test("output JSON, filenames and byte labels are safely formatted", () => {
  assert.ok(!safeJson({ x: "</script>" }).includes("</script>"));
  assert.equal(safeFilename("../../a?.pdf"), "_.._a_.pdf");
  assert.equal(fmtBytes(1024), "1 KB");
});
test("dispatcher refuses unsupported or unconfirmed destructive operations", async () => {
  const bytes = await file("one-page.pdf"),
    f = { id: "test", name: "test.pdf", type: "application/pdf", size: bytes.length, bytes },
    hooks = { signal: new AbortController().signal, onProgress: () => {} };
  await assert.rejects(executeTool("unknown", [f], DEFAULT_OPTIONS, hooks), /not available/);
  await assert.rejects(
    executeTool("redact", [f], DEFAULT_OPTIONS, hooks),
    /Confirm you understand/,
  );
  await assert.rejects(executeTool("compare", [f], DEFAULT_OPTIONS, hooks), /exactly two/);
});
test("PNG headers are checked before image decoding", async () => {
  const { imageDimensions } = await import("../../src/lib/pdf/imageHeader");
  assert.deepEqual(imageDimensions(await file("image.png")), { width: 640, height: 360 });
});
test("JPEG, EXIF JPEG and WebP dimensions are parsed locally", async () => {
  const { imageDimensions } = await import("../../src/lib/pdf/imageHeader");
  for (const name of ["image.jpg", "rotated-photo.jpg", "image.webp"])
    assert.deepEqual(imageDimensions(await file(name)), { width: 640, height: 360 });
});
test("image decompression bombs are rejected from their headers", async () => {
  const { imageDimensions } = await import("../../src/lib/pdf/imageHeader");
  const b = (await file("image.png")).slice(),
    v = new DataView(b.buffer);
  v.setUint32(16, 100000);
  v.setUint32(20, 100000);
  assert.throws(() => imageDimensions(b), /exceeds 24 megapixels/);
});
test("truncated and zero-dimension images are rejected", async () => {
  const { imageDimensions } = await import("../../src/lib/pdf/imageHeader");
  assert.throws(
    () => imageDimensions(new Uint8Array([0xff, 0xd8, 0xff])),
    /invalid or unsupported/,
  );
  const b = (await file("image.png")).slice(),
    v = new DataView(b.buffer);
  v.setUint32(16, 0);
  assert.throws(() => imageDimensions(b), /invalid or unsupported/);
});
test("Unicode opening passwords round-trip without corruption", async () => {
  const password = "मेरा-सुरक्षित-पासवर्ड",
    bytes = await file("one-page.pdf"),
    encrypted = await secure.protectPdf(bytes, password),
    unlocked = await secure.unlockPdf(encrypted, password);
  assert.match(await text(unlocked), /SENSITIVE ACCOUNT 314159/);
});
test("structured extraction detects headings, tables and font styles", async () => {
  const pages = await convert.extractTextPages(await file("three-pages.pdf")),
    blocks = pages[0].blocks;
  assert.deepEqual(
    blocks.map((b) => b.type),
    ["heading", "paragraph", "table", "paragraph", "paragraph"],
  );
  const heading = blocks[0];
  assert.equal(heading.type === "heading" && heading.text, "ALPHA PAGE ONE");
  const table = blocks[2];
  assert.ok(table.type === "table");
  if (table.type === "table")
    assert.deepEqual(table.grid, [
      ["Item", "Amount"],
      ["Notebook", "1250"],
    ]);
  assert.ok(pages[0].rows.flat().every((item) => item.size > 0 && typeof item.bold === "boolean"));
});
test("PDF-to-DOCX writes detected headings and real tables", async () => {
  const out = await convert.pdfToDocx(await file("three-pages.pdf")),
    zip = await JSZip.loadAsync(out),
    xml = await zip.file("word/document.xml")!.async("string");
  assert.match(xml, /ALPHA PAGE ONE/);
  assert.match(xml, /w:pStyle[^>]*Heading1/);
  assert.match(xml, /<w:tbl[\s>]/);
  assert.match(xml, /Notebook/);
  assert.ok(!xml.includes("w:drawing"));
});
test("PDF-to-Markdown keeps headings, lists and pipe tables", async () => {
  const md = await convert.pdfToMarkdown(await file("three-pages.pdf"));
  assert.match(md, /^# ALPHA PAGE ONE/m);
  assert.match(md, /\| Item \| Amount \|/);
  assert.match(md, /\| --- \| --- \|/);
  assert.match(md, /^---$/m);
  await assert.rejects(convert.pdfToMarkdown(await file("scanned.pdf")), /Use OCR/);
});
test("Two-column PDFs keep column reading order", async () => {
  const pages = await convert.extractTextPages(await file("two-column.pdf"));
  assert.equal(pages[0].lines.length, 25);
  assert.ok(pages[0].lines.slice(1, 13).every((l) => l.startsWith("Left")));
  assert.ok(pages[0].lines.slice(13, 25).every((l) => l.startsWith("Right")));
  assert.ok(!pages[0].lines.some((l) => l.includes("Left") && l.includes("Right")));
});
test("Ruled tables split on grid lines, not gaps", async () => {
  const pages = await convert.extractTextPages(await file("ruled-table.pdf"));
  assert.equal(pages[0].ruledCols.size, 5);
  const table = pages[0].blocks.find((b) => b.type === "table");
  assert.ok(table && table.type === "table");
  assert.deepEqual(table.grid, [
    ["Item", "Qty", "Price"],
    ["Apples", "12", "3.50"],
    ["Bread", "2", "1.20"],
    ["Milk", "6", "4.80"],
    ["Cheese", "3", "2.10"],
  ]);
  const records = await convert.pdfToCsv(await file("ruled-table.pdf"));
  assert.match(records, /"Apples"/);
  assert.ok(!records.includes("Apples 12"));
});
test("PDF-to-Word embeds extracted images in reading order", async () => {
  const pages = await convert.extractTextPages(await file("text-image.pdf"), undefined, env);
  assert.deepEqual(
    pages[0].blocks.map((b) => b.type),
    ["heading", "paragraph", "image", "paragraph", "paragraph"],
  );
  assert.equal(pages[0].images.length, 1);
  assert.ok(pages[0].images[0].png && pages[0].images[0].png.length > 1000);
  const headless = await convert.extractTextPages(await file("text-image.pdf"));
  assert.equal(headless[0].images.length, 1);
  assert.equal(headless[0].images[0].png, null);
  const bytes = await convert.pdfToDocx(await file("text-image.pdf"), undefined, env);
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("word/document.xml")!.async("string");
  assert.match(xml, /w:drawing/);
  const plain = await convert.pdfToDocx(await file("three-pages.pdf"), undefined, env);
  const zip2 = await JSZip.loadAsync(plain);
  assert.ok(!(await zip2.file("word/document.xml")!.async("string")).includes("w:drawing"));
});
test("PDF-to-Markdown embeds small images and keeps the OCR redirect", async () => {
  const md = await convert.pdfToMarkdown(await file("text-image.pdf"), undefined, env);
  assert.match(md, /!\[Image 1 on page 1\]\(data:image\/png;base64,[A-Za-z0-9+/]+=*\)/);
  await assert.rejects(convert.pdfToXlsx(await file("scanned.pdf")), /Use OCR/);
  await assert.rejects(convert.pdfToCsv(await file("scanned.pdf")), /Use OCR/);
});
test("PDF-to-PowerPoint builds one editable slide per page", async () => {
  const out = await pptx.pdfToPptx(await file("three-pages.pdf"));
  assert.equal(out.slides, 3);
  assert.equal(out.truncated, false);
  const zip = await JSZip.loadAsync(out.bytes);
  assert.ok(zip.file("ppt/presentation.xml"));
  const slide = await zip.file("ppt/slides/slide1.xml")!.async("string");
  assert.match(slide, /ALPHA PAGE ONE/);
  assert.match(slide, /<a:tbl>/);
  await assert.rejects(pptx.pdfToPptx(await file("scanned.pdf")), /Use OCR/);
});
test("PDF-to-PowerPoint embeds page images as slide pictures", async () => {
  const out = await pptx.pdfToPptx(await file("text-image.pdf"), undefined, env);
  assert.equal(out.slides, 1);
  const zip = await JSZip.loadAsync(out.bytes);
  const slide = await zip.file("ppt/slides/slide1.xml")!.async("string");
  assert.match(slide, /<p:pic>/);
  const media = zip.file("ppt/media/image1.png");
  assert.ok(media);
  assert.ok((await media!.async("uint8array")).length > 1000);
});
test("PowerPoint-to-PDF renders titles, bullets, tables and images", async () => {
  const out = await pptx.pptxToPdf(await file("sample.pptx"));
  assert.match(await text(out.bytes), /ALPHA PAGE TWO/);
  assert.match(await text(out.bytes), /Notebook/);
  assert.ok(out.warnings.some((w) => /SmartArt/.test(w)));
  const roundTrip = await pptx.pptxToPdf(
    (await pptx.pdfToPptx(await file("text-image.pdf"), undefined, env)).bytes,
  );
  assert.match(await text(roundTrip.bytes), /MIXED CONTENT PROBE/);
  assert.ok(roundTrip.bytes.length > 1000);
  await assert.rejects(pptx.pptxToPdf(await file("sample.xlsx")), /presentation/);
});
test("PDF-to-XLSX writes a genuine workbook with numeric cells", async () => {
  const out = await convert.pdfToXlsx(await file("three-pages.pdf"));
  assert.equal(out.sheets, 3);
  assert.equal(out.truncated, false);
  const zip = await JSZip.loadAsync(out.bytes);
  assert.ok(zip.file("xl/workbook.xml"));
  assert.ok(zip.file("xl/worksheets/sheet3.xml"));
  const sheet = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
  assert.match(sheet, /<c r="B4"><v>1250<\/v><\/c>/);
  assert.ok(!sheet.includes("<f>"));
  const reread = await (await import("../../src/lib/pdf/xlsx")).readXlsx(out.bytes);
  assert.equal(reread.sheets.length, 3);
  assert.ok(reread.sheets[0].grid.flat().join(" ").includes("Notebook"));
});
test("XLSX writer truncates beyond the cell budget instead of failing", async () => {
  const { buildXlsx } = await import("../../src/lib/pdf/xlsx");
  const grid = Array.from({ length: 2600 }, () => Array.from({ length: 100 }, () => "x"));
  const out = await buildXlsx([{ name: "big", grid }]);
  assert.equal(out.truncated, true);
  assert.ok(out.bytes.length > 1000);
});
test("XLSX reader returns exact grids from the synthetic workbook", async () => {
  const { readXlsx } = await import("../../src/lib/pdf/xlsx");
  const data = await readXlsx(await file("sample.xlsx"));
  assert.deepEqual(
    data.sheets.map((s) => s.name),
    ["Items", "Notes"],
  );
  assert.deepEqual(data.sheets[0].grid, [
    ["Item", "Amount"],
    ["Notebook", "1250"],
    ["Pen", "120"],
  ]);
});
test("XLSX preflight rejects non-workbooks, macros and declared ZIP bombs", async () => {
  const { inspectXlsxZip } = await import("../../src/lib/pdf/xlsx");
  assert.ok(inspectXlsxZip(await file("sample.xlsx")).expandedBytes > 0);
  const zip = new JSZip();
  zip.file("test.txt", "not excel");
  assert.throws(() => inspectXlsxZip(new Uint8Array([80, 75, 3, 4])), /valid XLSX ZIP container/);
  const nonWorkbook = await zip.generateAsync({ type: "uint8array" });
  assert.throws(() => inspectXlsxZip(nonWorkbook), /does not contain an Excel workbook/);
  const macro = await JSZip.loadAsync(await file("sample.xlsx"));
  macro.file("xl/vbaProject.bin", new Uint8Array([1]));
  const macroBytes = await macro.generateAsync({ type: "uint8array" });
  assert.throws(() => inspectXlsxZip(macroBytes), /Macro-enabled/);
  const bomb = (await file("sample.xlsx")).slice(),
    view = new DataView(bomb.buffer);
  for (let i = 0; i < bomb.length - 46; i++)
    if (view.getUint32(i, true) === 0x02014b50) {
      view.setUint32(i + 24, 200 * 1024 * 1024, true);
      break;
    }
  assert.throws(() => inspectXlsxZip(bomb), /safe 150 MB/);
});
test("Excel-to-PDF renders searchable tables with sheet headings", async () => {
  const out = await convert.xlsxToPdf(await file("sample.xlsx")),
    t = await text(out.bytes);
  assert.match(t, /Items/);
  assert.match(t, /Notebook/);
  assert.match(t, /1250/);
  assert.match(t, /Document conversion fixture 2026/);
  assert.ok(out.warnings.join(" ").includes("Simplified table layout"));
});
test("text-first DOCX-to-PDF keeps real selectable words and tables", async () => {
  const out = await convert.docxTextToPdf(await file("sample.docx")),
    t = await text(out.bytes);
  assert.match(t, /Document conversion fixture 2026/);
  assert.match(t, /Real text\. Local processing\. No upload\./);
  assert.match(t, /Notebook/);
  assert.match(t, /1250/);
  assert.ok(out.warnings.join(" ").includes("Simplified layout"));
});
test("extractive summary picks representative sentences without inventing text", () => {
  const body =
    "The quarterly revenue report shows growth. Revenue increased in every quarter. " +
    "The office cat sat quietly by the window. Revenue growth continued strongly.";
  const result = convert.extractiveSummary(body, 1);
  assert.equal(result.picked, 1);
  assert.equal(result.total, 4);
  assert.match(result.summary, /revenue/i);
  assert.ok(body.includes(result.summary));
  assert.equal(convert.extractiveSummary("", 3).summary, "");
});
test("PDF summary honors length options and rejects scans", async () => {
  const short = await convert.pdfSummary(await file("three-pages.pdf"), "short");
  assert.ok(short.picked >= 1 && short.picked <= 3);
  assert.ok(short.summary.length > 20);
  const long = await convert.pdfSummary(await file("three-pages.pdf"), "long");
  assert.ok(long.picked >= short.picked);
  await assert.rejects(convert.pdfSummary(await file("scanned.pdf"), "short"), /Use OCR/);
});
test("form listing reports real field names, types and values", async () => {
  const fields = await core.listFormFields(await file("form.pdf"));
  assert.equal(fields.length, 1);
  assert.equal(fields[0].name, "approval");
  assert.equal(fields[0].type, "text");
  assert.equal(fields[0].value, "APPROVED 2026");
  assert.equal(fields[0].readOnly, false);
});
test("form filling stores values and refuses unknown fields", async () => {
  const out = await core.fillFormFields(await file("form.pdf"), { approval: "UNIT 2026" }),
    d = await core.loadPdf(out.bytes);
  assert.deepEqual(out.filled, ["approval"]);
  assert.equal(d.getForm().getTextField("approval").getText(), "UNIT 2026");
  await assert.rejects(
    core.fillFormFields(await file("form.pdf"), { missing: "x" }),
    /No fillable/,
  );
});
test("spreadsheet content sniffing accepts XLSX and rejects disguises", async () => {
  assert.equal(identifyFile(await file("sample.xlsx"), "sample.xlsx"), "spreadsheet");
  assert.equal(identifyFile(await file("sample.docx"), "sample.docx"), "document");
  assert.equal(identifyFile(new TextEncoder().encode("not a zip"), "fake.xlsx"), "invalid");
});
test("dispatcher runs every new conversion end to end", async () => {
  const hooks = { signal: new AbortController().signal, onProgress: () => {} };
  const local = (name: string, type: string, bytes: Uint8Array) => ({
    id: "test",
    name,
    type,
    size: bytes.length,
    bytes,
  });
  const pdf = local("three-pages.pdf", "application/pdf", await file("three-pages.pdf"));
  const md = await executeTool("pdf-to-markdown", [pdf], DEFAULT_OPTIONS, hooks);
  assert.match(md.files[0].name, /\.md$/);
  assert.match(md.previewText!, /^# ALPHA PAGE ONE/m);
  const summary = await executeTool("summarize", [pdf], DEFAULT_OPTIONS, hooks);
  assert.match(summary.files[0].name, /-summary\.txt$/);
  assert.ok(summary.previewText!.length > 20);
  const xlsx = await executeTool("pdf-to-excel", [pdf], DEFAULT_OPTIONS, hooks);
  assert.match(xlsx.files[0].name, /\.xlsx$/);
  assert.ok((await JSZip.loadAsync(xlsx.files[0].bytes)).file("xl/workbook.xml"));
  const book = local(
    "sample.xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    await file("sample.xlsx"),
  );
  const rendered = await executeTool("excel-to-pdf", [book], DEFAULT_OPTIONS, hooks);
  assert.match(await text(rendered.files[0].bytes), /Notebook/);
  const word = local(
    "sample.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    await file("sample.docx"),
  );
  const wordPdf = await executeTool("word-to-pdf", [word], DEFAULT_OPTIONS, hooks);
  assert.match(await text(wordPdf.files[0].bytes), /Document conversion fixture 2026/);
  const deck = await executeTool("pdf-to-powerpoint", [pdf], DEFAULT_OPTIONS, hooks);
  assert.match(deck.files[0].name, /\.pptx$/);
  assert.ok((await JSZip.loadAsync(deck.files[0].bytes)).file("ppt/presentation.xml"));
  assert.match(deck.notes.join(" "), /3 slides/);
  const slides = local(
    "sample.pptx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    await file("sample.pptx"),
  );
  const slidePdf = await executeTool("powerpoint-to-pdf", [slides], DEFAULT_OPTIONS, hooks);
  assert.match(await text(slidePdf.files[0].bytes), /ALPHA PAGE ONE/);
  assert.ok(slidePdf.notes.some((n) => /SmartArt/.test(n)));
  const form = local("form.pdf", "application/pdf", await file("form.pdf"));
  const filled = await executeTool(
    "fill-pdf-form",
    [form],
    { ...DEFAULT_OPTIONS, fieldValues: { approval: "DISPATCH 2026" } },
    hooks,
  );
  const d = await core.loadPdf(filled.files[0].bytes);
  assert.equal(d.getForm().getTextField("approval").getText(), "DISPATCH 2026");
});
test("pipelines validate chains and thread file sets through steps", async () => {
  const pipes = await import("../../src/lib/pipelines");
  const hooks = { signal: new AbortController().signal, onProgress: () => {} };
  const local = (name: string, type: string, bytes: Uint8Array) => ({
    id: "test",
    name,
    type,
    size: bytes.length,
    bytes,
  });
  const pdf = local("three-pages.pdf", "application/pdf", await file("three-pages.pdf"));
  assert.equal(pipes.PIPELINES.length, 8);
  for (const preset of pipes.PIPELINES) pipes.validateChain(preset.steps.map((s) => s.slug));
  assert.throws(() => pipes.validateChain(["pdf-to-word", "compress"]), /cannot open/);
  assert.throws(() => pipes.validateChain([]), /at least one/);
  assert.throws(
    () => pipes.validateChain(Array.from({ length: 9 }, () => "compress")),
    /limited to 8/,
  );
  const out = await pipes.executePipeline(
    [{ slug: "split", options: { splitMode: "each" } }, { slug: "flatten" }],
    [pdf],
    DEFAULT_OPTIONS,
    hooks,
  );
  assert.equal(out.files.length, 3);
  assert.deepEqual(
    out.stages.map((s) => [s.slug, s.inFiles, s.outFiles]),
    [
      ["split", 1, 3],
      ["flatten", 3, 3],
    ],
  );
  assert.ok(out.notes.every((n) => n.startsWith("Step ")));
  await assert.rejects(
    pipes.executePipeline([{ slug: "sanitize" }], [pdf], DEFAULT_OPTIONS, hooks),
    /Confirm/,
  );
  const img = local("image.png", "image/png", await file("image.png"));
  await assert.rejects(
    pipes.executePipeline([{ slug: "compress" }], [img], DEFAULT_OPTIONS, hooks),
    /cannot start/,
  );
  const word = local(
    "sample.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    await file("sample.docx"),
  );
  const packed = await pipes.executePipeline(
    pipes.PIPELINES.find((p) => p.id === "office-pdf-pack")!.steps,
    [word],
    DEFAULT_OPTIONS,
    hooks,
  );
  assert.match(await text(packed.files[0].bytes), /Document conversion fixture 2026/);
});
test("local CLI converts, pipes and refuses honestly", async () => {
  const run = (args: string[]) =>
    spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "cli/pdforge.mts", ...args], {
      encoding: "utf8",
    });
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pdforge-cli-"));
  const list = run(["list"]);
  assert.equal(list.status, 0);
  assert.match(list.stdout, /pdf-to-word/);
  assert.match(list.stdout, /split-and-flatten/);
  const single = run(["pdf-to-text", "tests/fixtures/three-pages.pdf", "--out", dir, "--quiet"]);
  assert.equal(single.status, 0);
  assert.match(single.stdout, /three-pages\.txt/);
  const piped = run([
    "pipe",
    "split-and-flatten",
    "tests/fixtures/three-pages.pdf",
    "--out",
    dir,
    "--quiet",
  ]);
  assert.equal(piped.status, 0);
  assert.equal(piped.stdout.trim().split("\n").length, 3);
  const ocr = run(["ocr", "tests/fixtures/scanned.pdf", "--out", dir]);
  assert.notEqual(ocr.status, 0);
  assert.match(ocr.stdout + ocr.stderr, /browser engine/);
  const bad = run(["compress", "tests/fixtures/three-pages.pdf", "--set", "compression=bogus"]);
  assert.notEqual(bad.status, 0);
  assert.match(bad.stdout + bad.stderr, /must be one of/);
  await fs.rm(dir, { recursive: true, force: true });
});
