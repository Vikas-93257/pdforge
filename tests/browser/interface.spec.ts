import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { TOOLS } from "../../src/lib/tools";
import { pdfToText, extractTextPages } from "../../src/lib/pdf/convert";
const fixture = (name: string) => path.resolve("tests/fixtures", name);
async function choose(page: Page, slug: string, name = "three-pages.pdf") {
  await page.goto(`tools/${slug}/`);
  await page.locator('input[type="file"]').setInputFiles(fixture(name));
  await expect(page.locator(".file-row")).toHaveCount(1);
}
async function resultBytes(page: Page) {
  const values = await page
    .locator(".result-actions a[download], .individual-files a[download]")
    .evaluateAll(async (nodes) =>
      Promise.all(
        nodes.map(async (node) =>
          Array.from(
            new Uint8Array(await (await fetch((node as HTMLAnchorElement).href)).arrayBuffer()),
          ),
        ),
      ),
    );
  return values.map((v) => new Uint8Array(v));
}
test("home search, filters and actual client-side navigation", async ({ page }) => {
  await page.goto("");
  await expect(page.locator(".tool-grid .tool-card")).toHaveCount(38);
  await page.getByRole("button", { name: "Secure", exact: true }).click();
  await expect(page.locator(".tool-grid .tool-card")).toHaveCount(4);
  await page.getByRole("button", { name: /All tools 38/ }).click();
  await page.getByRole("searchbox", { name: "Search PDF tools" }).fill("compress");
  await expect(page.locator(".tool-grid .tool-card")).toHaveCount(1);
  await page.locator(".tool-grid .tool-card").click();
  await expect(page).toHaveURL(/\/tools\/compress\/$/);
  await expect(page.getByRole("button", { name: "Choose file", exact: true })).toBeVisible();
});
test("search has a keyboard-accessible no-results recovery", async ({ page }) => {
  await page.goto("");
  // Wait for client hydration before typing: filling pre-hydration sets the DOM
  // value without reaching React state, which flakes on slower engines.
  await expect(page.locator(".tool-grid .tool-card")).toHaveCount(38);
  await page.getByRole("searchbox").fill("does-not-exist-731");
  await expect(page.getByRole("heading", { name: /No tools found/ })).toBeVisible();
  await page.getByRole("button", { name: "Show all tools" }).click();
  await expect(page.locator(".tool-grid .tool-card")).toHaveCount(38);
});
for (const width of [320, 390, 768, 1440])
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["", "tools/merge/", "tools/sign/", "tools/redact/", "privacy/"]) {
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  });
test("mobile merge really produces a result", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("tools/merge/");
  await page
    .locator('input[type="file"]')
    .setInputFiles([fixture("three-pages.pdf"), fixture("two-pages.pdf")]);
  await page.getByRole("button", { name: "Merge PDFs", exact: true }).click();
  await expect(page.locator(".result-panel")).toBeVisible();
  expect(await pdfToText((await resultBytes(page))[0])).toContain("BETA PAGE TWO");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "reports/merge-mobile.png", fullPage: true });
});
for (const [route, name] of [
  ["", "home"],
  ["tools/merge/", "merge"],
  ["tools/sign/", "sign"],
  ["tools/redact/", "redact"],
  ["privacy/", "privacy"],
  ["guides/", "guides"],
])
  test(`axe WCAG A/AA: ${name}`, async ({ page }, info) => {
    await page.goto(route);
    // Let hydration and fonts settle before scanning: mid-render DOM flakes
    // automated checks on slower engines without indicating a real violation.
    await page.waitForLoadState("networkidle");
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    await info.attach("axe", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });
    expect(
      result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  });
test("selected-file and completed-result states pass automated accessibility checks", async ({
  page,
}) => {
  await choose(page, "page-numbers");
  await page.getByRole("button", { name: "Add page numbers", exact: true }).click();
  await expect(page.locator(".result-panel")).toBeVisible();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(result.violations.map((v) => v.id)).toEqual([]);
});
for (const [name, buffer, pattern] of [
  ["invalid.pdf", Buffer.from("not a PDF"), /not a supported pdf/],
  ["empty.pdf", Buffer.alloc(0), /empty file/],
  ["evil.svg", Buffer.from('<svg onload="alert(1)"/>'), /not a supported pdf/],
] as const)
  test(`reject invalid input: ${name}`, async ({ page }) => {
    await page.goto("tools/merge/");
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name, mimeType: "application/pdf", buffer });
    await expect(page.locator('.form-error[role="alert"]')).toContainText(pattern);
    await expect(page.locator(".result-panel")).toHaveCount(0);
  });
