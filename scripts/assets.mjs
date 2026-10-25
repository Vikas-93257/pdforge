import {
  mkdirSync,
  copyFileSync,
  cpSync,
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
const root = process.cwd();
const tess = JSON.parse(readFileSync("node_modules/tesseract.js/package.json", "utf8"));
const core = JSON.parse(readFileSync("node_modules/tesseract.js-core/package.json", "utf8"));
if (
  core.version.split(".")[0] !==
  tess.dependencies["tesseract.js-core"].replace(/^[^0-9]*/, "").split(".")[0]
)
  throw new Error("Tesseract worker and core major versions must match.");

function copy(source, target) {
  const s = path.join(root, "node_modules", source),
    t = path.join(root, "public/engines", target);
  if (!existsSync(s)) throw new Error(`Missing engine asset: ${s}`);
  mkdirSync(path.dirname(t), { recursive: true });
  copyFileSync(s, t);
}
copy("@neslinesli93/qpdf-wasm/dist/qpdf.js", "qpdf/qpdf.js");
copy("@neslinesli93/qpdf-wasm/dist/qpdf.wasm", "qpdf/qpdf.wasm");
copy("pdfjs-dist/build/pdf.worker.min.mjs", "pdfjs/pdf.worker.min.mjs");
for (const d of ["cmaps", "standard_fonts", "wasm", "iccs"])
  if (existsSync(`node_modules/pdfjs-dist/${d}`))
    cpSync(`node_modules/pdfjs-dist/${d}`, `public/engines/pdfjs/${d}`, { recursive: true });
copy("tesseract.js/dist/worker.min.js", "ocr/worker.min.js");
for (const name of [
  "tesseract-core-lstm.wasm.js",
  "tesseract-core-lstm.wasm",
  "tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-simd-lstm.wasm",
  "tesseract-core-relaxedsimd-lstm.wasm.js",
  "tesseract-core-relaxedsimd-lstm.wasm",
])
  copy(`tesseract.js-core/${name}`, `ocr/${name}`);
const files = [];
function walk(dir, prefix = "") {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix + item.name;
    if (item.isDirectory()) walk(path.join(dir, item.name), relative + "/");
    else if (relative !== "manifest.json") files.push(relative);
  }
}
walk("public/engines");
const manifest = Object.fromEntries(
  files.map((f) => {
    const b = readFileSync(`public/engines/${f}`);
    return [f, { bytes: b.length, sha256: createHash("sha256").update(b).digest("hex") }];
  }),
);
writeFileSync("public/engines/manifest.json", JSON.stringify(manifest, null, 2));
console.log("Local engine assets verified: qpdf, PDF.js, Tesseract.");
