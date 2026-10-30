import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import AxeBuilder from "@axe-core/playwright";

test("home licensing claim is accurate and publisher identity matches the canonical site", async ({
  page,
}) => {
  await page.goto("");
  await expect(page.locator(".hero-footnote")).toContainText("On-device processing");
  await expect(page.locator(".hero-footnote")).not.toContainText("Open source");
  const data = await page.locator('script[type="application/ld+json"]').allTextContents();
  const schemas = data.map((v) => JSON.parse(v));
  const org = schemas.find((v) => v["@type"] === "Organization"),
    site = schemas.find((v) => v["@type"] === "WebSite");
  expect(org.name).toBe("PDFORGE project");
  expect(site.publisher["@id"]).toBe(org["@id"]);
  expect(org["@id"]).toBe(org.url + "#publisher");
});
test("PDF to Word has specific metadata, visible limitations, examples and a real OCR workflow link", async ({
  page,
}) => {
  await page.goto("tools/pdf-to-word/");
  await expect(page).toHaveTitle(/PDF to Word Converter/);
  await expect(page.locator(".tool-discovery")).toContainText("charts and original fonts");
  await expect(page.locator(".tool-discovery")).toContainText("not reconstructed");
  await expect(
    page.getByRole("link", { name: "Download actual DOCX output", exact: true }),
  ).toBeVisible();
  await page
    .locator(".workflow-links")
    .getByRole("link", { name: "OCR scanned pages first", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("OCR PDF & images");
});
test("public synthetic before/after sample is downloadable and is real editable DOCX", async ({
  request,
}) => {
  const pdf = await request.get("examples/pdf-to-word/sample-input.pdf");
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  const output = await request.get("examples/pdf-to-word/sample-output.docx");
  expect(output.status()).toBe(200);
  const zip = await JSZip.loadAsync(await output.body());
  const xml = await zip.file("word/document.xml")!.async("string");
  expect(xml).toContain("SYNTHETIC SAMPLE");
  expect(xml).toContain("END OF PUBLIC SAMPLE");
  expect(xml).not.toContain("w:drawing");
});
test("scanned-PDF guide explains recognition review and links real tool steps", async ({
  page,
}) => {
  await page.goto("guides/scanned-pdf-to-word/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Scanned PDF to Word");
  await expect(page.locator(".article-content")).toContainText("not reconstruct");
  await page
    .locator(".article-content")
    .getByRole("link", { name: "PDF to Word", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("PDF to Word");
});
test("testing page labels dated evidence and avoids fake ratings/certifications", async ({
  page,
  request,
}) => {
  await page.goto("testing/");
  await expect(page.locator(".article-content")).toContainText("dated release");
  await expect(page.locator(".article-content")).toContainText("not every possible document");
  const record = await (await request.get("testing-baseline.json")).json();
  expect(record.testedRelease).toBe("1.6.0");
  expect(record.crossEngineBrowserCasesPassed).toBe(306);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("tool discovery content remains accessible and reflows at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("tools/pdf-to-word/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