const negative: [string, string, string, (page: Page) => Promise<void>, RegExp][] = [
  [
    "range out of bounds",
    "extract-pages",
    "three-pages.pdf",
    async (p) => {
      await p.getByLabel(/^Pages to keep/).fill("99");
    },
    /outside this document/,
  ],
  [
    "delete all pages",
    "remove-pages",
    "three-pages.pdf",
    async (p) => {
      await p.getByLabel(/^Pages to remove/).fill("1-3");
    },
    /Keep at least one/,
  ],
  [
    "invalid crop",
    "crop",
    "one-page.pdf",
    async (p) => {
      await p.getByLabel("Top margin (points)").fill("800");
    },
    /entire visible page/,
  ],
  [
    "short password",
    "protect",
    "one-page.pdf",
    async (p) => {
      await p.getByLabel(/^Opening password/).fill("short");
      await p.getByLabel("Confirm opening password").fill("short");
    },
    /at least 8/,
  ],
  [
    "password mismatch",
    "protect",
    "one-page.pdf",
    async (p) => {
      await p.getByLabel(/^Opening password/).fill("long-password");
      await p.getByLabel("Confirm opening password").fill("different-password");
    },
    /do not match/,
  ],
  [
    "wrong known password",
    "unlock",
    "protected.pdf",
    async (p) => {
      await p.getByLabel(/^Known document password/).fill("wrong-password");
    },
    /Could not unlock/,
  ],
  ["missing signature", "sign", "one-page.pdf", async () => {}, /Type or draw a signature/],
  [
    "unconfirmed destructive action",
    "sanitize",
    "one-page.pdf",
    async () => {},
    /Confirm you understand/,
  ],
  [
    "empty redaction",
    "redact",
    "one-page.pdf",
    async (p) => {
      await p.getByRole("checkbox", { name: /I understand/ }).check();
    },
    /at least one region/,
  ],
  ["no selectable text", "pdf-to-text", "scanned.pdf", async () => {}, /Use OCR/],
  ["unrecoverable input", "repair", "bad.pdf", async () => {}, /too damaged/],
  [
    "password-protected merge input",
    "rotate",
    "protected.pdf",
    async () => {},
    /password-protected/,
  ],
  ["needs two inputs", "compare", "one-page.pdf", async () => {}, /exactly two PDFs/],
];
for (const [name, slug, input, configure, pattern] of negative)
  test(`honest failure: ${name}`, async ({ page }) => {
    await choose(page, slug, input);
    await configure(page);
    await page
      .getByRole("button", { name: TOOLS.find((t) => t.slug === slug)!.cta, exact: true })
      .click();
    await expect(page.locator('.form-error[role="alert"]')).toContainText(pattern, {
      timeout: 50000,
    });
    await expect(page.locator(".result-panel")).toHaveCount(0);
  });
