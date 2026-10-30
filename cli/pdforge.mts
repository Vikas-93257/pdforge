#!/usr/bin/env -S npx tsx
/* Local pdforge CLI: the same engine as the browser app, scriptable from a terminal.
 * Usage: npm run pdforge -- <tool|pipe|list> [inputs...] [--out DIR] [--set k=v] ...
 * Document content never leaves this machine; there is no server call. */
import fs from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_OPTIONS,
  executeTool,
  identifyFile,
  validateSelection,
  type LocalFile,
  type ToolOptions,
} from "../src/lib/operations";
import { TOOLS, getTool } from "../src/lib/tools";
import { PIPELINES, executePipeline, validateChain } from "../src/lib/pipelines";
import { nodeEnv, nodeNormalize } from "./nodeEnv.mts";

const HELP = `pdforge — local document tools (no uploads, no server)

  pdforge list
  pdforge <tool-slug> <input...> [--out DIR] [options]
  pdforge pipe <preset-id|slug,slug,...> <input...> [--out DIR] [options]

Options:
  --out DIR        output directory (default ./pdforge-out)
  --set k=v        tool option override, repeatable (values parse as JSON)
  --field k=v      fill-pdf-form field value, repeatable
  --password P     opening password for protect/unlock (min 8 chars for protect)
  --confirm        confirm image-rebuilding pipeline steps (sanitize/redact)
  --signature PNG  signature image for the sign tool
  --json           print a machine-readable result summary
  --quiet          only print errors and the output list
  -h, --help       this text

Limits: 100 MB per file, 300 MB total, 50 files. Single tools follow the same
single/multi-file rules as the app; pipe maps every step over all inputs.
OCR and visual Word mode need the browser engine and are not available here.`;

type Args = {
  command: string;
  inputs: string[];
  out: string;
  set: Record<string, string>;
  fields: Record<string, string>;
  password: string;
  confirm: boolean;
  signature: string;
  json: boolean;
  quiet: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    command: "",
    inputs: [],
    out: "pdforge-out",
    set: {},
    fields: {},
    password: "",
    confirm: false,
    signature: "",
    json: false,
    quiet: false,
  };
  const rest = [...argv];
  if (!rest.length || rest[0] === "-h" || rest[0] === "--help") {
    console.log(HELP);
    process.exit(0);
  }
  args.command = rest.shift()!;
  while (rest.length) {
    const token = rest.shift()!;
    if (token === "--out") args.out = rest.shift() ?? fail("--out needs a directory");
    else if (token === "--set") {
      const pair = rest.shift() ?? fail("--set needs k=v");
      const at = pair.indexOf("=");
      if (at < 1) fail(`--set needs k=v, got ${pair}`);
      args.set[pair.slice(0, at)] = pair.slice(at + 1);
    } else if (token === "--field") {
      const pair = rest.shift() ?? fail("--field needs k=v");
      const at = pair.indexOf("=");
      if (at < 1) fail(`--field needs k=v, got ${pair}`);
      args.fields[pair.slice(0, at)] = pair.slice(at + 1);
    } else if (token === "--password")
      args.password = rest.shift() ?? fail("--password needs a value");
    else if (token === "--confirm") args.confirm = true;
    else if (token === "--signature")
      args.signature = rest.shift() ?? fail("--signature needs a file");
    else if (token === "--json") args.json = true;
    else if (token === "--quiet") args.quiet = true;
    else if (token === "-h" || token === "--help") {
      console.log(HELP);
      process.exit(0);
    } else if (token.startsWith("-")) fail(`Unknown flag ${token}`);
    else args.inputs.push(token);
  }
  return args;
}

function fail(message: string): never {
  console.error(`pdforge: ${message}\nRun 'pdforge --help' for usage.`);
  process.exit(1);
}

const ENUMS: Record<string, readonly string[]> = {
  splitMode: ["ranges", "each"],
  compression: ["lossless", "recommended", "extreme"],
  pageSize: ["fit", "a4"],
  orientation: ["auto", "portrait", "landscape"],
  signatureCorner: ["bottom-right", "bottom-left", "top-right", "top-left"],
  paper: ["a4", "letter", "legal", "a3"],
  language: ["eng", "hin", "eng+hin"],
  wordMode: ["text", "visual"],
  summaryLength: ["short", "medium", "long"],
};

