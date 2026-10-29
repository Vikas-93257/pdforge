import { PdfError } from "./engine";
import { checkAbort } from "./render";
import { inspectOfficeZip, xmlDecode, xmlEscape } from "./xlsx";
import { extractTextPages, writeBlocksPdf, type TextBlock } from "./convert";
import type { CanvasEnv } from "./render";

export const PPTX_LIMITS = {
  maxSlides: 500,
  maxShapesPerSlide: 60,
  maxShapeChars: 20000,
  maxImageBytes: 30 * 1024 * 1024,
  maxBlocks: 24000,
} as const;

export function inspectPptxZip(bytes: Uint8Array) {
  return inspectOfficeZip(bytes, {
    required: "ppt/presentation.xml",
    container: "PPTX",
    document: "The archive does not contain a PowerPoint presentation.",
    archive: "presentation",
  });
}

const EMU_PER_PT = 12700;
const SLIDE_CX = 12192000;
const SLIDE_CY = 6858000;

const emu = (pt: number) => Math.max(1, Math.round(pt * EMU_PER_PT));

function runXml(text: string, sizePt: number, bold: boolean, italic: boolean) {
  const attrs = [
    `sz="${Math.round(sizePt * 100)}"`,
    bold ? `b="1"` : `b="0"`,
    italic ? `i="1"` : `i="0"`,
  ];
  return `<a:r><a:rPr ${attrs.join(" ")}><a:latin typeface="Calibri"/></a:rPr><a:t xml:space="preserve">${xmlEscape(text)}</a:t></a:r>`;
}

function paraXml(
  runs: { text: string; bold: boolean; italic: boolean }[],
  sizePt: number,
  bullet: string | null,
  align: string | null,
) {
  const props = [`<a:pPr${align ? ` algn="${align}"` : ""}>`];
  if (bullet) props.push(`<a:buChar char="${bullet === "•" ? "•" : "-"}"/>`);
  else props.push("<a:buNone/>");
  props.push("</a:pPr>");
  const body = runs.length
    ? runs.map((r) => runXml(r.text, sizePt, r.bold, r.italic)).join("")
    : `<a:r><a:rPr sz="${Math.round(sizePt * 100)}"><a:latin typeface="Calibri"/></a:rPr><a:t xml:space="preserve"></a:t></a:r>`;
  return `<a:p>${props.join("")}${body}</a:p>`;
}

