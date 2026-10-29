import type JSZip from "jszip";
import { PdfError } from "./engine";

export const XLSX_LIMITS = {
  maxCells: 250000,
  maxCols: 100,
  maxSheets: 200,
  maxTextChars: 5000000,
} as const;

export function inspectOfficeZip(
  bytes: Uint8Array,
  opts: { required: string; container: "DOCX" | "XLSX"; document: string; archive: string },
) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0)
    throw new PdfError(`This is not a valid ${opts.container} ZIP container.`, "INVALID");
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true),
    total = 0;
  if (count > 2000 || count === 65535)
    throw new PdfError(
      `This ${opts.archive} has too many parts or uses unsupported ZIP64 packaging.`,
      "LIMIT",
    );
  let hasDocument = false;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50)
      throw new PdfError(`This ${opts.archive} archive has an invalid directory.`, "INVALID");
    const unpacked = view.getUint32(offset + 24, true),
      nameLength = view.getUint16(offset + 28, true),
      extra = view.getUint16(offset + 30, true),
      comment = view.getUint16(offset + 32, true);
    if (offset + 46 + nameLength + extra + comment > bytes.length)
      throw new PdfError(`The ${opts.archive} archive is truncated.`, "INVALID");
    total += unpacked;
    if (unpacked > 80 * 1024 * 1024 || total > 150 * 1024 * 1024 || unpacked === 0xffffffff)
      throw new PdfError(`This ${opts.archive} expands beyond the safe 150 MB limit.`, "LIMIT");
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (name === opts.required) hasDocument = true;
    if (/vbaProject\.bin$/i.test(name))
      throw new PdfError(
        `Macro-enabled Office files are not supported. Save as a plain .${opts.container.toLowerCase()} first.`,
        "UNSUPPORTED",
      );
    offset += 46 + nameLength + extra + comment;
  }
  if (!hasDocument) throw new PdfError(opts.document, "INVALID");
  return { parts: count, expandedBytes: total };
}

export function inspectXlsxZip(bytes: Uint8Array) {
  return inspectOfficeZip(bytes, {
    required: "xl/workbook.xml",
    container: "XLSX",
    document: "The archive does not contain an Excel workbook.",
    archive: "spreadsheet",
  });
}

