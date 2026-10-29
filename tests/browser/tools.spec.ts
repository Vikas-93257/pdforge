import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { PDFName } from "pdf-lib";
import { loadImage } from "@napi-rs/canvas";
import JSZip from "jszip";
import { TOOLS } from "../../src/lib/tools";
import { loadPdf } from "../../src/lib/pdf/engine";
import { pdfToText, extractTextPages } from "../../src/lib/pdf/convert";
const fixture = (name: string) => path.resolve("tests/fixtures", name);
type Actual = { name: string; bytes: Uint8Array };
async function outputs(page: Page): Promise<Actual[]> {
  return (
    await page
      .locator(".result-actions a[download], .individual-files a[download]")
      .evaluateAll(async (anchors) =>
        Promise.all(
          anchors.map(async (node) => {
            const a = node as HTMLAnchorElement;
            return {
              name: a.download,
              bytes: Array.from(new Uint8Array(await (await fetch(a.href)).arrayBuffer())),
            };
          }),
        ),
      )
  ).map((f) => ({ name: f.name, bytes: new Uint8Array(f.bytes) }));
}
async function checkPdf(bytes: Uint8Array, count: number, fragment?: string) {
  const d = await loadPdf(bytes);
  expect(d.getPageCount()).toBe(count);
  if (fragment) expect(await pdfToText(bytes)).toContain(fragment);
  return d;
}
async function fill(page: Page, slug: string) {
  if (slug === "split") await page.getByLabel(/^Page ranges/).fill("1-2,3");
  if (slug === "extract-pages") await page.getByLabel(/^Pages to keep/).fill("3,1");
  if (slug === "remove-pages") await page.getByLabel(/^Pages to remove/).fill("2");
  if (slug === "organize") {
    await page.getByRole("button", { name: "Move page 3 earlier", exact: true }).click();
    await page.getByRole("button", { name: "Rotate page 1", exact: true }).click();
    await page.getByRole("button", { name: "Delete page 2", exact: true }).click();
  }
  if (slug === "sign") await page.getByLabel("Your signature text").fill("Alex Local");
  if (slug === "fill-pdf-form") await page.getByLabel("Fill field approval").fill("BROWSER 2026");
  if (slug === "protect") {
    await page.getByLabel(/^Opening password/).fill("browser-test-password");
    await page.getByLabel("Confirm opening password").fill("browser-test-password");
  }
  if (slug === "unlock")
    await page.getByLabel(/^Known document password/).fill("correct-horse-2026");
  if (slug === "metadata") {
    await page.getByLabel("Title", { exact: true }).fill("Public release");
    await page.getByLabel("Author", { exact: true }).fill("Release Team");
  }
  if (slug === "sanitize" || slug === "redact")
    await page.getByRole("checkbox", { name: /I understand the output is image-based/ }).check();
  if (slug === "redact") {
    await page
      .getByText("Add a region using coordinates (keyboard accessible)", { exact: true })
      .click();
    await page.getByLabel("Left (%)", { exact: true }).fill("0");
    await page.getByLabel("Top (%)", { exact: true }).fill("0");
    await page.getByLabel("Width (%)", { exact: true }).fill("100");
    await page.getByLabel("Height (%)", { exact: true }).fill("25");
    await page.getByRole("button", { name: "Add region on page 1" }).click();
  }
}
for (const tool of TOOLS)
  test(`${tool.slug}: actual browser processing and valid downloads`, async ({ page }, info) => {
    test.setTimeout(tool.slug === "ocr" ? 180000 : 90000);
    const pageErrors: string[] = [],
      badAssets: string[] = [],
      external: string[] = [],
      writes: string[] = [];
    const base = new URL(info.project.use.baseURL as string).origin;
    page.on("pageerror", (e) => pageErrors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) badAssets.push(`${r.status()} ${r.url()}`);
    });
    page.on("request", (r) => {
      if (!r.url().startsWith("blob:") && !r.url().startsWith("data:")) {
        if (new URL(r.url()).origin !== base) external.push(r.url());
        if (!["GET", "HEAD"].includes(r.method())) writes.push(r.url());
      }
    });
    await page.goto(`tools/${tool.slug}/`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(tool.name);
    let names = ["three-pages.pdf"];
    if (tool.slug === "merge" || tool.slug === "rotate" || tool.slug === "compare")
      names = ["three-pages.pdf", "two-pages.pdf"];
    if (tool.slug === "jpg-to-pdf") names = ["image.png", "image.webp"];
    if (tool.slug === "word-to-pdf") names = ["sample.docx"];
    if (tool.slug === "excel-to-pdf") names = ["sample.xlsx"];
    if (tool.slug === "fill-pdf-form") names = ["form.pdf"];
    if (tool.slug === "text-to-pdf") names = ["text.txt"];
    if (tool.slug === "repair") names = ["repairable.pdf"];
    if (tool.slug === "unlock") names = ["protected.pdf"];
    if (tool.slug === "flatten") names = ["form.pdf"];
    if (["redact", "sanitize", "metadata"].includes(tool.slug)) names = ["metadata.pdf"];
    if (tool.slug === "ocr") names = ["scanned.pdf"];
    if (tool.slug === "extract-images") names = ["with-image.pdf"];
    await page.locator('input[type="file"]').setInputFiles(names.map(fixture));
    await expect(page.locator(".file-row")).toHaveCount(names.length);
    await fill(page, tool.slug);
    const run = page.getByRole("button", { name: tool.cta, exact: true });
    await expect(run).toBeEnabled();
    await run.click();
    await expect(page.locator('.result-panel, .form-error[role="alert"]').first()).toBeVisible({
      timeout: tool.slug === "ocr" ? 160000 : 70000,
    });
    await expect(page.locator(".result-panel")).toBeVisible();
    await expect(page.locator('.form-error[role="alert"]')).toHaveCount(0);
    const actual = await outputs(page);
    expect(actual.length).toBeGreaterThan(0);
    for (const f of actual) expect(f.bytes.length).toBeGreaterThan(30);
    await fs.mkdir(`reports/downloads/${tool.slug}`, { recursive: true });
    for (const f of actual) await fs.writeFile(`reports/downloads/${tool.slug}/${f.name}`, f.bytes);
    if (tool.slug === "merge") await checkPdf(actual[0].bytes, 5, "BETA PAGE TWO");
    else if (tool.slug === "split") {
      expect(actual.length).toBe(2);
      await checkPdf(actual[0].bytes, 2, "ALPHA PAGE TWO");
      await checkPdf(actual[1].bytes, 1, "ALPHA PAGE THREE");
    } else if (tool.slug === "organize") {
      const d = await checkPdf(actual[0].bytes, 2, "ALPHA PAGE THREE");
      expect(d.getPage(0).getRotation().angle).toBe(90);
      expect(await pdfToText(actual[0].bytes)).not.toContain("ALPHA PAGE TWO");
    } else if (tool.slug === "extract-pages") {
      await checkPdf(actual[0].bytes, 2);
      expect((await pdfToText(actual[0].bytes)).indexOf("ALPHA PAGE THREE")).toBeLessThan(
        (await pdfToText(actual[0].bytes)).indexOf("ALPHA PAGE ONE"),
      );
    } else if (tool.slug === "remove-pages") {
      await checkPdf(actual[0].bytes, 2);
      expect(await pdfToText(actual[0].bytes)).not.toContain("ALPHA PAGE TWO");
    } else if (tool.slug === "rotate") {
      expect(actual.length).toBe(2);
      for (const f of actual)
        expect((await loadPdf(f.bytes)).getPages().every((p) => p.getRotation().angle === 90)).toBe(
          true,
        );
    } else if (tool.slug === "compress") {
      await checkPdf(actual[0].bytes, 3, "SENSITIVE ACCOUNT 314159");
      expect(actual[0].bytes.length).toBeLessThanOrEqual((await fs.stat(fixture(names[0]))).size);
    } else if (tool.slug === "repair")
      await checkPdf(actual[0].bytes, 1, "SENSITIVE ACCOUNT 314159");
    else if (tool.slug === "pdf-to-jpg" || tool.slug === "pdf-to-png") {
      expect(actual.length).toBe(3);
      for (const f of actual) {
        const image = await loadImage(f.bytes);
        expect(image.width).toBeGreaterThan(600);
        expect(image.height).toBeGreaterThan(700);
      }
    } else if (tool.slug === "jpg-to-pdf") {
      const d = await checkPdf(actual[0].bytes, 2);
      expect(d.getPage(0).node.Resources()?.has(PDFName.of("XObject"))).toBe(true);
    } else if (tool.slug === "pdf-to-word") {
      expect(actual[0].name).toMatch(/\.docx$/);
      const xml = await (await JSZip.loadAsync(actual[0].bytes))
        .file("word/document.xml")!
        .async("string");
      expect(xml).toContain("ALPHA PAGE THREE");
      expect(xml).toContain("w:tbl");
      expect(xml).toContain("Heading1");
    } else if (tool.slug === "word-to-pdf") {
      await checkPdf(actual[0].bytes, 1, "Document conversion fixture 2026");
    } else if (tool.slug === "pdf-to-markdown") {
      expect(actual[0].name).toMatch(/\.md$/);
      const md = new TextDecoder().decode(actual[0].bytes);
      expect(md).toContain("# ALPHA PAGE ONE");
      expect(md).toContain("| Item | Amount |");
    } else if (tool.slug === "pdf-to-excel") {
      expect(actual[0].name).toMatch(/\.xlsx$/);
      const zip = await JSZip.loadAsync(actual[0].bytes);
      expect(zip.file("xl/workbook.xml")).not.toBeNull();
      expect(zip.file("xl/worksheets/sheet3.xml")).not.toBeNull();
      const sheet = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
      expect(sheet).toContain('<c r="B4"><v>1250</v></c>');
      expect(sheet).not.toContain("<f>");
    } else if (tool.slug === "excel-to-pdf") {
      await checkPdf(actual[0].bytes, 1, "Notebook");
      expect(await pdfToText(actual[0].bytes)).toContain("fixture 2026");
    } else if (tool.slug === "summarize") {
      expect(actual[0].name).toMatch(/-summary\.txt$/);
      const body = new TextDecoder().decode(actual[0].bytes);
      expect(body.length).toBeGreaterThan(20);
      const source = new Set(
        (await pdfToText(new Uint8Array(await fs.readFile(fixture("three-pages.pdf")))))
          .toLowerCase()
          .match(/[a-z0-9]{3,}/g) ?? [],
      );
      for (const word of body.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])
        expect(source.has(word)).toBe(true);
    } else if (tool.slug === "fill-pdf-form") {
      const d = await checkPdf(actual[0].bytes, 1);
      expect(d.getForm().getTextField("approval").getText()).toBe("BROWSER 2026");
    } else if (tool.slug === "pdf-to-text")
      expect(new TextDecoder().decode(actual[0].bytes)).toContain("ALPHA PAGE THREE");
    else if (tool.slug === "text-to-pdf") await checkPdf(actual[0].bytes, 1, "English 2026");
    else if (tool.slug === "page-numbers") await checkPdf(actual[0].bytes, 3, "3 / 3");
    else if (tool.slug === "watermark") await checkPdf(actual[0].bytes, 3, "CONFIDENTIAL");
    else if (tool.slug === "sign") {
      const d = await checkPdf(actual[0].bytes, 3, "ALPHA PAGE ONE");
      expect(d.getPage(2).node.Resources()?.has(PDFName.of("XObject"))).toBe(true);
    } else if (tool.slug === "protect") {
      const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "pdforge-browser-"));
      try {
        const file = path.join(tmp, "protected.pdf");
        await fs.writeFile(file, actual[0].bytes);
        const q = spawnSync(
          "qpdf",
          ["--password=browser-test-password", "--show-encryption", file],
          { encoding: "utf8" },
        );
        expect(q.status).toBe(0);
        expect(q.stdout).toContain("AESv3");
        const out = path.join(tmp, "unlocked.pdf"),
          u = spawnSync("qpdf", ["--password=browser-test-password", "--decrypt", file, out]);
        expect(u.status).toBe(0);
        await checkPdf(new Uint8Array(await fs.readFile(out)), 3, "ALPHA PAGE THREE");
      } finally {
        await fs.rm(tmp, { recursive: true, force: true });
      }
    } else if (tool.slug === "unlock")
      await checkPdf(actual[0].bytes, 1, "SENSITIVE ACCOUNT 314159");
    else if (tool.slug === "crop") {
      const d = await checkPdf(actual[0].bytes, 3);
      expect(d.getPage(0).getCropBox().width).toBe(572);
      expect(d.getPage(0).getMediaBox().width).toBe(612);
    } else if (tool.slug === "resize") {
      const d = await checkPdf(actual[0].bytes, 3, "ALPHA PAGE THREE");
      expect(d.getPage(0).getWidth()).toBe(595.28);
    } else if (tool.slug === "flatten") {
      const d = await checkPdf(actual[0].bytes, 1, "APPROVED 2026");
      expect(d.getForm().getFields()).toHaveLength(0);
    } else if (tool.slug === "redact" || tool.slug === "sanitize") {
      const d = await checkPdf(actual[0].bytes, 1);
      expect(d.catalog.has(PDFName.of("Names"))).toBe(false);
      expect(d.getTitle()).toBeUndefined();
      expect((await extractTextPages(actual[0].bytes))[0].lines).toHaveLength(0);
    } else if (tool.slug === "ocr") {
      expect(actual.length).toBe(2);
      expect(new TextDecoder().decode(actual[1].bytes)).toContain("INVOICE 2026");
      await checkPdf(actual[0].bytes, 1, "INVOICE 2026");
    } else if (tool.slug === "metadata") {
      const d = await checkPdf(actual[0].bytes, 1);
      expect(d.getTitle()).toBe("Public release");
      expect(d.getAuthor()).toBe("Release Team");
      expect(d.catalog.has(PDFName.of("Metadata"))).toBe(false);
    } else if (tool.slug === "compare") {
      expect(actual.length).toBe(4);
      const report = JSON.parse(new TextDecoder().decode(actual[3].bytes));
      expect(report.pages).toHaveLength(3);
      expect(report.pages[2].missingFromSecond).toBe(true);
      expect(report.pages.every((p: { changedPixels: number }) => p.changedPixels > 0)).toBe(true);
    } else if (tool.slug === "extract-images") {
      expect(actual.length).toBe(1);
      const image = await loadImage(actual[0].bytes);
      expect([image.width, image.height]).toEqual([640, 360]);
    } else if (tool.slug === "pdf-to-csv") {
      const csv = new TextDecoder().decode(actual[0].bytes);
      expect(csv).toContain("Notebook");
      expect(csv).toContain("'=SUM(A1:A2)");
    }
    // Exercise a real browser download (and ZIP generation for multi-output tools).
    if (actual.length > 1) {
      await page.getByRole("button", { name: "Prepare ZIP download" }).click();
      await expect(page.getByRole("link", { name: "Download ZIP" })).toBeVisible();
    }
    const target = page.locator(".result-actions a[download]").first(),
      [download] = await Promise.all([page.waitForEvent("download"), target.click()]);
    const saved = await download.path();
    expect(saved).not.toBeNull();
    const downloaded = await fs.readFile(saved!);
    if (actual.length > 1) {
      const zip = await JSZip.loadAsync(downloaded);
      expect(Object.values(zip.files).filter((f) => !f.dir)).toHaveLength(actual.length);
    } else expect(downloaded.byteLength).toBe(actual[0].bytes.length);
    expect(pageErrors).toEqual([]);
    expect(badAssets).toEqual([]);
    expect(external).toEqual([]);
    expect(writes).toEqual([]);
    await info.attach("network-assertions", {
      body: JSON.stringify(
        {
          tool: tool.slug,
          pageErrors,
          badAssets,
          external,
          writes,
          outputFiles: actual.map((f) => ({ name: f.name, bytes: f.bytes.length })),
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
  });
test("word-to-pdf visual mode keeps the image-based option working", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("tools/word-to-pdf/");
  await page.locator('input[type="file"]').setInputFiles([fixture("sample.docx")]);
  await expect(page.locator(".file-row")).toHaveCount(1);
  await page.getByLabel("Conversion mode").selectOption("visual");
  const run = page.getByRole("button", { name: "Convert to PDF", exact: true });
  await expect(run).toBeEnabled();
  await run.click();
  await expect(page.locator(".result-panel")).toBeVisible({ timeout: 70000 });
  const actual = await outputs(page);
  expect(actual).toHaveLength(1);
  const d = await checkPdf(actual[0].bytes, 1);
  expect(d.getPage(0).node.Resources()?.has(PDFName.of("XObject"))).toBe(true);
  expect((await extractTextPages(actual[0].bytes))[0].lines).toHaveLength(0);
  expect(actual[0].bytes.length).toBeGreaterThan(5000);
});
