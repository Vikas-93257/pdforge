import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DEFAULT_OPTIONS, executeTool } from "../../src/lib/operations";
import { formatRedactionLog } from "../../src/lib/pdf/render";
import { nodeEnv } from "../../cli/nodeEnv";
import { planBatch, type WatchedEntry } from "../../cli/watch";

const file = async (name: string) =>
  new Uint8Array(await fs.readFile(path.resolve("tests/fixtures", name)));
const hooks = {
  signal: new AbortController().signal,
  onProgress: () => {},
  env: nodeEnv,
};
const local = (name: string, bytes: Uint8Array) => ({
  id: "test",
  name,
  type: "application/pdf",
  size: bytes.length,
  bytes,
});

test("redaction log records regions as human percentages without timestamps", () => {
  const log = formatRedactionLog(
    [
      { page: 1, x: 0, y: 0, width: 1, height: 0.25 },
      { page: 3, x: 0.1, y: 0.2, width: 0.5, height: 0.3 },
    ],
    3,
    "contract.pdf",
    2,
  );
  assert.ok(log.includes("# Redaction log — contract.pdf"));
  assert.ok(
    log.includes("Region 1 — page 1 of 3: left 0.0%, top 0.0%, width 100.0%, height 25.0%"),
  );
  assert.ok(
    log.includes("Region 2 — page 3 of 3: left 10.0%, top 20.0%, width 50.0%, height 30.0%"),
  );
  assert.ok(log.includes("scale 2"));
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(log));
});
test("redact emits the pdf plus a deterministic audit log", async () => {
  const bytes = await file("one-page.pdf");
  const out = await executeTool(
    "redact",
    [local("one-page.pdf", bytes)],
    {
      ...DEFAULT_OPTIONS,
      confirm: true,
      boxes: [{ page: 1, x: 0, y: 0, width: 1, height: 0.25 }],
    },
    hooks,
  );
  assert.equal(out.files.length, 2);
  assert.ok(new TextDecoder("latin1").decode(out.files[0].bytes.subarray(0, 5)).includes("%PDF-"));
  assert.equal(out.files[1].name, "one-page-redaction-log.md");
  const log = new TextDecoder().decode(out.files[1].bytes);
  assert.ok(log.includes("Region 1 — page 1 of 1"));
  assert.ok(out.notes.some((n) => n.includes("audit log")));
  const again = await executeTool(
    "redact",
    [local("one-page.pdf", bytes)],
    {
      ...DEFAULT_OPTIONS,
      confirm: true,
      boxes: [{ page: 1, x: 0, y: 0, width: 1, height: 0.25 }],
    },
    hooks,
  );
  assert.equal(
    new TextDecoder().decode(again.files[1].bytes),
    log,
    "same input and settings produce the same log",
  );
});
test("sanitize stays a single-file output", async () => {
  const bytes = await file("one-page.pdf");
  const out = await executeTool(
    "sanitize",
    [local("one-page.pdf", bytes)],
    { ...DEFAULT_OPTIONS, confirm: true },
    hooks,
  );
  assert.equal(out.files.length, 1);
});
test("watch plans only stable, unprocessed entries", () => {
  const a = { name: "a.pdf", size: 10, mtimeMs: 100 },
    b = { name: "b.pdf", size: 20, mtimeMs: 100 };
  const first = planBatch(new Map(), [a, b], new Set());
  assert.deepEqual(first.ready, []);
  const prev = first.snapshot;
  const second = planBatch(prev, [a, b], new Set());
  assert.deepEqual(second.ready, [a, b]);
  const changed: WatchedEntry = { name: "a.pdf", size: 11, mtimeMs: 200 };
  const third = planBatch(second.snapshot, [changed, b], new Set());
  assert.deepEqual(third.ready, [b]);
  const fourth = planBatch(
    third.snapshot,
    [changed, b],
    new Set([`${b.name}:${b.size}:${b.mtimeMs}`]),
  );
  assert.deepEqual(fourth.ready, [changed]);
});
test("watch processes a stable file, writes receipts and refuses honestly", async () => {
  const run = (args: string[]) =>
    spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "cli/pdforge.ts", ...args], {
      encoding: "utf8",
      timeout: 90000,
    });
  const inbox = await fs.mkdtemp(path.join(os.tmpdir(), "pdforge-watch-in-")),
    out = await fs.mkdtemp(path.join(os.tmpdir(), "pdforge-watch-out-"));
  try {
    await fs.writeFile(path.join(inbox, "a-note.txt"), "not a pdf");
    await fs.writeFile(path.join(inbox, "z-one.pdf"), await file("one-page.pdf"));
    const watched = run([
      "watch",
      "rotate",
      inbox,
      "--out",
      out,
      "--set",
      "angle=90",
      "--poll",
      "200",
      "--max-files",
      "1",
      "--receipt",
      "--quiet",
    ]);
    assert.equal(watched.status, 0, watched.stderr);
    assert.match(watched.stdout + watched.stderr, /skipped a-note\.txt/);
    const produced = await fs.readdir(out);
    assert.ok(produced.some((n) => n.endsWith("-rotated.pdf")));
    const receiptName = produced.find((n) => n.endsWith("-receipt.json"));
    assert.ok(receiptName);
    const receipt = JSON.parse(await fs.readFile(path.join(out, receiptName!), "utf8"));
    assert.equal(receipt.job.slug, "rotate");
    const compare = run(["watch", "compare", inbox, "--out", out, "--max-files", "1"]);
    assert.notEqual(compare.status, 0);
    assert.match(compare.stdout + compare.stderr, /one file at a time/);
    const same = run(["watch", "rotate", inbox, "--out", inbox, "--max-files", "1"]);
    assert.notEqual(same.status, 0);
    assert.match(same.stdout + same.stderr, /separate input and output/);
  } finally {
    await fs.rm(inbox, { recursive: true, force: true });
    await fs.rm(out, { recursive: true, force: true });
  }
});
