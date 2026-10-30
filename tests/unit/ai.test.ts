import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { identifyLanguage, detectScript } from "../../src/lib/ai/language";
import {
  inspectDocument,
  renderInsightReport,
  summarizeInsight,
  type DocumentInsight,
} from "../../src/lib/ai/inspect";
import { suggestNextTools } from "../../src/lib/ai/suggest";

const fixture = (name: string) =>
  new Uint8Array(fs.readFileSync(path.resolve("tests/fixtures", name)));

test("stopword voting identifies latin-script languages", () => {
  const cases: [string, string][] = [
    ["en", "The quick brown fox jumps over the lazy dog and the cat is on the mat for the day"],
    ["es", "El gato está en la casa y los perros son de la calle porque hace calor"],
    ["fr", "Le chat est sur la table et les chiens sont dans le jardin parce qu il fait beau"],
    ["de", "Der Hund ist in dem Garten und die Katze war bei der Tür weil es regnet"],
    ["it", "Il gatto è sul tavolo e i cani sono in giardino perché fa caldo con la luna"],
    ["pt", "O gato está na casa e os cães são do bairro porque está calor"],
    ["nl", "De hond is in de tuin en de kat was bij de deur omdat het regnet"],
  ];
  for (const [code, text] of cases) {
    const guess = identifyLanguage(text);
    assert.equal(guess.code, code, text);
    assert.equal(guess.confidence, "high", text);
  }
});
test("script detection identifies non-latin languages", () => {
  assert.equal(
    identifyLanguage("Кот сидит на столе и собака была в саду потому что идет дождь").code,
    "ru",
  );
  assert.equal(
    identifyLanguage("القط يجلس على الطاولة والكلب كان في الحديقة لأن الجو حار").code,
    "ar",
  );
  assert.equal(identifyLanguage("बिल्ली मेज पर बैठी है और कुत्ता बगीचे में था").code, "hi");
  assert.equal(identifyLanguage("猫がテーブルの上にいますそして犬もいます").code, "ja");
  assert.equal(identifyLanguage("고양이가 테이블 위에 있고 개도 있습니다").code, "ko");
  assert.equal(identifyLanguage("猫坐在桌子上面前的狗在花园里面").code, "zh");
  assert.equal(detectScript("komt dat zien").script, "latin");
});
test("short or marker-free text honestly reports uncertain", () => {
  assert.equal(identifyLanguage("Hello world").code, "unknown");
  assert.equal(identifyLanguage("ALPHA PAGE ONE Notebook PDFORGE local test").code, "unknown");
  assert.equal(identifyLanguage("").confidence, "low");
});
test("inspect reports digital-document facts for three-pages", async () => {
  const i = await inspectDocument(fixture("three-pages.pdf"));
  assert.equal(i.pages, 3);
  assert.equal(i.textPages, 3);
  assert.equal(i.scannedPages, 0);
  assert.equal(i.fullyScanned, false);
  assert.equal(i.emails, 0);
  assert.equal(i.phones, 0);
  assert.equal(i.language.code, "unknown");
  assert.ok(i.words > 30);
  assert.ok(i.keywords.includes("page"));
  assert.ok(i.phrases.includes("item amount"));
  assert.equal(i.suggestedName, "alpha-page-one");
  assert.equal(i.truncated, false);
});
test("inspect reads stored metadata and form fields", async () => {
  const meta = await inspectDocument(fixture("metadata.pdf"));
  assert.equal(meta.title, "PRIVATE DOCUMENT TITLE");
  assert.equal(meta.author, "PRIVATE AUTHOR 9182");
  assert.equal(meta.suggestedName, "private-document-title");
  const form = await inspectDocument(fixture("form.pdf"));
  assert.equal(form.formFields, 1);
  const scanned = await inspectDocument(fixture("scanned.pdf"));
  assert.equal(scanned.fullyScanned, true);
  assert.deepEqual(scanned.keywords, []);
});
test("suggestions follow honest deterministic rules", () => {
  const base: DocumentInsight = {
    pages: 3,
    chars: 100,
    words: 20,
    textPages: 3,
    scannedPages: 0,
    fullyScanned: false,
    title: "T",
    author: "",
    formFields: 0,
    emails: 0,
    phones: 0,
    language: { code: "en", label: "English", confidence: "high" },
    keywords: [],
    phrases: [],
    suggestedName: "t",
    truncated: false,
  };
  assert.deepEqual(suggestNextTools(base), []);
  assert.equal(suggestNextTools({ ...base, scannedPages: 2 })[0].slug, "ocr");
  assert.equal(suggestNextTools({ ...base, formFields: 4 })[0].slug, "fill-pdf-form");
  assert.equal(suggestNextTools({ ...base, emails: 1, phones: 2 })[0].slug, "redact");
  assert.equal(suggestNextTools({ ...base, title: "" })[0].slug, "metadata");
  assert.equal(suggestNextTools({ ...base, title: "" }, { currentSlug: "metadata" }).length, 0);
  assert.equal(suggestNextTools({ ...base, title: "" }, { sizeBytes: 9 * 1024 * 1024 }).length, 2);
  assert.equal(suggestNextTools({ ...base, pages: 50 })[0].slug, "split");
});
test("insight report and summary render the measured facts", async () => {
  const i = await inspectDocument(fixture("three-pages.pdf"));
  const report = renderInsightReport(i, "three-pages.pdf");
  assert.ok(report.includes("# Document insight — three-pages.pdf"));
  assert.ok(report.includes("| Pages | 3 |"));
  assert.ok(report.includes("alpha-page-one.pdf"));
  assert.ok(report.includes("does not understand or verify"));
  assert.ok(report.includes("## What to do next"));
  const summary = summarizeInsight(i);
  assert.ok(summary.includes("3 pages"));
  assert.ok(summary.includes("Top topics:"));
});