function textShape(
  id: number,
  name: string,
  xPt: number,
  yPt: number,
  wPt: number,
  hPt: number,
  paras: string[],
) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${xmlEscape(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emu(xPt)}" y="${emu(yPt)}"/><a:ext cx="${emu(wPt)}" cy="${emu(hPt)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>${paras.join("")}</p:txBody></p:sp>`;
}

function tableShape(id: number, xPt: number, yPt: number, wPt: number, grid: string[][]) {
  const width = Math.max(...grid.map((r) => r.length), 1);
  const rows = grid.slice(0, 40).map((row) => {
    const cells = Array.from({ length: width }, (_, i) => row[i] ?? "");
    const cellXml = cells
      .map(
        (cell) =>
          `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:buNone/></a:pPr><a:r><a:rPr sz="1200"><a:latin typeface="Calibri"/></a:rPr><a:t xml:space="preserve">${xmlEscape(cell.slice(0, 2000))}</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc>`,
      )
      .join("");
    return `<a:tr h="${emu(22)}">${cellXml}</a:tr>`;
  });
  const colW = emu(wPt / width);
  return `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="Table"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${emu(xPt)}" y="${emu(yPt)}"/><a:ext cx="${emu(wPt)}" cy="${emu(rows.length * 22 + 8)}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="1" bandRow="1"/><a:tblGrid>${Array.from({ length: width }, () => `<a:gridCol w="${colW}"/>`).join("")}</a:tblGrid>${rows.join("")}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;
}

function picShape(
  id: number,
  rid: string,
  xPt: number,
  yPt: number,
  wPt: number,
  hPt: number,
  alt: string,
) {
  return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${xmlEscape(alt)}" descr="${xmlEscape(alt)}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${emu(xPt)}" y="${emu(yPt)}"/><a:ext cx="${emu(wPt)}" cy="${emu(hPt)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
}

const CONTENT_TYPES = (slides: number) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${Array.from({ length: slides }, (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("")}</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;

const presentationXml = (slides: number) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${Array.from({ length: slides }, (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join("")}</p:sldIdLst><p:sldSz cx="${SLIDE_CX}" cy="${SLIDE_CY}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`;

const presentationRels = (slides: number) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${Array.from({ length: slides }, (_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join("")}</Relationships>`;

const MASTER_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="4400"><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:defRPr sz="1800"><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr><a:latin typeface="Calibri"/></a:defRPr></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>`;

const MASTER_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`;

const LAYOUT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:overrideClrMappingLst/></p:clrMapOvr></p:sldLayout>`;

const LAYOUT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`;

const THEME_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="PDFORGE"><a:themeElements><a:clrScheme name="PDFORGE"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F2937"/></a:dk2><a:lt2><a:srgbClr val="F3F4F6"/></a:lt2><a:accent1><a:srgbClr val="2563EB"/></a:accent1><a:accent2><a:srgbClr val="059669"/></a:accent2><a:accent3><a:srgbClr val="D97706"/></a:accent3><a:accent4><a:srgbClr val="DC2626"/></a:accent4><a:accent5><a:srgbClr val="7C3AED"/></a:accent5><a:accent6><a:srgbClr val="0891B2"/></a:accent6><a:hlink><a:srgbClr val="2563EB"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink></a:clrScheme><a:fmtScheme name="PDFORGE"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

const CORE_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>PDFORGE presentation</dc:title><dc:creator>PDFORGE</dc:creator></cp:coreProperties>`;

const APP_XML = (slides: number) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>PDFORGE</Application><PresentationFormat>Widescreen</PresentationFormat><Slides>${slides}</Slides></Properties>`;

function estimateTextHeight(text: string, widthPt: number, sizePt: number) {
  const perLine = Math.max(8, Math.floor(widthPt / (sizePt * 0.55)));
  return Math.ceil(text.length / perLine) * sizePt * 1.25 + 10;
}

export async function pdfToPptx(bytes: Uint8Array, signal?: AbortSignal, env?: CanvasEnv) {
  const pages = await extractTextPages(bytes, signal, env);
  if (!pages.some((p) => p.blocks.some((b) => b.type !== "image")))
    throw new PdfError("No selectable text was found. Use OCR for scanned documents.", "NO_TEXT");
  if (pages.length > PPTX_LIMITS.maxSlides)
    throw new PdfError(
      `This PDF has more than ${PPTX_LIMITS.maxSlides} pages; split it before converting to slides.`,
      "LIMIT",
    );
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const media = new Map<string, Uint8Array>();
  let truncated = false;
  pages.forEach((page, slideIndex) => {
    checkAbort(signal);
    const shapes: string[] = [];
    const rels: string[] = [
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>`,
    ];
    let nextId = 2,
      nextRid = 2;
    const blocks: TextBlock[] = page.blocks.slice(0, PPTX_LIMITS.maxShapesPerSlide + 1);
    if (page.blocks.length > PPTX_LIMITS.maxShapesPerSlide + 1) truncated = true;
    const firstHeading = blocks.find((b) => b.type === "heading");
    const title =
      firstHeading && firstHeading.type === "heading" ? firstHeading.text : `Page ${page.page}`;
    shapes.push(
      textShape(nextId++, "Title", 54, 24, 852, 60, [
        paraXml([{ text: title.slice(0, 500), bold: true, italic: false }], 32, null, "ctr"),
      ]),
    );
    let y = 110;
    const bottom = 500;
    const rest = blocks.filter((b) => b !== firstHeading);
    for (const block of rest) {
      if (y > bottom || shapes.length > PPTX_LIMITS.maxShapesPerSlide) {
        truncated = true;
        break;
      }
      if (block.type === "image") {
        const png = page.images[block.index]?.png;
        if (!png) continue;
        const img = page.images[block.index];
        const scale = Math.min(
          1,
          852 / Math.max(1, img.width),
          (bottom - y) / Math.max(1, img.height),
        );
        if (scale < 0.15) {
          truncated = true;
          continue;
        }
        const w = img.width * scale,
          h = img.height * scale,
          name = `ppt/media/image${media.size + 1}.png`;
        media.set(name, png);
        const rid = `rId${nextRid++}`;
        rels.push(
          `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../${name.replace(/^ppt\//, "")}"/>`,
        );
        shapes.push(picShape(nextId++, rid, 54 + (852 - w) / 2, y, w, h, block.alt));
        y += h + 12;
      } else if (block.type === "table") {
        const grid = block.grid.slice(0, 40).map((r) => r.slice(0, 8));
        const height = grid.length * 22 + 8;
        if (y + height > bottom + 40) {
          truncated = true;
          break;
        }
        shapes.push(tableShape(nextId++, 54, y, 852, grid));
        y += height + 12;
      } else if (block.type === "list") {
        const items = block.items.slice(0, 60);
        const paras = items.map((item) =>
          paraXml(
            [{ text: item.slice(0, PPTX_LIMITS.maxShapeChars), bold: false, italic: false }],
            18,
            block.ordered ? "-" : "•",
            null,
          ),
        );
        const height = Math.min(
          items.reduce((sum, item) => sum + estimateTextHeight(item, 852, 18), 0),
          bottom - y,
        );
        shapes.push(textShape(nextId++, "List", 54, y, 852, Math.max(30, height), paras));
        y += Math.max(30, height) + 12;
      } else if (block.type === "heading") {
        const paras = [
          paraXml([{ text: block.text.slice(0, 1000), bold: true, italic: false }], 24, null, null),
        ];
        const height = estimateTextHeight(block.text, 852, 24);
        shapes.push(textShape(nextId++, "Heading", 54, y, 852, Math.max(30, height), paras));
        y += Math.max(30, height) + 10;
      } else {
        const text = block.runs.map((r) => r.text).join("");
        const paras = [
          paraXml(
            block.runs.map((r) => ({ ...r, text: r.text.slice(0, PPTX_LIMITS.maxShapeChars) })),
            18,
            null,
            null,
          ),
        ];
        if (text.length > PPTX_LIMITS.maxShapeChars) truncated = true;
        const height = Math.min(estimateTextHeight(text, 852, 18), bottom - y + 60);
        shapes.push(textShape(nextId++, "Text", 54, y, 852, Math.max(30, height), paras));
        y += Math.max(30, height) + 10;
      }
    }
    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapes.join("")}</p:spTree></p:cSld><p:clrMapOvr><a:overrideClrMappingLst/></p:clrMapOvr></p:sld>`;
    zip.file(`ppt/slides/slide${slideIndex + 1}.xml`, slideXml);
    zip.file(
      `ppt/slides/_rels/slide${slideIndex + 1}.xml.rels`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join("")}</Relationships>`,
    );
  });
  zip.file("[Content_Types].xml", CONTENT_TYPES(pages.length));
  zip.file("_rels/.rels", ROOT_RELS);
  zip.file("ppt/presentation.xml", presentationXml(pages.length));
  zip.file("ppt/_rels/presentation.xml.rels", presentationRels(pages.length));
  zip.file("ppt/slideMasters/slideMaster1.xml", MASTER_XML);
  zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", MASTER_RELS);
  zip.file("ppt/slideLayouts/slideLayout1.xml", LAYOUT_XML);
  zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", LAYOUT_RELS);
  zip.file("ppt/theme/theme1.xml", THEME_XML);
  zip.file("docProps/core.xml", CORE_XML);
  zip.file("docProps/app.xml", APP_XML(pages.length));
  for (const [name, data] of media) zip.file(name, data);
  const out = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return { bytes: new Uint8Array(out), slides: pages.length, truncated };
}

type SlideShape =
  | { kind: "title"; text: string }
  | { kind: "para"; paras: { text: string; bullet: boolean; level: number }[] }
  | { kind: "table"; grid: string[][] }
  | { kind: "image"; rid: string }
  | { kind: "skip" };

function parseSlideShapes(slideXml: string): SlideShape[] {
  const shapes: SlideShape[] = [];
  const pushText = (xml: string, isTitle: boolean) => {
    const paras: { text: string; bullet: boolean; level: number }[] = [];
    for (const m of xml.matchAll(/<a:p(?:\s[^>]*)?>([\s\S]*?)<\/a:p>/g)) {
      const inner = m[1];
      const ppr = /<a:pPr([^>]*)>/.exec(inner)?.[1] ?? "";
      const text = [...inner.matchAll(/<a:t(?=[\s>])[^>]*>([\s\S]*?)<\/a:t>/g)]
        .map((t) => xmlDecode(t[1]))
        .join("");
      if (!text.trim()) continue;
      const level = Number(/lvl="(\d)"/.exec(ppr)?.[1] ?? "0");
      const bullet = /<a:buChar|<a:buAutoNum/.test(inner) || /<a:buChar|<a:buAutoNum/.test(ppr);
      paras.push({ text, bullet, level: Math.min(8, level) });
      if (paras.length >= 400) break;
    }
    if (!paras.length) return;
    if (isTitle && paras.length === 1 && !paras[0].bullet)
      shapes.push({ kind: "title", text: paras[0].text });
    else shapes.push({ kind: "para", paras });
  };
  const parseTable = (xml: string) => {
    const grid: string[][] = [];
    for (const row of xml.matchAll(/<a:tr[\s>][\s\S]*?<\/a:tr>/g)) {
      const cells: string[] = [];
      for (const cell of row[0].matchAll(/<a:tc[\s>][\s\S]*?<\/a:tc>/g)) {
        const text = [...cell[0].matchAll(/<a:t(?=[\s>])[^>]*>([\s\S]*?)<\/a:t>/g)]
          .map((t) => xmlDecode(t[1]))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 50000);
        cells.push(text);
        if (cells.length >= 24) break;
      }
      if (cells.length) grid.push(cells);
      if (grid.length >= 2000) break;
    }
    if (!grid.length) return;
    const width = Math.max(...grid.map((r) => r.length));
    shapes.push({
      kind: "table",
      grid: grid.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? "")),
    });
  };
  const starts = [...slideXml.matchAll(/<(p:sp|p:graphicFrame|p:pic)\b/g)];
  for (const start of starts) {
    const kind = start[1],
      close = `</${kind}>`,
      from = start.index ?? 0;
    const end = slideXml.indexOf(close, from);
    if (end < 0 || shapes.length > 4000) continue;
    const xml = slideXml.slice(from, end + close.length);
    if (kind === "p:pic") {
      const rid = /r:embed="(rId\d+)"/.exec(xml)?.[1] ?? "";
      if (rid) shapes.push({ kind: "image", rid });
    } else if (kind === "p:graphicFrame") {
      if (/<a:tbl[\s>]/.test(xml)) parseTable(xml);
    } else if (/<a:tbl[\s>]/.test(xml)) {
      parseTable(xml);
    } else {
      const txBody = /<p:txBody[\s>][\s\S]*<\/p:txBody>/.exec(xml)?.[0] ?? "";
      if (!txBody) continue;
      const phType = /<p:ph[^>]*type="([^"]*)"/.exec(xml)?.[1] ?? "";
      pushText(txBody, phType === "title" || phType === "ctrTitle");
    }
  }
  if (!shapes.some((s) => s.kind === "title")) {
    const at = shapes.findIndex((s) => s.kind === "para");
    const first = at >= 0 ? shapes[at] : null;
    if (first && first.kind === "para" && first.paras.length === 1 && !first.paras[0].bullet)
      shapes.splice(at, 1, { kind: "title", text: first.paras[0].text });
  }
  return shapes;
}