export function xmlEscape(value: string) {
  return value
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function xmlDecode(value: string) {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
      const cp = parseInt(hex, 16);
      return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : "";
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const cp = parseInt(dec, 10);
      return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : "";
    })
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function colName(index: number) {
  let n = index + 1,
    out = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    out = String.fromCharCode(65 + m) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function colIndex(letters: string) {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function sheetName(raw: string, used: Set<string>) {
  let name =
    raw
      .replace(/[\\/*?:[\]]/g, "_")
      .trim()
      .slice(0, 31) || "Sheet";
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  for (let i = 2; i < 1000; i++) {
    const candidate = `${name.slice(0, 31 - String(i).length - 2)} (${i})`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  const fallback = `Sheet ${used.size + 1}`;
  used.add(fallback);
  return fallback;
}

const NUMERIC = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

export async function buildXlsx(
  sheets: { name: string; grid: string[][] }[],
): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  if (!sheets.length) throw new PdfError("There is no sheet data to write.", "NO_TEXT");
  const used = new Set<string>();
  const names = sheets.map((s) => sheetName(s.name, used));
  const shared: string[] = [],
    sharedIndex = new Map<string, number>();
  const share = (value: string) => {
    const hit = sharedIndex.get(value);
    if (hit !== undefined) return hit;
    const id = shared.length;
    shared.push(value);
    sharedIndex.set(value, id);
    return id;
  };
  let cells = 0,
    truncated = false;
  const grids: string[][][] = sheets.map((s) =>
    s.grid.map((row) => row.slice(0, XLSX_LIMITS.maxCols)),
  );
  for (const grid of grids)
    for (const row of grid)
      for (const value of row) {
        if (value && !NUMERIC.test(value.trim())) share(value);
        if (++cells > XLSX_LIMITS.maxCells) truncated = true;
      }
  const budget = XLSX_LIMITS.maxCells;
  let remaining = budget;
  const kept: string[][][] = grids.map((grid) => {
    const out: string[][] = [];
    for (const row of grid) {
      remaining -= row.length;
      if (remaining < 0) {
        truncated = true;
        break;
      }
      out.push(row);
    }
    return out;
  });
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxml-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>${names
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join("")}</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names
      .map((name, i) => `<sheet name="${xmlEscape(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join("")}</sheets></workbook>`,
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join(
        "",
      )}<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`,
  );
  zip.file(
    "xl/sharedStrings.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.length}" uniqueCount="${shared.length}">${shared
      .map((s) => `<si><t xml:space="preserve">${xmlEscape(s)}</t></si>`)
      .join("")}</sst>`,
  );
  kept.forEach((grid, i) => {
    const width = Math.max(0, ...grid.map((r) => r.length));
    const rows = grid
      .map((row, r) => {
        const cellsXml = row
          .map((value, c) => {
            if (!value) return "";
            const ref = `${colName(c)}${r + 1}`;
            const trimmed = value.trim();
            if (trimmed && NUMERIC.test(trimmed) && Number.isFinite(Number(trimmed)))
              return `<c r="${ref}"><v>${trimmed}</v></c>`;
            return `<c r="${ref}" t="s"><v>${share(value)}</v></c>`;
          })
          .join("");
        return `<row r="${r + 1}">${cellsXml}</row>`;
      })
      .join("");
    zip.file(
      `xl/worksheets/sheet${i + 1}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${colName(Math.max(0, width - 1))}${Math.max(1, grid.length)}"/><sheetData>${rows}</sheetData></worksheet>`,
    );
  });
  return {
    bytes: await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
    truncated,
  };
}

export type XlsxSheet = { name: string; grid: string[][] };
export type XlsxData = { sheets: XlsxSheet[]; truncated: boolean };

const BUILTIN_DATE_FORMATS = new Set([
  14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51,
  52, 53, 54, 55, 56, 57, 58,
]);

function excelSerialToISO(serial: number) {
  if (!Number.isFinite(serial) || serial < 0 || serial > 80000) return "";
  const whole = Math.floor(serial),
    fraction = serial - whole;
  const date = new Date(Math.round((whole - 25569) * 86400000));
  if (Number.isNaN(date.getTime())) return "";
  const iso = date.toISOString().slice(0, 10);
  if (fraction > 0.00001) {
    const minutes = Math.round(fraction * 1440),
      hh = String(Math.floor(minutes / 60)).padStart(2, "0"),
      mm = String(minutes % 60).padStart(2, "0");
    return `${iso} ${hh}:${mm}`;
  }
  return iso;
}

async function zipText(zip: JSZip, name: string) {
  const entry = zip.file(name);
  return entry ? entry.async("string") : "";
}

export async function readXlsx(bytes: Uint8Array): Promise<XlsxData> {
  inspectXlsxZip(bytes);
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(bytes);
  const workbook = await zipText(zip, "xl/workbook.xml");
  if (!workbook.includes("<sheet")) throw new PdfError("This workbook has no sheets.", "INVALID");
  const rels = await zipText(zip, "xl/_rels/workbook.xml.rels");
  const relTarget = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship(?=[\s/>])[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g))
    relTarget.set(m[1], m[2]);
  const sheetRefs: { name: string; file: string }[] = [];
  for (const m of workbook.matchAll(/<sheet(?=[\s/>])[^>]*>/g)) {
    const tag = m[0],
      name = /name="([^"]*)"/.exec(tag)?.[1] ?? `Sheet ${sheetRefs.length + 1}`,
      id = /(?:r:)?id="([^"]+)"/.exec(tag)?.[1] ?? "";
    const target = relTarget.get(id) ?? `worksheets/sheet${sheetRefs.length + 1}.xml`;
    sheetRefs.push({ name: xmlDecode(name), file: target.replace(/^\//, "") });
    if (sheetRefs.length >= XLSX_LIMITS.maxSheets) break;
  }
  const sharedXml = await zipText(zip, "xl/sharedStrings.xml"),
    shared: string[] = [];
  for (const m of sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    const texts = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => xmlDecode(t[1]));
    shared.push(texts.join(""));
    if (shared.join("").length > XLSX_LIMITS.maxTextChars)
      throw new PdfError("This spreadsheet contains too much text for one run.", "LIMIT");
  }
  const stylesXml = await zipText(zip, "xl/styles.xml");
  const customDate = new Set<string>();
  for (const m of stylesXml.matchAll(/<numFmt[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) {
    const code = xmlDecode(m[2]);
    if (/[yY]|[mM]{1,5}|[dD]{1,4}|[hH]{1,2}|[sS]{1,2}/.test(code) && !/General/i.test(code))
      customDate.add(m[1]);
  }
  const styleIsDate: boolean[] = [];
  const xfs = /<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(stylesXml)?.[1] ?? "";
  for (const m of xfs.matchAll(/<xf[^>]*>/g)) {
    const id = /numFmtId="(\d+)"/.exec(m[0])?.[1] ?? "0";
    styleIsDate.push(BUILTIN_DATE_FORMATS.has(Number(id)) || customDate.has(id));
  }
  const sheets: XlsxSheet[] = [];
  let cells = 0,
    truncated = false,
    chars = 0;
  for (const ref of sheetRefs.slice(0, XLSX_LIMITS.maxSheets)) {
    const xml = await zipText(
      zip,
      ref.file.startsWith("xl/") || ref.file.startsWith("worksheets/")
        ? ref.file.startsWith("xl/")
          ? ref.file
          : `xl/${ref.file}`
        : `xl/worksheets/${ref.file}`,
    );
    const grid: string[][] = [];
    for (const rowMatch of xml.matchAll(/<row(?=[\s>])[^>]*>([\s\S]*?)<\/row>/g)) {
      if (truncated) break;
      const rowXml = rowMatch[1],
        row: string[] = [];
      for (const cellMatch of rowXml.matchAll(/<c\s+([^>]*)>([\s\S]*?)<\/c>|<c\s+([^/]*)\/>/g)) {
        const attrs = cellMatch[1] ?? cellMatch[3] ?? "",
          inner = cellMatch[2] ?? "";
        const refAttr = /r="([A-Z]+)(\d+)"/.exec(attrs);
        if (!refAttr) continue;
        const c = colIndex(refAttr[1]);
        if (c >= XLSX_LIMITS.maxCols) {
          truncated = true;
          continue;
        }
        const type = /t="([a-zA-Z]+)"/.exec(attrs)?.[1] ?? "",
          style = /s="(\d+)"/.exec(attrs)?.[1] ?? "";
        let value = "";
        if (type === "s") {
          const v = /<v>([^<]*)<\/v>/.exec(inner)?.[1] ?? "";
          value = shared[Number(v)] ?? "";
        } else if (type === "inlineStr") {
          value = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
            .map((t) => xmlDecode(t[1]))
            .join("");
        } else if (type === "b") {
          value = (/<v>([^<]*)<\/v>/.exec(inner)?.[1] ?? "0").trim() === "1" ? "TRUE" : "FALSE";
        } else if (type === "e") {
          value = /<v>([^<]*)<\/v>/.exec(inner)?.[1] ?? "";
        } else {
          const v = /<v>([^<]*)<\/v>/.exec(inner)?.[1];
          value = v ?? "";
          if (value !== "" && style !== "" && styleIsDate[Number(style)]) {
            const iso = excelSerialToISO(Number(value));
            if (iso) value = iso;
          }
        }
        while (row.length <= c) row.push("");
        row[c] = value;
        chars += value.length;
        if (chars > XLSX_LIMITS.maxTextChars)
          throw new PdfError("This spreadsheet contains too much text for one run.", "LIMIT");
        if (++cells > XLSX_LIMITS.maxCells) {
          truncated = true;
          break;
        }
      }
      while (row.length && !row[row.length - 1]) row.pop();
      if (row.length) grid.push(row);
      if (grid.length > 100000) {
        truncated = true;
        break;
      }
    }
    sheets.push({ name: ref.name, grid });
  }
  if (!sheets.some((s) => s.grid.length))
    throw new PdfError("No cell values were found in this workbook.", "NO_TEXT");
  return { sheets, truncated };
}
