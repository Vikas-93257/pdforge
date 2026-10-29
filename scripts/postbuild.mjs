import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, ""),
  siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
fs.writeFileSync("out/.nojekyll", "");
fs.writeFileSync(
  "out/build-info.json",
  JSON.stringify(
    {
      name: "PDFORGE",
      version: JSON.parse(fs.readFileSync("package.json", "utf8")).version,
      siteUrl,
      basePath,
      builtAt: new Date().toISOString(),
      node: process.version,
    },
    null,
    2,
  ),
);
const overview = `# PDFORGE\n\n> Free-to-use PDF tools, processed locally in the browser. Application source is private; third-party engines retain their own licenses.\n\n- 35 tools: merge, split, organize, extract/remove pages, rotate, compress, repair, PDF to JPG/PNG, images to PDF, structured DOCX export, text-first/visual DOCX conversions, text, Markdown, PDF/Excel exchange, page numbers, watermark, visual signatures, AES-256 encryption, known-password unlock, crop, resize, form fill/flatten, permanent image-based redaction, English/Hindi OCR, metadata, image-only sanitization, visual comparison, image extraction, positional CSV, extractive summaries.\n- No document upload API, accounts, paywall or analytics in the application. The web host still sees ordinary page/asset requests.\n- 100 MB/file, 300 MB/session, 50 files; 150 rendered pages or 40 OCR pages/run, plus memory/pixel budgets.\n- Visual signatures are not certificate signatures. Crop is not redaction. Office conversions simplify layout. OCR needs review.\n- No guaranteed search ranking, recommendation, compliance certification or zero-defect claim.\n\n## Documentation\n\n- [All tools](${siteUrl}/#tools)\n- [Privacy](${siteUrl}/privacy/)\n- [Security and limitations](${siteUrl}/security/)\n- [Practical guides](${siteUrl}/guides/)\n- [About the software](${siteUrl}/about/)\n- [Licenses](${siteUrl}/licenses/)\n\nThis file is factual documentation, not a search-ranking mechanism.\n`;
fs.writeFileSync("out/llms.txt", overview);
fs.writeFileSync(
  "out/manifest.webmanifest",
  JSON.stringify({
    name: "PDFORGE — Free PDF tools on your device",
    short_name: "PDFORGE",
    description:
      "35 free PDF tools that run on your device. No uploads, accounts or subscriptions.",
    id: `${basePath}/`,
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: "standalone",
    background_color: "#f7f8f3",
    theme_color: "#1c6746",
    icons: [
      { src: `${basePath}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${basePath}/icon-512.png`, sizes: "512x512", type: "image/png" },
      {
        src: `${basePath}/icon-maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: `${basePath}/apple-touch-icon.png`, sizes: "180x180", type: "image/png" },
      { src: `${basePath}/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  }),
);
const proofFile = JSON.parse(fs.readFileSync("config/search-discovery.json", "utf8")).indexNow
  .keyFile;
const all = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, f.name);
    if (f.isDirectory()) walk(file);
    else all.push(file);
  }
}
walk("out");
const inventory = all
  .filter(
    (p) => p !== path.join("out", "static-manifest.json") && p !== path.join("out", proofFile),
  )
  .map((p) => {
    const b = fs.readFileSync(p);
    return {
      file: p.slice(4),
      bytes: b.length,
      sha256: createHash("sha256").update(b).digest("hex"),
    };
  });
fs.writeFileSync("out/static-manifest.json", JSON.stringify(inventory, null, 2));
console.log(
  `Static export: ${inventory.length} files, ${(inventory.reduce((s, f) => s + f.bytes, 0) / 1024 / 1024).toFixed(1)} MB; base path ${basePath || "/"}.`,
);
