import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const root = path.resolve("out"),
  info = JSON.parse(fs.readFileSync(path.join(root, "build-info.json"), "utf8")),
  site = info.siteUrl.replace(/\/$/, ""),
  base = info.basePath || "";
const files = [];
function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else files.push(p);
  }
}
walk(root);
const pages = files
    .filter((f) => f.endsWith("/index.html") && !f.includes("/_not-found/") && !f.includes("/404/"))
    .concat(path.join(root, "index.html"))
    .filter((f, i, a) => a.indexOf(f) === i),
  seenTitles = new Set(),
  seenDescriptions = new Set(),
  canonicalURLs = [],
  errors = [];
let links = 0,
  schemas = 0;
function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"));
  return m ? m[1].replaceAll("&amp;", "&") : "";
}
function localTarget(url) {
  const origin = new URL(site).origin;
  const parsed = new URL(url, site + "/");
  if (parsed.origin !== origin) return null;
  let pathname = decodeURIComponent(parsed.pathname);
  if (base) {
    if (!pathname.startsWith(base + "/")) throw new Error(`URL missing project base path: ${url}`);
    pathname = pathname.slice(base.length);
  }
  return path.join(root, pathname.endsWith("/") ? pathname + "index.html" : pathname);
}
for (const file of pages) {
  try {
    const html = fs.readFileSync(file, "utf8"),
      relative = path.relative(root, file).replaceAll(path.sep, "/"),
      url = site + "/" + (relative === "index.html" ? "" : relative.replace(/index\.html$/, ""));
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${relative}: expected one H1`);
    assert.match(html, /<html[^>]*lang="en"/);
    assert.match(html, /<meta[^>]*name="viewport"/);
    const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    assert.ok(title && title.length > 10, `${relative}: missing title`);
    assert.ok(!seenTitles.has(title), `${relative}: duplicate title`);
    seenTitles.add(title);
    const meta = (html.match(/<meta\b[^>]*>/g) || []).find(
      (t) => attr(t, "name") === "description",
    );
    const description = meta ? attr(meta, "content") : "";
    assert.ok(
      description.length >= 65 && description.length <= 250,
      `${relative}: description length ${description.length}`,
    );
    assert.ok(!seenDescriptions.has(description), `${relative}: duplicate description`);
    seenDescriptions.add(description);
    const canonical = (html.match(/<link\b[^>]*>/g) || []).find(
      (t) => attr(t, "rel") === "canonical",
    );
    assert.equal(canonical ? attr(canonical, "href") : "", url, `${relative}: incorrect canonical`);
    canonicalURLs.push(url);
    assert.ok(
      !/name="robots"[^>]*content="[^"]*noindex/.test(html),
      `${relative}: unexpected noindex`,
    );
    assert.match(html, /property="og:title"/);
    assert.match(html, /name="twitter:card"/);
    for (const match of html.matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
    )) {
      const json = JSON.parse(match[1]);
      assert.equal(json["@context"], "https://schema.org");
      schemas++;
    }
    for (const tag of html.match(/<(?:a|script|link|img)\b[^>]*>/g) || []) {
      const url = attr(tag, tag.startsWith("<a") || tag.startsWith("<link") ? "href" : "src");
      if (!url || /^(data:|blob:|mailto:|tel:|#)/.test(url)) continue;
      const target = localTarget(
        new URL(url, new URL(file.endsWith("index.html") ? canonicalURLs.at(-1) : site + "/")).href,
      );
      if (target) {
        links++;
        assert.ok(fs.existsSync(target), `${relative}: broken local reference ${url}`);
      }
    }
  } catch (error) {
    errors.push(error.message);
  }
}
if (errors.length) console.error("Page validation issues:", errors);
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8"),
  listed = Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/g), (m) => m[1]);
assert.equal(new Set(listed).size, 50, "Expected 50 unique sitemap entries");
assert.deepEqual(
  [...listed].sort(),
  [...canonicalURLs].sort(),
  "Sitemap and canonical pages must match",
);
assert.equal(pages.length, 50, "Expected 50 content pages");
assert.ok(fs.existsSync(path.join(root, ".nojekyll")));
assert.ok(fs.readFileSync(path.join(root, "robots.txt"), "utf8").includes(site + "/sitemap.xml"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "engines/manifest.json"), "utf8"));
for (const [file, item] of Object.entries(manifest)) {
  const bytes = fs.readFileSync(path.join(root, "engines", file));
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    item.sha256,
    `Engine hash mismatch: ${file}`,
  );
}
for (const file of [
  "engines/qpdf/qpdf.wasm",
  "engines/ocr/tesseract-core-lstm.wasm",
  "engines/ocr/tesseract-core-simd-lstm.wasm",
]) {
  const b = fs.readFileSync(path.join(root, file));
  assert.deepEqual([...b.subarray(0, 4)], [0, 97, 115, 109]);
}
for (const item of JSON.parse(fs.readFileSync(path.join(root, "source-assets.json"), "utf8"))) {
  const bytes = fs.readFileSync(path.join(root, item.file));
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    item.sha256,
    `Source asset hash mismatch: ${item.file}`,
  );
}
const proof = JSON.parse(fs.readFileSync("config/search-discovery.json", "utf8")).indexNow;
assert.equal(fs.readFileSync(path.join(root, proof.keyFile), "utf8").trim(), proof.key);
const exportInventory = JSON.parse(
  fs.readFileSync(path.join(root, "static-manifest.json"), "utf8"),
);
assert.equal(new Set(exportInventory.map((item) => item.file)).size, exportInventory.length);
assert.equal(
  exportInventory.length,
  files.length - 2,
  "Static inventory covers public payloads; ownership proof is checked separately",
);
for (const item of exportInventory) {
  const target = path.resolve(root, item.file);
  assert.ok(target.startsWith(root + path.sep), "Static inventory path must stay in the export");
  const bytes = fs.readFileSync(target);
  assert.equal(bytes.length, item.bytes, `Export size mismatch: ${item.file}`);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    item.sha256,
    `Export hash mismatch: ${item.file}`,
  );
}
assert.ok(
  !exportInventory.some(
    (item) => item.file.replaceAll("\\", "/").startsWith("_next/") && item.file.endsWith(".map"),
  ),
  "Production application source maps must not be published",
);
assert.match(
  fs.readFileSync(path.join(root, "licenses/third-party.txt"), "utf8"),
  /PDFORGE Restricted-Use Application License/,
);
const summary = {
  passed: errors.length === 0,
  exportFilesVerified: exportInventory.length,
  ownershipVerificationFilesChecked: 1,
  contentPages: pages.length,
  uniqueTitles: seenTitles.size,
  uniqueDescriptions: seenDescriptions.size,
  sitemapEntries: listed.length,
  localReferencesChecked: links,
  structuredDataBlocks: schemas,
  siteUrl: site,
  basePath: base,
  engineHashesVerified: Object.keys(manifest).length,
  errors,
};
fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync("reports/static-checks.json", JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (errors.length) process.exit(1);
