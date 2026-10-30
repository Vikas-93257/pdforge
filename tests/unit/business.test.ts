import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { version as PKG_VERSION } from "../../package.json";
import { DEFAULT_OPTIONS } from "../../src/lib/operations";
import { addPageNumbers } from "../../src/lib/pdf/engine";
import { pdfToText } from "../../src/lib/pdf/convert";
import { sha256Hex, sanitizeSettings, buildReceipt, receiptName } from "../../src/lib/receipts";
import {
  savePreset,
  loadPresets,
  deletePreset,
  clearPresets,
  sanitizePresetOptions,
  exportPack,
  importPack,
} from "../../src/lib/presets";

const fixture = (name: string) =>
  new Uint8Array(fs.readFileSync(path.resolve("tests/fixtures", name)));

test("sha256 matches the known test vector", async () => {
  assert.equal(
    await sha256Hex(new TextEncoder().encode("abc")),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});
test("receipt settings withhold passwords and signature bytes", () => {
  const clean = sanitizeSettings({
    ...DEFAULT_OPTIONS,
    password: "secret-123",
    signature: new Uint8Array(10),
    ranges: "1-2",
  });
  assert.equal(clean.password, "[withheld]");
  assert.equal(clean.signature, "[10 bytes withheld]");
  assert.equal(clean.ranges, "1-2");
  assert.equal(JSON.parse(JSON.stringify(clean)).ranges, "1-2");
});
test("receipts attest inputs, outputs, settings and version", async () => {
  const input = fixture("one-page.pdf");
  const built = await buildReceipt({
    job: { kind: "tool", slug: "compress", name: "Compress PDF" },
    settings: DEFAULT_OPTIONS,
    inputs: [{ name: "one-page.pdf", bytes: input }],
    outputs: [{ name: "one-page-compress.pdf", bytes: input }],
  });
  assert.equal(built.receipt.app, "pdforge");
  assert.equal(built.receipt.version, PKG_VERSION);
  assert.ok(!Number.isNaN(Date.parse(built.receipt.at)));
  assert.equal(built.receipt.inputs[0].sha256, await sha256Hex(input));
  assert.equal(built.receipt.inputs[0].size, input.length);
  assert.equal(built.receipt.job.kind, "tool");
  assert.ok(built.receipt.note.includes("locally"));
  assert.equal(built.name, "one-page-compress-receipt.json");
  assert.equal(receiptName("report.Q3.pdf", "merge"), "report.Q3-merge-receipt.json");
});
test("presets save, replace by name and delete", () => {
  clearPresets();
  const first = savePreset("compress", "Tiny", { ...DEFAULT_OPTIONS, compression: "extreme" });
  assert.equal(loadPresets("compress").length, 1);
  savePreset("compress", "Tiny", { ...DEFAULT_OPTIONS, compression: "recommended" });
  assert.equal(loadPresets("compress").length, 1);
  assert.equal(loadPresets("compress")[0].options.compression, "recommended");
  assert.ok(first.id);
  deletePreset(first.id);
  assert.equal(loadPresets().length, 1);
  deletePreset(loadPresets()[0].id);
  assert.equal(loadPresets().length, 0);
  assert.throws(() => savePreset("nope", "X", DEFAULT_OPTIONS), /Unknown tool/);
  assert.throws(() => savePreset("compress", "   ", DEFAULT_OPTIONS), /Name the preset/);
});
test("preset options drop signatures and unknown keys", () => {
  const clean = sanitizePresetOptions({
    ranges: "1-2",
    signature: new Uint8Array(4),
    nope: true,
  } as unknown as Partial<typeof DEFAULT_OPTIONS>);
  assert.equal(clean.ranges, "1-2");
  assert.ok(!("signature" in clean));
  assert.ok(!("nope" in clean));
});
test("preset packs export and import with honest per-entry reports", () => {
  clearPresets();
  savePreset("split", "Chapters", { ...DEFAULT_OPTIONS, ranges: "1-3,4" });
  const pack = exportPack();
  assert.ok(pack.includes("pdforge-preset-pack"));
  clearPresets();
  const good = importPack(pack);
  assert.equal(good.added.length, 1);
  assert.equal(good.skipped.length, 0);
  assert.equal(loadPresets("split")[0].options.ranges, "1-3,4");
  const mixed = importPack(
    JSON.stringify({
      app: "pdforge-preset-pack",
      version: 1,
      presets: [
        { tool: "compress", name: "Ok", options: { compression: "extreme" } },
        { tool: "nope", name: "Bad tool", options: {} },
        { tool: "split", name: "Bad key", options: { nope: 1 } },
        { tool: "split", name: "Bad sig", options: { signature: "x" } },
        { tool: "split", name: "Bad type", options: { ranges: 42 } },
        { tool: "split", name: "x".repeat(41), options: {} },
      ],
    }),
  );
  assert.equal(mixed.added.length, 1);
  assert.equal(mixed.skipped.length, 5);
  assert.ok(mixed.skipped.some((s) => s.reason.includes("unknown tool")));
  assert.ok(mixed.skipped.some((s) => s.reason.includes("unknown option")));
  assert.ok(mixed.skipped.some((s) => s.reason.includes("never stored")));
  assert.ok(mixed.skipped.some((s) => s.reason.includes("must be string")));
  assert.throws(() => importPack("not json"), /not valid JSON/);
  assert.throws(() => importPack("{}"), /not a PDFORGE preset pack/);
});
test("bates prefix and zero-padding stamp every page", async () => {
  const stamped = await addPageNumbers(fixture("three-pages.pdf"), {
    position: "bottom-center",
    start: 1,
    fontSize: 11,
    withTotal: false,
    prefix: "EXH-",
    padDigits: 4,
  });
  const text = await pdfToText(stamped);
  assert.ok(text.includes("EXH-0001"));
  assert.ok(text.includes("EXH-0002"));
  assert.ok(text.includes("EXH-0003"));
  const totaled = await addPageNumbers(fixture("three-pages.pdf"), {
    position: "bottom-center",
    start: 7,
    fontSize: 11,
    withTotal: true,
    prefix: "ABC-",
    padDigits: 2,
  });
  assert.ok((await pdfToText(totaled)).includes("ABC-07 / ABC-09"));
});
test("bates options validate honestly", async () => {
  const base = {
    position: "bottom-center" as const,
    start: 1,
    fontSize: 11,
    withTotal: false,
  };
  await assert.rejects(
    addPageNumbers(fixture("one-page.pdf"), { ...base, prefix: "x".repeat(25) }),
    /24 printable/,
  );
  await assert.rejects(
    addPageNumbers(fixture("one-page.pdf"), { ...base, prefix: "A\nB" }),
    /24 printable/,
  );
  await assert.rejects(addPageNumbers(fixture("one-page.pdf"), { ...base, padDigits: 7 }), /0–6/);
});