test("cancellation leaves no partial or fake completed result", async ({ page }) => {
  // Hold the page-initiated worker script (not the worker-initiated WASM) so a tiny
  // PDF cannot finish before WebKit's actionability checks reach the cancel button.
  // Worker-initiated requests are not routable on WebKit; the cancellation path
  // under test is identical either way.
  let release: () => void = () => {};
  const engineDownload = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.context().route("**/engines/qpdf/runner.js", async (route) => {
    await engineDownload;
    await route.continue().catch(() => {});
  });
  try {
    await choose(page, "compress");
    await page.getByRole("button", { name: "Compress PDF", exact: true }).click();
    await page.getByRole("button", { name: "Cancel processing", exact: true }).click();
    await expect(page.locator('.form-error[role="alert"]')).toContainText("cancelled");
    await expect(page.locator(".result-panel")).toHaveCount(0);
    // The hold has served its purpose once cancellation is confirmed: release it
    // so a terminated worker whose script never loaded can settle out of the
    // worker list (Firefox keeps reporting it while the fetch is pending).
    release();
    await expect.poll(() => page.workers().length).toBe(0);
  } finally {
    release();
  }
});
test("OCR cancellation resolves instead of hanging the workspace", async ({ page }) => {
  test.setTimeout(120000);
  await choose(page, "ocr", "scanned.pdf");
  await page.getByRole("button", { name: "Recognize text", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cancel processing" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel processing" }).click();
  await expect(page.locator('.form-error[role="alert"]')).toContainText("cancelled", {
    timeout: 20000,
  });
  await expect(page.getByRole("button", { name: "Recognize text", exact: true })).toBeEnabled();
  await expect(page.locator(".result-panel")).toHaveCount(0);
});
test("Hindi OCR uses a local model and writes real searchable text", async ({ page }, info) => {
  test.setTimeout(180000);
  const unexpected: string[] = [],
    origin = new URL(info.project.use.baseURL as string).origin;
  page.on("request", (r) => {
    if (!r.url().startsWith("blob:") && new URL(r.url()).origin !== origin)
      unexpected.push(r.url());
  });
  await choose(page, "ocr", "hindi-scan.png");
  await page.getByLabel("Recognition language").selectOption("hin");
  await page.getByRole("button", { name: "Recognize text", exact: true }).click();
  await expect(page.locator(".result-panel")).toBeVisible({ timeout: 160000 });
  const files = await resultBytes(page);
  expect(new TextDecoder().decode(files[1])).toMatch(/भारत/);
  expect(await pdfToText(files[0])).toMatch(/[\u0900-\u097f]/);
  expect(unexpected).toEqual([]);
  await fs.writeFile("reports/hindi-ocr.txt", new TextDecoder().decode(files[1]));
});
test("JPEG EXIF orientation is respected during image normalization", async ({ page }) => {
  await choose(page, "jpg-to-pdf", "rotated-photo.jpg");
  await page.getByRole("combobox", { name: "Page size", exact: true }).selectOption("fit");
  await page.getByLabel("Margin (PDF points)").fill("0");
  await page.getByRole("button", { name: "Create PDF", exact: true }).click();
  await expect(page.locator(".result-panel")).toBeVisible();
  const { loadPdf } = await import("../../src/lib/pdf/engine"),
    d = await loadPdf((await resultBytes(page))[0]);
  expect(d.getPage(0).getWidth()).toBe(360);
  expect(d.getPage(0).getHeight()).toBe(640);
});
test("identical PDFs produce zero visual differences", async ({ page }) => {
  await page.goto("tools/compare/");
  await page
    .locator('input[type="file"]')
    .setInputFiles([fixture("one-page.pdf"), fixture("one-page.pdf")]);
  await page.getByRole("button", { name: "Compare PDFs", exact: true }).click();
  await expect(page.locator(".result-panel")).toBeVisible();
  const files = await resultBytes(page),
    r = JSON.parse(new TextDecoder().decode(files[1]));
  expect(r.pages[0].changedPixels).toBe(0);
});
test("clear workspace revokes downloads and does not store documents", async ({
  page,
  context,
}) => {
  await choose(page, "pdf-to-text");
  await page.getByRole("button", { name: "Extract text", exact: true }).click();
  await expect(page.locator(".result-panel")).toBeVisible();
  const url = await page.locator(".result-actions a[download]").getAttribute("href");
  await page.getByRole("button", { name: "Clear workspace", exact: true }).click();
  await expect(page.locator(".file-row")).toHaveCount(0);
  await expect(page.locator(".result-panel")).toHaveCount(0);
  expect(
    await page.evaluate(async (u) => {
      try {
        await fetch(u!);
        return false;
      } catch {
        return true;
      }
    }, url),
  ).toBe(true);
  expect(
    await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })),
  ).toEqual({ local: 0, session: 0 });
  expect(await context.cookies()).toEqual([]);
});
test("DOCX macros are rejected before rendering", async ({ page }) => {
  const zip = await JSZip.loadAsync(await fs.readFile(fixture("sample.docx")));
  zip.file("word/vbaProject.bin", new Uint8Array([1]));
  await page.goto("tools/word-to-pdf/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "macro.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: await zip.generateAsync({ type: "nodebuffer" }),
  });
  await page.getByRole("button", { name: "Convert to PDF", exact: true }).click();
  await expect(page.locator('.form-error[role="alert"]')).toContainText("Macro-enabled");
});
test("keyboard skip link reaches main content", async ({ page }) => {
  await page.goto("");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => location.hash)).toBe("#main");
});
test("unknown URL returns a real HTTP 404 and helpful page", async ({ page }) => {
  const response = await page.goto("not-an-actual-tool-731/");
  expect(response!.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("wrong turn");
});
test("redaction preview with file remains accessible", async ({ page }) => {
  await choose(page, "redact", "one-page.pdf");
  await expect(page.getByRole("img", { name: /Original page 1 before redaction/ })).toBeVisible();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(result.violations.map((v) => v.id)).toEqual([]);
});
test("searchable OCR PDF is not just an image rename", async ({ page }) => {
  test.setTimeout(180000);
  await choose(page, "ocr", "scan.png");
  await page.getByRole("button", { name: "Recognize text", exact: true }).click();
  await expect(page.locator(".result-panel")).toBeVisible({ timeout: 160000 });
  const files = await resultBytes(page);
  expect((await extractTextPages(files[0]))[0].lines.join(" ")).toContain("TOTAL 1250");
});
test("clearing a signature workspace also erases typed text and canvas state", async ({ page }) => {
  await choose(page, "sign", "one-page.pdf");
  await page.getByLabel("Your signature text").fill("PRIVATE SIGNATURE NAME");
  await page.getByRole("button", { name: "Clear workspace", exact: true }).click();
  await expect(page.getByLabel("Your signature text")).toHaveValue("");
  expect(
    await page.locator(".signature-canvas").evaluate((canvas) => {
      const c = canvas as HTMLCanvasElement,
        data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
      return data.every((value, i) => i % 4 !== 3 || value === 0);
    }),
  ).toBe(true);
});
test("client navigation does not carry a selected document into another tool or back", async ({
  page,
}) => {
  await choose(page, "merge", "one-page.pdf");
  await page.getByRole("link", { name: "Compress PDF", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Compress PDF");
  await expect(page.locator(".file-row")).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Merge PDF");
  await expect(page.locator(".file-row")).toHaveCount(0);
});
test("missing OCR engine fails promptly and disposes every local worker", async ({ page }) => {
  // Block the page-initiated worker script: worker-initiated core/language downloads
  // are not routable on WebKit, while the missing-engine failure path is the same.
  await page.route("**/engines/ocr/worker.min.js", (route) =>
    route.fulfill({ status: 404, body: "Missing test asset", contentType: "text/plain" }),
  );
  await choose(page, "ocr", "scanned.pdf");
  await page.getByRole("button", { name: "Recognize text", exact: true }).click();
  await expect(page.locator('.form-error[role="alert"]')).toContainText(
    /OCR engine failed|could not load/,
    { timeout: 15000 },
  );
  await expect.poll(() => page.workers().length).toBe(0);
  await expect(page.locator(".result-panel")).toHaveCount(0);
});
test("OCR cancellation after worker creation disposes it during initialization", async ({
  page,
}) => {
  await choose(page, "ocr", "scanned.pdf");
  const workerCreated = page.waitForEvent("worker", {
    predicate: (worker) => worker.url().includes("/engines/ocr/worker.min.js"),
  });
  await page.getByRole("button", { name: "Recognize text", exact: true }).click();
  await workerCreated;
  await page.getByRole("button", { name: "Cancel processing", exact: true }).click();
  await expect(page.locator('.form-error[role="alert"]')).toContainText("cancelled");
  await expect.poll(() => page.workers().length).toBe(0);
});

test("public site discloses restricted application licensing without linking private source", async ({
  page,
}) => {
  await page.goto("about/");
  await expect(page.locator("#software-license")).toContainText("private repository");
  await expect(page.getByRole("link", { name: "Source code", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Software licenses", exact: true }).click();
  await expect(page.getByRole("heading", { name: "The application", exact: true })).toBeVisible();
  await expect(page.locator(".article-content")).toContainText(
    "restricted-use application license",
  );
  await expect(page.locator(".article-content")).toContainText(
    "their permissions are not restricted",
  );
});
test("PWA manifest, icons and service worker are served", async ({ request }) => {
  const manifest = await request.get("manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  const data = await manifest.json();
  expect(data.name).toContain("PDFORGE");
  expect(data.icons.some((i: { sizes: string }) => i.sizes === "512x512")).toBe(true);
  expect(data.icons.some((i: { purpose?: string }) => (i.purpose || "").includes("maskable"))).toBe(
    true,
  );
  for (const icon of ["icon-192.png", "icon-512.png", "icon-maskable-512.png"]) {
    const res = await request.get(icon);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  }
  const sw = await request.get("sw.js");
  expect(sw.status()).toBe(200);
  expect((await sw.text()).includes("addEventListener")).toBe(true);
});
test("document insight panel reports measured facts with next-step links", async ({ page }) => {
  await choose(page, "compress");
  const panel = page.locator(".insight-panel");
  await expect(panel).toBeVisible({ timeout: 30000 });
  await expect(panel).toContainText("3 pages");
  await expect(panel).toContainText("Language guess:");
  await expect(panel).toContainText("Top topics:");
  const href = await panel.getByRole("link", { name: "Edit PDF metadata" }).getAttribute("href");
  expect(href).toContain("tools/metadata/");
});
test("duplicate files are flagged by content hash on multi-file tools", async ({ page }) => {
  await page.goto("tools/merge/");
  await page
    .locator('input[type="file"]')
    .setInputFiles([fixture("three-pages.pdf"), fixture("three-pages.pdf")]);
  await expect(page.locator(".file-row")).toHaveCount(2);
  await expect(page.locator(".duplicate-notice")).toContainText("Files 1 and 2 appear identical");
});
test("completed runs offer a verifiable audit receipt", async ({ page }) => {
  await choose(page, "compress");
  await page.getByRole("button", { name: "Compress PDF", exact: true }).click();
  const link = page.locator(".result-receipt a[download]");
  await expect(link).toBeVisible({ timeout: 70000 });
  const raw = await link.evaluate(async (node) => {
    const a = node as HTMLAnchorElement;
    return await (await fetch(a.href)).text();
  });
  const receipt = JSON.parse(raw);
  expect(receipt.app).toBe("pdforge");
  expect(receipt.version).toBe("1.6.0");
  expect(receipt.job.slug).toBe("compress");
  expect(receipt.inputs[0].name).toBe("three-pages.pdf");
  expect(receipt.inputs[0].sha256).toMatch(/^[0-9a-f]{64}$/);
  expect(receipt.outputs[0].sha256).toMatch(/^[0-9a-f]{64}$/);
  expect(receipt.settings.compression).toBe("lossless");
});
test("team presets save, apply and delete within the browser", async ({ page }) => {
  await choose(page, "split");
  await page.getByLabel(/^Page ranges/).fill("1-2");
  await page.getByLabel("Save current settings as").fill("E2E Ranges");
  await page.getByRole("button", { name: "Save preset", exact: true }).click();
  await expect(page.locator(".preset-bar")).toContainText("Saved “E2E Ranges”");
  await page.getByLabel(/^Page ranges/).fill("3");
  await page.getByLabel("Saved presets for this tool").selectOption({ label: "E2E Ranges" });
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByLabel(/^Page ranges/)).toHaveValue("1-2");
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator(".preset-bar")).toContainText("Preset deleted");
});
test("bates prefix and padding stamp the output document", async ({ page }) => {
  await choose(page, "page-numbers");
  await page.getByLabel(/Numbering prefix/).fill("EXH-");
  await page.getByLabel(/Zero-pad/).fill("4");
  await page.getByRole("button", { name: "Add page numbers", exact: true }).click();
  await expect(page.locator(".result-panel")).toBeVisible({ timeout: 70000 });
  const [bytes] = await resultBytes(page);
  const text = await pdfToText(bytes);
  expect(text).toContain("EXH-0001");
  expect(text).toContain("EXH-0003");
});
