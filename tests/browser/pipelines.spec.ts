import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { loadPdf } from "../../src/lib/pdf/engine";
import { pdfToText } from "../../src/lib/pdf/convert";

const fixture = (name: string) => path.resolve("tests/fixtures", name);

async function outputs(page: Page) {
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

test("ready-made pipeline runs end to end in the browser", async ({ page }) => {
  await page.goto("pipelines/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Document pipelines");
  await page.getByLabel("Ready-made pipeline").selectOption("split-and-flatten");
  await page.locator('input[type="file"]').setInputFiles([fixture("three-pages.pdf")]);
  await page.getByRole("button", { name: "Run pipeline", exact: true }).click();
  await expect(page.locator(".result-panel")).toBeVisible({ timeout: 70000 });
  await expect(page.locator(".pipe-stages li")).toHaveCount(2);
  await expect(page.locator(".pipe-stages")).toContainText("Step 1 · Split PDF: 1 in → 3 out");
  const actual = await outputs(page);
  expect(actual.length).toBe(3);
  for (const f of actual) {
    const d = await loadPdf(f.bytes);
    expect(d.getPageCount()).toBe(1);
  }
  expect(await pdfToText(actual[0].bytes)).toContain("ALPHA PAGE ONE");
});

test("custom chains offer only compatible steps and gate destructive confirms", async ({
  page,
}) => {
  await page.goto("pipelines/");
  await page.getByRole("button", { name: "Build your own", exact: true }).click();
  await page.getByRole("button", { name: "Remove sanitize", exact: true }).click();
  const options = page.getByLabel("Add a compatible next step");
  await expect(options).toContainText("Sanitize PDF");
  await expect(options).toContainText("PDF to Word");
  await expect(options).not.toContainText("Word to PDF");
  await page.getByRole("button", { name: "Remove compress", exact: true }).click();
  await options.selectOption("sanitize");
  await expect(page.getByRole("checkbox", { name: /image-rebuilding steps remove/ })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles([fixture("one-page.pdf")]);
  await page.getByRole("button", { name: "Run pipeline", exact: true }).click();
  await expect(page.locator('.form-error[role="alert"]')).toContainText("Confirm");
  await page.getByRole("checkbox", { name: /image-rebuilding steps remove/ }).check();
  await page.getByRole("button", { name: "Run pipeline", exact: true }).click();
  await expect(page.locator(".result-panel")).toBeVisible({ timeout: 70000 });
});

test("protect pipelines require a password before running", async ({ page }) => {
  await page.goto("pipelines/");
  await page.getByRole("button", { name: "Build your own", exact: true }).click();
  await page.getByRole("button", { name: "Remove compress", exact: true }).click();
  await page.getByRole("button", { name: "Remove sanitize", exact: true }).click();
  await page.getByLabel("Add a compatible next step").selectOption("compress");
  await page.getByLabel("Add a compatible next step").selectOption("protect");
  await expect(page.getByLabel(/Password for the protect/)).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles([fixture("one-page.pdf")]);
  await page.getByRole("button", { name: "Run pipeline", exact: true }).click();
  await expect(page.locator('.form-error[role="alert"]')).toContainText("Enter the password");
  await page.getByLabel(/Password for the protect/).fill("browser-pipe-2026");
  await page.getByRole("button", { name: "Run pipeline", exact: true }).click();
  await expect(page.locator(".result-panel")).toBeVisible({ timeout: 70000 });
  const actual = await outputs(page);
  expect(actual.length).toBe(1);
  await expect(page.locator(".pipe-stages")).toContainText("Step 2 · Protect PDF");
});

test("cloud buttons explain the unconfigured state honestly", async ({ page }) => {
  await page.goto("pipelines/");
  await expect(page.locator(".drive-open")).toContainText("Cloud import is not configured");
  await page.goto("tools/merge/");
  await expect(page.locator(".drive-open")).toContainText("Cloud import is not configured");
  await expect(page.locator(".drive-open")).toContainText("How site owners enable it");
});

test("oauth callback and ecosystem guides load with real content", async ({ page }) => {
  await page.goto("oauth/callback/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Completing sign-in");
  await page.goto("guides/cloud-storage-setup/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Connect Google Drive");
  await page.goto("guides/command-line-pipelines/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Script the same engine");
  await page.goto("guides/");
  await expect(page.getByRole("link", { name: /Connect Google Drive/ })).toBeVisible();
});