export async function pptxToPdf(bytes: Uint8Array, signal?: AbortSignal) {
  inspectPptxZip(bytes);
  checkAbort(signal);
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(bytes);
  const entry = async (name: string) => zip.file(name)?.async("string") ?? "";
  const presentation = await entry("ppt/presentation.xml");
  const presRels = await entry("ppt/_rels/presentation.xml.rels");
  const relTarget = new Map<string, string>();
  for (const m of presRels.matchAll(
    /<Relationship(?=[\s/>])[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g,
  ))
    relTarget.set(m[1], m[2]);
  const slideFiles: string[] = [];
  for (const m of presentation.matchAll(/<p:sldId[^>]*r:id="([^"]+)"[^>]*>/g)) {
    const target = (relTarget.get(m[1]) ?? "").replace(/^\//, "");
    if (target)
      slideFiles.push(
        target.startsWith("ppt/") || target.startsWith("slides/")
          ? target.replace(/^slides\//, "ppt/slides/")
          : `ppt/${target}`,
      );
    if (slideFiles.length >= PPTX_LIMITS.maxSlides) break;
  }
  if (!slideFiles.length)
    throw new PdfError("This presentation has no readable slides.", "INVALID");
  const out: Parameters<typeof writeBlocksPdf>[1] = [];
  let skippedImages = 0,
    emptySlides = 0;
  const { imageDimensions } = await import("./imageHeader");
  for (let s = 0; s < slideFiles.length; s++) {
    checkAbort(signal);
    const slideXml = await entry(slideFiles[s]);
    if (!slideXml) {
      emptySlides++;
      continue;
    }
    const base = slideFiles[s].replace(/[^/]+$/, "");
    const slideRels = await entry(`${base}_rels/${slideFiles[s].split("/").pop()}.rels`);
    const imgTarget = new Map<string, string>();
    for (const m of slideRels.matchAll(
      /<Relationship(?=[\s/>])[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g,
    ))
      imgTarget.set(m[1], m[2]);
    const shapes = parseSlideShapes(slideXml);
    if (!shapes.length) {
      emptySlides++;
      continue;
    }
    const title = shapes.find((sh): sh is { kind: "title"; text: string } => sh.kind === "title");
    const heading = title ? title.text.slice(0, 500) : `Slide ${s + 1}`;
    out.push({ kind: "heading", level: 1, runs: [{ text: heading, bold: true, italic: false }] });
    for (const shape of shapes) {
      if (shape.kind === "title" && shape.text === heading) continue;
      if (shape.kind === "title") {
        out.push({
          kind: "heading",
          level: 2,
          runs: [{ text: shape.text.slice(0, 500), bold: true, italic: false }],
        });
      } else if (shape.kind === "para") {
        for (const para of shape.paras) {
          const runs = [{ text: para.text.slice(0, 50000), bold: false, italic: false }];
          if (para.bullet)
            out.push({ kind: "bullet", runs, marker: "•", level: Math.min(8, para.level) });
          else out.push({ kind: "para", runs, align: "left", quote: false });
        }
      } else if (shape.kind === "table") {
        out.push({ kind: "table", grid: shape.grid, header: false });
      } else if (shape.kind === "image") {
        const raw = imgTarget.get(shape.rid) ?? "";
        const resolved = raw.startsWith("../")
          ? `ppt/${raw.slice(3)}`
          : raw.startsWith("/")
            ? raw.slice(1)
            : `${base}${raw}`;
        const lower = resolved.toLowerCase();
        const file =
          lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")
            ? zip.file(resolved)
            : null;
        if (!file) {
          skippedImages++;
          continue;
        }
        try {
          const data = new Uint8Array(await file.async("uint8array"));
          if (data.length > PPTX_LIMITS.maxImageBytes) {
            skippedImages++;
            continue;
          }
          const dims = imageDimensions(data);
          out.push({
            kind: "image",
            data,
            png: lower.endsWith(".png"),
            width: dims.width,
            height: dims.height,
          });
        } catch {
          skippedImages++;
        }
      }
      if (out.length > PPTX_LIMITS.maxBlocks)
        throw new PdfError("This presentation has too much content to convert.", "LIMIT");
    }
  }
  const warnings: string[] = [];
  if (skippedImages)
    warnings.push(
      `${skippedImages} image${skippedImages === 1 ? " was" : "s were"} skipped (only embedded PNG/JPEG are supported).`,
    );
  if (emptySlides)
    warnings.push(
      `${emptySlides} empty ${emptySlides === 1 ? "slide was" : "slides were"} skipped.`,
    );
  warnings.push(
    "Simplified layout: animations, transitions, speaker notes, charts and SmartArt are not reproduced.",
  );
  return {
    bytes: await writeBlocksPdf(
      "PowerPoint presentation",
      out,
      "PDFORGE text-first PPTX conversion",
      signal,
    ),
    warnings,
  };
}
