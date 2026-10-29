import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { PAGES } from "../../src/lib/content";

const read = (name: string) => fs.readFileSync(path.resolve(name), "utf8");

test("private-source application has a restricted license without taking user-document rights", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.private, true);
  assert.equal(pkg.license, "SEE LICENSE IN LICENSE");
  const license = read("LICENSE");
  assert.match(license, /Restricted-Use Application License/);
  assert.match(license, /free\s+of charge/i);
  assert.match(license, /does not claim ownership of your input documents/);
  assert.match(license, /does not retroactively revoke rights/);
});

test("public application copy describes private source and does not grant an MIT application license", () => {
  const about = PAGES.find((p) => p.slug === "about")!;
  const licensing = PAGES.find((p) => p.slug === "licenses")!;
  const aboutText = JSON.stringify(about);
  assert.match(aboutText, /private repository/);
  assert.doesNotMatch(aboutText, /application source is distributed under the MIT/);
  assert.match(JSON.stringify(licensing), /restricted-use application license/);
  assert.doesNotMatch(read("src/app/layout.tsx"), /SOURCE_URL|Source code </);
});

test("production application source maps are explicitly disabled", () => {
  assert.match(read("next.config.ts"), /productionBrowserSourceMaps:\s*false/);
});

test("deployment requires private source and does not publish a repository source URL", () => {
  const workflow = read(".github/workflows/deploy.yml");
  assert.match(workflow, /Require a private source repository/);
  assert.match(workflow, /REPOSITORY_IS_PRIVATE:\s*\$\{\{ github\.event\.repository\.private \}\}/);
  assert.match(workflow, /test "\$REPOSITORY_IS_PRIVATE" = "true"/);
  assert.doesNotMatch(workflow, /NEXT_PUBLIC_SOURCE_URL/);
});

test("upstream model/font/qpdf license provenance remains byte-for-byte intact", () => {
  const entries = JSON.parse(read("public/source-assets.json")) as {
    file: string;
    sha256: string;
  }[];
  assert.equal(entries.length, 9);
  for (const item of entries) {
    const bytes = fs.readFileSync(path.resolve("public", item.file));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256, item.file);
  }
  assert.match(read("public/licenses/upstream/qpdf-LICENSE.txt"), /Apache License/);
  assert.match(read("public/fonts/OFL-NotoSans.txt"), /SIL OPEN FONT LICENSE/);
});

test("runtime type dispatch is minification-safe (no constructor.name branching)", () => {
  assert.doesNotMatch(read("src/lib/pdf/engine.ts"), /constructor\.name/);
  assert.match(read("src/lib/pdf/engine.ts"), /instanceof PDFTextField/);
});
