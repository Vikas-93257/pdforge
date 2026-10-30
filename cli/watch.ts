/* Hot-folder automation: run one single-file tool over every stable new file in a
 * folder. Files are processed only after their size and mtime survive one full
 * poll unchanged, so half-written uploads are never picked up. Stateless: the
 * processed set lives in memory, so restarting reprocesses the folder. */
import fs from "node:fs/promises";
import path from "node:path";
import {
  executeTool,
  identifyFile,
  validateSelection,
  type ToolOptions,
} from "../src/lib/operations";
import { getTool } from "../src/lib/tools";
import { nodeEnv, nodeNormalize } from "./nodeEnv";
export type WatchedEntry = { name: string; size: number; mtimeMs: number };
export type WatchPlan = { ready: WatchedEntry[]; snapshot: Map<string, WatchedEntry> };
const keyOf = (e: WatchedEntry) => `${e.name}:${e.size}:${e.mtimeMs}`;
const same = (a?: WatchedEntry, b?: WatchedEntry) =>
  !!a && !!b && a.size === b.size && a.mtimeMs === b.mtimeMs;
// Pure core: an entry is ready when it is unchanged since the previous scan
// and has not been processed under this exact identity before.
export function planBatch(
  prev: Map<string, WatchedEntry>,
  current: WatchedEntry[],
  processed: Set<string>,
): WatchPlan {
  const snapshot = new Map<string, WatchedEntry>(),
    ready: WatchedEntry[] = [];
  for (const entry of current) {
    snapshot.set(entry.name, entry);
    const key = keyOf(entry);
    if (processed.has(key)) continue;
    if (same(prev.get(entry.name), entry)) ready.push(entry);
  }
  return { ready, snapshot };
}
function fail(message: string): never {
  console.error(`pdforge: ${message}`);
  process.exit(1);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export async function runWatch(opts: {
  toolSlug: string;
  dir: string;
  out: string;
  options: ToolOptions;
  receipt: boolean;
  quiet: boolean;
  pollMs: number;
  maxFiles: number;
}): Promise<{ processed: number; skipped: number }> {
  const tool = getTool(opts.toolSlug) ?? fail(`Unknown tool: ${opts.toolSlug}`);
  if (tool.slug === "merge" || tool.slug === "compare")
    fail(`${tool.name} needs multiple files per run; watch processes one file at a time.`);
  if (tool.slug === "ocr")
    fail("OCR needs the browser engine (Web Worker + local models). Use the app instead.");
  if (opts.options.wordMode === "visual")
    fail("Visual Word mode renders in a browser page. Use the default text mode here.");
  const dir = path.resolve(opts.dir),
    out = path.resolve(opts.out);
  if (dir === out) fail("Use separate input and output folders.");
  const stat = await fs.stat(dir).catch(() => fail(`Cannot read watch folder ${opts.dir}`));
  if (!stat.isDirectory()) fail(`${opts.dir} is not a folder.`);
  await fs.mkdir(out, { recursive: true });
  let prev = new Map<string, WatchedEntry>();
  const processed = new Set<string>();
  let done = 0,
    skipped = 0,
    stop = false;
  process.on("SIGINT", () => {
    stop = true;
  });
  if (!opts.quiet)
    console.log(`watching ${dir} with ${tool.name} every ${opts.pollMs}ms (Ctrl+C stops)`);
  while (!stop) {
    const names = await fs.readdir(dir).catch(() => fail(`Lost access to ${dir}`));
    const current: WatchedEntry[] = [];
    for (const name of names.sort()) {
      if (name.startsWith(".")) continue;
      const full = path.join(dir, name),
        s = await fs.stat(full).catch(() => null);
      if (!s || !s.isFile()) continue;
      current.push({ name, size: s.size, mtimeMs: s.mtimeMs });
    }
    const plan = planBatch(prev, current, processed);
    prev = plan.snapshot;
    for (const entry of plan.ready) {
      if (stop) break;
      const full = path.join(dir, entry.name);
      try {
        const bytes = new Uint8Array(await fs.readFile(full)),
          kind = identifyFile(bytes, entry.name),
          ok =
            kind === tool.accept ||
            (tool.accept === "pdf-image" && (kind === "pdf" || kind === "image"));
        if (!ok) throw new Error(`is not ${tool.accept} input for ${tool.name}`);
        validateSelection(tool, [{ name: entry.name, size: bytes.length }]);
        const result = await executeTool(
          tool.slug,
          [{ id: full, name: entry.name, type: "", size: bytes.length, bytes }],
          opts.options,
          {
            signal: new AbortController().signal,
            onProgress: () => {},
            env: nodeEnv,
            normalize: nodeNormalize,
          },
        );
        const written: string[] = [];
        for (const file of result.files) {
          const target = path.join(out, file.name);
          await fs.writeFile(target, file.bytes);
          written.push(target);
        }
        if (opts.receipt) {
          const { buildReceipt } = await import("../src/lib/receipts");
          const built = await buildReceipt({
            job: { kind: "tool", slug: tool.slug, name: tool.name },
            settings: opts.options,
            inputs: [{ name: entry.name, bytes }],
            outputs: result.files.map((f) => ({ name: f.name, bytes: f.bytes })),
          });
          const target = path.join(out, built.name);
          await fs.writeFile(target, built.bytes);
          written.push(target);
        }
        processed.add(keyOf(entry));
        done++;
        if (!opts.quiet) for (const w of written) console.log(`wrote: ${w}`);
        else for (const w of written) console.log(w);
      } catch (e) {
        skipped++;
        processed.add(keyOf(entry));
        console.error(`skipped ${entry.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
      if (opts.maxFiles > 0 && done >= opts.maxFiles) stop = true;
    }
    if (!stop) await sleep(opts.pollMs);
  }
  if (!opts.quiet) console.log(`watch stopped: ${done} processed, ${skipped} skipped`);
  return { processed: done, skipped };
}