function parseValue(key: string, raw: string): unknown {
  const allowed = ENUMS[key];
  if (allowed && !allowed.includes(raw))
    fail(`--set ${key} must be one of ${allowed.join("|")}, got ${raw}`);
  const current = DEFAULT_OPTIONS[key as keyof ToolOptions];
  if (typeof current === "string") return raw;
  if (typeof current === "number") {
    const n = Number(raw);
    if (!Number.isFinite(n)) fail(`--set ${key} needs a number, got ${raw}`);
    return n;
  }
  if (typeof current === "boolean") {
    if (raw !== "true" && raw !== "false") fail(`--set ${key} needs true or false, got ${raw}`);
    return raw === "true";
  }
  try {
    return JSON.parse(raw);
  } catch {
    fail(`--set ${key} needs JSON, got ${raw}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "list") {
    console.log("TOOLS");
    for (const t of TOOLS)
      console.log(`  ${t.slug}  ${t.name}  [${t.accept}${t.multiple ? ", multi" : ""}]`);
    console.log("PIPELINES");
    for (const p of PIPELINES)
      console.log(`  ${p.id}  ${p.name}  (${p.steps.map((s) => s.slug).join(" -> ")})`);
    return;
  }
  const isPipe = args.command === "pipe";
  let steps: { slug: string; options?: Partial<ToolOptions> }[] = [{ slug: args.command }];
  if (isPipe) {
    const spec = args.inputs.shift() ?? fail("pipe needs a preset id or slug,slug,... chain");
    const preset = PIPELINES.find((p) => p.id === spec);
    if (preset) steps = preset.steps.map((s) => ({ slug: s.slug, options: s.options }));
    else {
      steps = spec
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((slug) => ({ slug }));
      if (!steps.length) fail("pipe needs a preset id or slug,slug,... chain");
    }
  }
  const slugs = steps.map((s) => s.slug);
  const tools = slugs.map((slug) => getTool(slug) ?? fail(`Unknown tool: ${slug}`));
  validateChain(slugs);
  if (slugs.includes("ocr"))
    fail(
      "OCR needs the browser engine (Web Worker + local models). Use the app's OCR tool instead.",
    );
  const options: ToolOptions = { ...DEFAULT_OPTIONS };
  for (const [key, raw] of Object.entries(args.set)) {
    if (!(key in options))
      fail(`Unknown option --set ${key}=... (see ToolOptions in src/lib/operations.ts)`);
    (options as Record<string, unknown>)[key] = parseValue(key, raw);
  }
  if (options.wordMode === "visual")
    fail("Visual Word mode renders in a browser page. Use the default text mode here.");
  for (const [key, value] of Object.entries(args.fields)) options.fieldValues[key] = value;
  if (args.password) {
    options.password = args.password;
    options.passwordConfirm = args.password;
  }
  if (args.confirm) options.confirm = true;
  if (args.signature)
    options.signature = new Uint8Array(
      await fs.readFile(args.signature).catch(() => fail(`Cannot read ${args.signature}`)),
    );
  if (
    !args.inputs.length &&
    !(slugs.length === 1 && slugs[0] === "text-to-pdf" && options.text.trim())
  )
    fail("Provide at least one input file.");
  if (!isPipe) validateSelection(tools[0], await describe(args.inputs));
  else {
    const infos = await describe(args.inputs);
    if (!infos.length) fail("Provide at least one input file.");
    if (infos.some((f) => f.size === 0)) fail("An empty file was selected.");
    if (infos.some((f) => f.size > 100 * 1024 * 1024)) fail("The per-file safety limit is 100 MB.");
    if (infos.reduce((s, f) => s + f.size, 0) > 300 * 1024 * 1024)
      fail("The total safety limit is 300 MB.");
    if (infos.length > 50) fail("Use at most 50 files at once.");
  }
  const first = tools[0];
  const files: LocalFile[] = [];
  for (const input of args.inputs) {
    const bytes = new Uint8Array(
      await fs.readFile(input).catch(() => fail(`Cannot read ${input}`)),
    );
    const kind = identifyFile(bytes, path.basename(input));
    const ok =
      kind === first.accept ||
      (first.accept === "pdf-image" && (kind === "pdf" || kind === "image"));
    if (!ok) fail(`"${input}" is not ${first.accept} input for ${first.name}.`);
    files.push({ id: input, name: path.basename(input), type: "", size: bytes.length, bytes });
  }
  const hooks = {
    signal: new AbortController().signal,
    onProgress: (percent: number | null, label: string) => {
      if (!args.quiet && !args.json) console.log(`  [${percent ?? "-"}%] ${label}`);
    },
    env: nodeEnv,
    normalize: nodeNormalize,
  };
  const result = isPipe
    ? await executePipeline(steps, files, options, hooks)
    : await executeTool(slugs[0], files, options, hooks);
  await fs.mkdir(args.out, { recursive: true });
  const written: string[] = [];
  for (const file of result.files) {
    const target = path.join(args.out, file.name);
    await fs.writeFile(target, file.bytes);
    written.push(target);
  }
  if (args.json) {
    console.log(
      JSON.stringify(
        {
          files: written,
          notes: result.notes,
          stages: (result as { stages?: unknown }).stages ?? null,
        },
        null,
        2,
      ),
    );
  } else if (!args.quiet) {
    for (const note of result.notes) console.log(`note: ${note}`);
    for (const file of written) console.log(`wrote: ${file}`);
  } else {
    for (const file of written) console.log(file);
  }
}

async function describe(inputs: string[]) {
  const infos: { name: string; size: number }[] = [];
  for (const input of inputs) {
    const stat = await fs.stat(input).catch(() => fail(`Cannot read ${input}`));
    infos.push({ name: path.basename(input), size: stat.size });
  }
  return infos;
}

main().catch((error: unknown) => {
  console.error(`pdforge: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
});
