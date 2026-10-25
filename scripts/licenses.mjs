import fs from "node:fs";
import path from "node:path";
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const items = [];
const texts = [];
for (const [location, p] of Object.entries(lock.packages || {})) {
  if (!location || !fs.existsSync(path.join(location, "package.json"))) continue;
  const info = JSON.parse(fs.readFileSync(path.join(location, "package.json"), "utf8"));
  const name = info.name || location.split("node_modules/").at(-1);
  const item = {
    name,
    version: p.version,
    license: info.license || p.license || "See upstream terms",
    repository: typeof info.repository === "string" ? info.repository : info.repository?.url || "",
    development: !!p.dev,
  };
  items.push(item);
  const candidates = fs
    .readdirSync(location)
    .filter(
      (f) =>
        /^(licen[sc]e|copying|notice)(\.|$)/i.test(f) &&
        fs.statSync(path.join(location, f)).isFile(),
    );
  for (const file of candidates)
    texts.push(
      `\n${"=".repeat(72)}\n${name}@${p.version} — ${file}\n${"=".repeat(72)}\n${fs.readFileSync(path.join(location, file), "utf8")}`,
    );
}
items.sort((a, b) => a.name.localeCompare(b.name));
fs.mkdirSync("public/licenses", { recursive: true });
fs.writeFileSync("public/licenses/inventory.json", JSON.stringify(items, null, 2));
let body =
  "PDFORGE — application and third-party notices\nPackage declarations are informational; actual license notices govern.\nApplication license: PDFORGE Restricted-Use Application License. Fonts: SIL Open Font License 1.1. OCR models: Apache-2.0.\nThe qpdf WebAssembly wrapper declares ISC; qpdf itself uses Apache-2.0.\n\nAPPLICATION LICENSE\n\n" +
  fs.readFileSync("LICENSE", "utf8") +
  "\n\nDEPENDENCY INVENTORY\n\n" +
  items
    .map(
      (p) =>
        `${p.name}@${p.version} | ${p.license}${p.development ? " | build/test dependency" : ""}`,
    )
    .join("\n") +
  "\n\nBUNDLED PACKAGE NOTICES\n" +
  texts.join("\n");
for (const folder of ["public/licenses/upstream", "public/fonts", "public/engines/ocr/lang"])
  for (const file of fs.readdirSync(folder))
    if (/LICENSE|NOTICE|OFL/i.test(file))
      body += `\n\n${folder}/${file}\n${fs.readFileSync(path.join(folder, file), "utf8")}\n`;
fs.writeFileSync("public/licenses/third-party.txt", body);
console.log(
  `License inventory: ${items.length} installed packages; bundled upstream notices included.`,
);
