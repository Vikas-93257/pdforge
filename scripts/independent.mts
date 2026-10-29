import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createCanvas, type Canvas } from "@napi-rs/canvas";
import { createWorker, OEM } from "tesseract.js";
import { pdfToImages, type CanvasEnv } from "../src/lib/pdf/render";
for (const tool of ["qpdf", "pdftotext", "pdftoppm"])
  if (spawnSync(tool, [tool === "qpdf" ? "--version" : "-v"]).status !== 0)
    throw new Error(
      `Install ${tool} for independent validation (Debian/Ubuntu: qpdf poppler-utils).`,
    );
const results: Record<string, unknown>[] = [];
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "pdforge-independent-"));
const env: CanvasEnv = {
  createCanvas(w, h) {
    const canvas = createCanvas(w, h);
    return { canvas, ctx: canvas.getContext("2d") };
  },
  async toBytes(canvas, format, quality) {
    return new Uint8Array(
      format === "png"
        ? (canvas as Canvas).toBuffer("image/png")
        : (canvas as Canvas).toBuffer("image/jpeg", quality * 100),
    );
  },
};
try {
  for (const folder of await fs.readdir("reports/downloads")) {
    const dir = path.join("reports/downloads", folder);
    if (!(await fs.stat(dir)).isDirectory()) continue;
    for (const name of await fs.readdir(dir)) {
      if (!name.endsWith(".pdf")) continue;
      const target = path.join(dir, name),
        args =
          folder === "protect"
            ? ["--password=browser-test-password", "--check", target]
            : ["--check", target],
        checked = spawnSync("qpdf", args, { encoding: "utf8" });
      assert.equal(checked.status, 0, `${target}: ${checked.stderr}`);
      results.push({ file: target, nativeQpdf: "PASS" });
    }
  }
  const converted = new Uint8Array(
      await fs.readFile("reports/downloads/word-to-pdf/sample-word-to-pdf.pdf"),
    ),
    png = (await pdfToImages(converted, { env, format: "png", scale: 2 }))[0];
  await fs.writeFile("reports/word-conversion-render.png", png.bytes);
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    langPath: path.resolve("public/engines/ocr/lang"),
    gzip: true,
    cacheMethod: "none",
    logger: () => {},
  });
  try {
    const recognized = await worker.recognize(Buffer.from(png.bytes), {}, { text: true });
    assert.match(
      recognized.data.text,
      /Document conversion fixture 2026/i,
      "Rendered DOCX must contain the real source words, not blank placeholder pages",
    );
    await fs.writeFile("reports/word-conversion-ocr.txt", recognized.data.text);
    results.push({
      check: "Independent OCR of browser DOCX→PDF output",
      result: "PASS",
      text: recognized.data.text.trim(),
      confidence: recognized.data.confidence,
    });
  } finally {
    await worker.terminate();
  }
  for (const [slug, name] of [
    ["pdf-to-word", "three-pages.docx"],
    ["pdf-to-excel", "three-pages.xlsx"],
    ["pdf-to-powerpoint", "three-pages.pptx"],
  ]) {
    const target = path.join("reports/downloads", slug, name),
      checked = spawnSync(
        "python3",
        [
          "-c",
          "import sys,zipfile; zipfile.ZipFile(sys.argv[1]).testzip() or print('ZIP OK')",
          target,
        ],
        { encoding: "utf8" },
      );
    assert.equal(checked.status, 0, `${target}: ${checked.stderr}`);
    assert.match(checked.stdout, /ZIP OK/, `${target} is not a valid ZIP container`);
    results.push({
      check: `Independent Python zipfile validates browser ${slug} output`,
      result: "PASS",
    });
  }
  const excelText = spawnSync(
    "pdftotext",
    ["reports/downloads/excel-to-pdf/sample-excel-to-pdf.pdf", "-"],
    { encoding: "utf8" },
  );
  assert.equal(excelText.status, 0);
  assert.match(excelText.stdout, /Notebook/);
  assert.match(excelText.stdout, /1250/);
  results.push({ check: "Independent Poppler reads Excel-to-PDF table text", result: "PASS" });
  const wordText = spawnSync(
    "pdftotext",
    ["reports/downloads/word-to-pdf/sample-word-to-pdf.pdf", "-"],
    { encoding: "utf8" },
  );
  assert.equal(wordText.status, 0);
  assert.match(wordText.stdout, /Document conversion fixture 2026/);
  results.push({
    check: "Independent Poppler reads text-first Word-to-PDF output",
    result: "PASS",
  });
  const slidesText = spawnSync(
    "pdftotext",
    ["reports/downloads/powerpoint-to-pdf/sample-powerpoint-to-pdf.pdf", "-"],
    { encoding: "utf8" },
  );
  assert.equal(slidesText.status, 0);
  assert.match(slidesText.stdout, /ALPHA PAGE ONE/);
  assert.match(slidesText.stdout, /Notebook/);
  results.push({
    check: "Independent Poppler reads text-first PowerPoint-to-PDF output",
    result: "PASS",
  });
  const markdown = await fs.readFile("reports/downloads/pdf-to-markdown/three-pages.md", "utf8");
  assert.match(markdown, /^# ALPHA PAGE ONE/m);
  assert.match(markdown, /\| Item \| Amount \|/);
  results.push({ check: "Markdown export keeps headings and pipe tables", result: "PASS" });
  const summary = await fs.readFile("reports/downloads/summarize/three-pages-summary.txt", "utf8"),
    sourceText = spawnSync("pdftotext", ["tests/fixtures/three-pages.pdf", "-"], {
      encoding: "utf8",
    });
  assert.equal(sourceText.status, 0);
  const sourceWords = new Set(sourceText.stdout.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
  assert.ok(summary.trim().length > 20, "summary is unexpectedly short");
  for (const word of summary.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])
    assert.ok(sourceWords.has(word), `summary invents out-of-source word: ${word}`);
  results.push({ check: "Summary uses only source-document words", result: "PASS" });
  const filledJson = spawnSync(
    "qpdf",
    ["--json", "reports/downloads/fill-pdf-form/form-fill-pdf-form.pdf"],
    { encoding: "utf8" },
  );
  assert.equal(filledJson.status, 0);
  assert.ok(filledJson.stdout.includes("BROWSER 2026"), "filled value missing from form objects");
  results.push({ check: "qpdf object inspection finds the filled form value", result: "PASS" });
  for (const slug of ["redact", "sanitize"]) {
    const dir = path.join("reports/downloads", slug),
      name = (await fs.readdir(dir)).find((n) => n.endsWith(".pdf"))!,
      target = path.join(dir, name);
    const extracted = spawnSync("pdftotext", [target, "-"], { encoding: "utf8" });
    assert.equal(extracted.status, 0);
    assert.equal(extracted.stdout.trim(), "", `${slug} must not retain source text`);
    const json = spawnSync("qpdf", ["--json", target], { encoding: "utf8" });
    assert.equal(json.status, 0);
    for (const secret of [
      "PRIVATE AUTHOR",
      "PRIVATE DOCUMENT TITLE",
      "EmbeddedFiles",
      "HIDDEN XMP",
      "HIDDEN ATTACHMENT",
    ])
      assert.ok(!json.stdout.includes(secret), `${slug}: original hidden data retained`);
    results.push({
      check: `${slug}: independent Poppler text and qpdf object inspection`,
      result: "PASS",
    });
  }
  const target = "reports/downloads/redact/metadata-redact.pdf",
    prefix = path.join(temp, "redacted");
  const rendered = spawnSync(
    "pdftoppm",
    ["-f", "1", "-singlefile", "-scale-to-x", "612", "-scale-to-y", "792", "-png", target, prefix],
    { encoding: "utf8" },
  );
  assert.equal(rendered.status, 0, rendered.stderr);
  const { loadImage } = await import("@napi-rs/canvas"),
    image = await loadImage(await fs.readFile(prefix + ".png")),
    canvas = createCanvas(612, 792),
    ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const pixel = [...ctx.getImageData(200, 90, 1, 1).data];
  assert.ok(pixel[0] < 5 && pixel[1] < 5 && pixel[2] < 5);
  results.push({
    check: "Poppler-rendered redaction region is solid black",
    result: "PASS",
    samplePixel: pixel,
  });
  const unlocked = spawnSync("pdftotext", ["reports/downloads/unlock/protected-unlock.pdf", "-"], {
    encoding: "utf8",
  });
  assert.equal(unlocked.status, 0);
  assert.match(unlocked.stdout, /SENSITIVE ACCOUNT 314159/);
  results.push({
    check: "Independent Poppler reads known-password-unlocked output",
    result: "PASS",
  });
  const report = {
    passed: true,
    nativeQpdfVersion: spawnSync("qpdf", ["--version"], { encoding: "utf8" }).stdout.trim(),
    popplerVersion: spawnSync("pdftotext", ["-v"], { encoding: "utf8" }).stderr.split("\n")[0],
    checks: results,
  };
  await fs.writeFile("reports/independent-validation.json", JSON.stringify(report, null, 2));
  console.log(`Independent validation passed: ${results.length} checks.`);
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
