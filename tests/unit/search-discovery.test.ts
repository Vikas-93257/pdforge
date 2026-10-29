import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import JSZip from "jszip";
import { TOOLS } from "../../src/lib/tools";
import { GUIDES } from "../../src/lib/content";
import { DISCOVERY } from "../../src/lib/discovery";
import { indexNowPayload } from "../../src/lib/searchSubmission";
import { pdfToText } from "../../src/lib/pdf/convert";

test("every real tool has discovery content; no extra keyword-variant tools are invented", () => {
  assert.deepEqual(Object.keys(DISCOVERY).sort(), TOOLS.map((t) => t.slug).sort());
  for (const t of TOOLS) {
    const d = DISCOVERY[t.slug];
    for (const value of [d.usefulFor, d.watchFor]) assert.ok(value.length > 70, t.slug);
    // Concise output descriptions are preferable to padding content for a word-count target.
    assert.ok(d.produces.length > 40, t.slug);
    if (d.description) assert.ok(d.description.length >= 65 && d.description.length <= 250, t.slug);
  }
});
test("discovery workflows and guides point only to actual supported routes", () => {
  for (const d of Object.values(DISCOVERY)) {
    for (const next of d.next || [])
      assert.ok(
        TOOLS.some((t) => t.slug === next.slug),
        next.slug,
      );
    if (d.guide)
      assert.ok(
        GUIDES.some((g) => g.slug === d.guide!.slug),
        d.guide.slug,
      );
  }
});
test("PDF-to-Word discovery copy does not promise original images/charts/full fidelity", () => {
  const d = DISCOVERY["pdf-to-word"];
  assert.match(d.watchFor, /not reconstructed/);
  assert.match(d.watchFor, /OCR/);
  assert.match(d.description!, /complex layouts and images are simplified/);
  assert.match(d.produces, /simple text tables/);
  assert.doesNotMatch(d.produces, /exact layout|pixel-perfect|charts are rebuilt/);
});
test("published Word conversion copy explains text-first default and visual option", () => {
  const d = DISCOVERY["word-to-pdf"];
  assert.match(d.produces, /text-first/);
  assert.match(d.produces, /Image-based/);
  assert.match(d.watchFor, /complex layouts can differ/);
  assert.match(d.description!, /searchable/);
});
test("public sample is real selectable PDF and actual editable OOXML DOCX", async () => {
  const pdf = new Uint8Array(fs.readFileSync("public/examples/pdf-to-word/sample-input.pdf"));
  const text = await pdfToText(pdf);
  assert.match(text, /SYNTHETIC SAMPLE/);
  assert.match(text, /END OF PUBLIC SAMPLE/);
  const zip = await JSZip.loadAsync(
    fs.readFileSync("public/examples/pdf-to-word/sample-output.docx"),
  );
  const xml = await zip.file("word/document.xml")!.async("string");
  assert.match(xml, /This PDF contains selectable text/);
  assert.match(xml, /END OF PUBLIC SAMPLE/);
  assert.ok(!xml.includes("w:drawing"));
});
test("private application does not advertise an open-source hero badge or fabricated review rating", () => {
  assert.ok(!fs.readFileSync("src/app/page.tsx", "utf8").includes("<span>·</span> Open source"));
  assert.ok(!fs.readFileSync("src/app/tools/[slug]/page.tsx", "utf8").includes("aggregateRating"));
});
test("IndexNow ownership proof is real and not exposed through the public inventory", () => {
  const c = JSON.parse(fs.readFileSync("config/search-discovery.json", "utf8")).indexNow;
  assert.equal(fs.readFileSync("public/" + c.keyFile, "utf8").trim(), c.key);
  assert.match(fs.readFileSync("scripts/postbuild.mjs", "utf8"), /proofFile/);
});
const key = "synthetic-test-key-12345",
  file = "synthetic-proof.txt",
  base = "https://example.test/pdforge";
test("IndexNow payload is strictly scoped to the owned project path", () => {
  const p = indexNowPayload(base, key, file, [
    base + "/",
    base + "/tools/merge/",
    base + "/tools/merge/",
  ]);
  assert.equal(p.urlList.length, 2);
  assert.equal(p.keyLocation, base + "/" + file);
  assert.equal(p.host, "example.test");
});
for (const value of [
  "https://outside.test/pdforge/",
  "https://example.test/other/",
  "https://example.test/pdforge-other/",
  "https://example.test/pdforge/#private",
])
  test(`IndexNow rejects out-of-scope or fragment URL ${value}`, () =>
    assert.throws(() => indexNowPayload(base, key, file, [value])));
test("IndexNow refuses local/non-HTTPS, invalid keys/files and empty submissions", () => {
  assert.throws(() => indexNowPayload("http://example.test/pdforge", key, file, [base + "/"]));
  assert.throws(() => indexNowPayload(base, "bad", "../key.txt", [base + "/"]));
  assert.throws(() => indexNowPayload(base, key, file, []));
});
