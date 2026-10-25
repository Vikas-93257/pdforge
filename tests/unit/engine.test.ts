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
test("catalog contains exactly 30 unique implemented tools", () => {
  assert.equal(TOOLS.length, 30);
  assert.equal(new Set(TOOLS.map((t) => t.slug)).size, 30);
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
