import type { PDFFont } from "pdf-lib";
import { openDocument, checkAbort, browserEnv, type CanvasEnv } from "./render";
import { PdfError } from "./engine";
import { inspectOfficeZip, buildXlsx, readXlsx, xmlDecode, type XlsxData } from "./xlsx";

export type TextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  size: number;
  fontName: string;
  bold: boolean;
  italic: boolean;
};

export type TextRun = { text: string; bold: boolean; italic: boolean };

export type TextBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string; runs: TextRun[] }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; grid: string[][] }
  | { type: "image"; index: number; alt: string };

export type ExtractedImage = {
  x: number;
  y: number;
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  png: Uint8Array | null;
};

export type ExtractedPage = {
  page: number;
  lines: string[];
  rows: TextItem[][];
  blocks: TextBlock[];
  images: ExtractedImage[];
  ruledCols: Map<number, string[]>;
};

const BOLD_FONT = /(bold|black|heavy|demi)/i;
const ITALIC_FONT = /(italic|oblique|slanted)/i;

export async function extractTextPages(
  bytes: Uint8Array,
  signal?: AbortSignal,
  env?: CanvasEnv,
): Promise<ExtractedPage[]> {
  const { doc, destroy } = await openDocument(bytes),
    pages: ExtractedPage[] = [];
  let characters = 0;
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      checkAbort(signal);
      const page = await doc.getPage(i),
        content = await page.getTextContent(),
        items: TextItem[] = [];
      for (const entry of content.items) {
        if ("str" in entry && entry.str.trim()) {
          const size = Math.max(1, Math.hypot(entry.transform[0], entry.transform[1]));
          const fontName = "fontName" in entry ? String(entry.fontName || "") : "";
          items.push({
            str: entry.str,
            x: entry.transform[4],
            y: entry.transform[5],
            width: entry.width,
            size: Math.round(size * 10) / 10,
            fontName,
            bold: BOLD_FONT.test(fontName),
            italic: ITALIC_FONT.test(fontName),
          });
          characters += entry.str.length;
          if (characters > 5000000)
            throw new PdfError(
              "This document contains too much text for one conversion. Split it first.",
              "LIMIT",
            );
        }
      }
      const rows = groupColumnRows(items);
      const opsPage = page as unknown as OpListPage;
      const graphics = await collectGraphics(opsPage);
      const ruledCols = ruledColumns(rows, detectRuledGrids(graphics.segments));
      const images = await collectImages(opsPage, graphics.pictures, env);
      pages.push({
        page: i,
        rows,
        lines: rows.map((row) =>
          row
            .map((item) => item.str)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim(),
        ),
        blocks: buildBlocks(
          rows,
          ruledCols,
          images.map((img, index) => ({
            yc: img.y + img.height / 2,
            index,
            alt: `Image ${index + 1} on page ${i}`,
          })),
        ),
        images,
        ruledCols,
      });
      page.cleanup();
    }
  } finally {
    await destroy();
  }
  return pages;
}

function groupRows(items: TextItem[]): TextItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: TextItem[][] = [];
  let current: TextItem[] = [],
    currentY: number | null = null;
  for (const item of sorted) {
    if (currentY === null || Math.abs(item.y - currentY) <= 2.5) {
      current.push(item);
      currentY ??= item.y;
    } else {
      rows.push(current.sort((a, b) => a.x - b.x));
      current = [item];
      currentY = item.y;
    }
  }
  if (current.length) rows.push(current.sort((a, b) => a.x - b.x));
  return rows;
}

type Gutter = { x0: number; x1: number };

function findGutters(items: TextItem[]): Gutter[] {
  const minX = Math.min(...items.map((i) => i.x)),
    maxX = Math.max(...items.map((i) => i.x + i.width)),
    minY = Math.min(...items.map((i) => i.y)),
    maxY = Math.max(...items.map((i) => i.y));
  if (maxX - minX < 200) return [];
  const bounds: { x: number; d: number }[] = [];
  for (const item of items) {
    if (!item.str.trim()) continue;
    if (item.width > (maxX - minX) * 0.55) continue;
    bounds.push({ x: item.x, d: 1 }, { x: item.x + item.width, d: -1 });
  }
  bounds.sort((a, b) => a.x - b.x || b.d - a.d);
  const candidates: Gutter[] = [];
  let depth = 0,
    gapStart = minX;
  for (const bound of bounds) {
    if (depth === 0 && bound.d === 1 && bound.x - gapStart >= 30)
      candidates.push({ x0: gapStart, x1: bound.x });
    depth += bound.d;
    if (depth === 0) gapStart = bound.x;
  }
  return candidates.filter((gutter) => {
    const both: number[] = [];
    const buckets = new Map<number, { left: boolean; right: boolean }>();
    for (const item of items) {
      if (!item.str.trim()) continue;
      const key = Math.round(item.y / 6);
      let slot = buckets.get(key);
      if (!slot) {
        slot = { left: false, right: false };
        buckets.set(key, slot);
      }
      if (item.x + item.width <= gutter.x0 + 1) slot.left = true;
      else if (item.x >= gutter.x1 - 1) slot.right = true;
    }
    for (const [key, slot] of buckets) if (slot.left && slot.right) both.push(key);
    if (both.length < 8) return false;
    return (Math.max(...both) - Math.min(...both)) * 6 >= (maxY - minY) * 0.4;
  });
}

function groupColumnRows(items: TextItem[]): TextItem[][] {
  if (items.length < 8) return groupRows(items);
  const gutters = findGutters(items);
  if (!gutters.length) return groupRows(items);
  const minX = Math.min(...items.map((i) => i.x)),
    maxX = Math.max(...items.map((i) => i.x + i.width));
  const crosses = (item: TextItem) =>
    gutters.some((g) => item.x < g.x0 && item.x + item.width > g.x1) ||
    item.width > (maxX - minX) * 0.55;
  const wide = items.filter(crosses),
    narrow = items.filter((item) => !crosses(item));
  const bands: TextItem[][][] = [];
  for (let k = 0; k <= gutters.length; k++) {
    const x0 = k ? gutters[k - 1].x1 : minX,
      x1 = k < gutters.length ? gutters[k].x0 : maxX;
    const inBand = narrow.filter((item) => {
      const center = item.x + item.width / 2;
      return center >= x0 - 1 && center <= x1 + 1;
    });
    bands.push(groupRows(inBand));
  }
  const bandItems = narrow.filter((item) =>
    bands.some((_, k) => {
      const x0 = k ? gutters[k - 1].x1 : minX,
        x1 = k < gutters.length ? gutters[k].x0 : maxX,
        center = item.x + item.width / 2;
      return center >= x0 - 1 && center <= x1 + 1;
    }),
  );
  if (!bandItems.length) return groupRows(items);
  const bandTop = Math.max(...bandItems.map((i) => i.y)),
    bandBottom = Math.min(...bandItems.map((i) => i.y));
  const wideRows = groupRows(wide);
  const rowY = (row: TextItem[]) => row[0].y;
  const head = wideRows.filter((row) => rowY(row) > bandTop),
    tail = wideRows.filter((row) => rowY(row) < bandBottom),
    inside = wideRows.filter((row) => rowY(row) <= bandTop && rowY(row) >= bandBottom);
  const out: TextItem[][] = [...head];
  if (!inside.length) {
    for (const band of bands) out.push(...band);
    out.push(...tail);
    return out;
  }
  const cuts: { y: number; rows: TextItem[][] }[] = [];
  for (const row of inside) {
    const last = cuts[cuts.length - 1];
    if (last && last.rows[last.rows.length - 1][0].y - rowY(row) <= 40) last.rows.push(row);
    else cuts.push({ y: rowY(row), rows: [row] });
  }
  const chunks = bands.map((band) => {
    const parts: TextItem[][][] = cuts.map(() => []);
    const rest: TextItem[][] = [];
    for (const row of band) {
      const idx = cuts.findIndex((cut) => rowY(row) <= cut.y);
      if (idx < 0) parts[0].push(row);
      else if (rowY(row) > (cuts[idx + 1]?.y ?? -Infinity)) parts[idx].push(row);
      else rest.push(row);
    }
    return { parts, rest };
  });
  cuts.forEach((cut, k) => {
    for (const chunk of chunks) out.push(...chunk.parts[k]);
    out.push(...cut.rows);
  });
  for (const chunk of chunks) out.push(...chunk.rest);
  out.push(...tail);
  return out;
}

type Matrix = [number, number, number, number, number, number];
type Segment = { x1: number; y1: number; x2: number; y2: number };
type PictureRef =
  | { kind: "xobject"; id: string; bbox: [number, number, number, number] }
  | {
      kind: "inline";
      data: { width: number; height: number; kind: number; data: Uint8Array };
      bbox: [number, number, number, number];
    };

// Numeric pdf.js operator IDs (stable across pdf.js versions; avoids bundling pdf.js here).
const OP_SAVE = 10,
  OP_RESTORE = 11,
  OP_TRANSFORM = 12,
  OP_CONSTRUCT = 91,
  OP_PAINT_IMAGE = 85,
  OP_PAINT_INLINE = 86;
const STROKE_PAINTS = new Set([20, 21, 24, 26]);
const DRAW_MOVE = 0,
  DRAW_LINE = 1,
  DRAW_CURVE = 2,
  DRAW_QUAD = 3,
  DRAW_CLOSE = 4;

function mulMatrix(m1: Matrix, m2: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = m1,
    [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

function applyMatrix(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

function ctmBox(ctm: Matrix): [number, number, number, number] {
  const corners = [
    applyMatrix(ctm, 0, 0),
    applyMatrix(ctm, 1, 0),
    applyMatrix(ctm, 0, 1),
    applyMatrix(ctm, 1, 1),
  ];
  return [
    Math.min(...corners.map((c) => c[0])),
    Math.min(...corners.map((c) => c[1])),
    Math.max(...corners.map((c) => c[0])),
    Math.max(...corners.map((c) => c[1])),
  ];
}

type OpListPage = {
  getOperatorList(): Promise<{ fnArray: number[]; argsArray: unknown[][] }>;
  objs: { get(id: string, callback: (data: unknown) => void): void };
};

async function collectGraphics(page: {
  getOperatorList(): Promise<{ fnArray: number[]; argsArray: unknown[][] }>;
}): Promise<{ segments: Segment[]; pictures: PictureRef[] }> {
  const segments: Segment[] = [],
    pictures: PictureRef[] = [];
  let ops;
  try {
    ops = await page.getOperatorList();
  } catch {
    return { segments, pictures };
  }
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];
  const pushAxis = (x1: number, y1: number, x2: number, y2: number) => {
    if (segments.length >= 8000) return;
    const [ax, ay] = applyMatrix(ctm, x1, y1),
      [bx, by] = applyMatrix(ctm, x2, y2),
      dx = Math.abs(bx - ax),
      dy = Math.abs(by - ay);
    if (dx < 1.5 && dy >= 8)
      segments.push({ x1: ax, y1: Math.min(ay, by), x2: ax, y2: Math.max(ay, by) });
    else if (dy < 1.5 && dx >= 8)
      segments.push({ x1: Math.min(ax, bx), y1: ay, x2: Math.max(ax, bx), y2: ay });
  };
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i],
      args = ops.argsArray[i] as unknown[];
    if (fn === OP_SAVE) {
      stack.push(ctm);
      if (stack.length > 64) stack.shift();
    } else if (fn === OP_RESTORE) {
      ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    } else if (fn === OP_TRANSFORM && Array.isArray(args)) {
      const m = args as number[];
      ctm = mulMatrix(ctm, [m[0], m[1], m[2], m[3], m[4], m[5]]);
    } else if (fn === OP_CONSTRUCT && Array.isArray(args) && STROKE_PAINTS.has(Number(args[0]))) {
      const outer = args[1] as ArrayLike<unknown>;
      let path: ArrayLike<number> | null = null;
      if (outer && typeof outer.length === "number") {
        if (typeof outer[0] === "number") path = outer as ArrayLike<number>;
        else if (outer.length === 1) {
          const inner = outer[0] as ArrayLike<number>;
          if (inner && typeof inner.length === "number" && typeof inner[0] === "number")
            path = inner;
        }
      }
      if (!path) continue;
      const draw = Array.from(path);
      let px = 0,
        py = 0,
        sx = 0,
        sy = 0,
        pen = false;
      for (let k = 0; k < draw.length; ) {
        const op = draw[k++];
        if (op === DRAW_MOVE) {
          px = draw[k++];
          py = draw[k++];
          sx = px;
          sy = py;
          pen = true;
        } else if (op === DRAW_LINE) {
          const x = draw[k++],
            y = draw[k++];
          if (pen && Number.isFinite(x) && Number.isFinite(y)) pushAxis(px, py, x, y);
          px = x;
          py = y;
        } else if (op === DRAW_CURVE) k += 6;
        else if (op === DRAW_QUAD) k += 4;
        else if (op === DRAW_CLOSE) {
          if (pen) pushAxis(px, py, sx, sy);
          px = sx;
          py = sy;
        } else break;
      }
    } else if (fn === OP_PAINT_IMAGE && pictures.length < 25) {
      const id = String((args as unknown[])[0] ?? "");
      if (id) pictures.push({ kind: "xobject", id, bbox: ctmBox(ctm) });
    } else if (fn === OP_PAINT_INLINE && pictures.length < 25) {
      const raw = (args as unknown[])[0] as {
        width?: number;
        height?: number;
        kind?: number;
        data?: Uint8Array;
      };
      if (
        raw &&
        Number.isFinite(raw.width) &&
        Number.isFinite(raw.height) &&
        raw.data instanceof Uint8Array
      )
        pictures.push({
          kind: "inline",
          data: {
            width: raw.width!,
            height: raw.height!,
            kind: raw.kind ?? 2,
            data: raw.data,
          },
          bbox: ctmBox(ctm),
        });
    }
  }
  return { segments, pictures };
}

type RuledGrid = { xs: number[]; ys: number[]; x0: number; x1: number; y0: number; y1: number };

function detectRuledGrids(segments: Segment[]): RuledGrid[] {
  const h = segments.filter((s) => s.y1 === s.y2),
    v = segments.filter((s) => s.x1 === s.x2);
  if (h.length < 3 || v.length < 3) return [];
  const clusterH: { y: number; spans: [number, number][] }[] = [];
  for (const s of [...h].sort((a, b) => a.y1 - b.y1)) {
    const last = clusterH[clusterH.length - 1];
    if (last && Math.abs(s.y1 - last.y) <= 2) last.spans.push([s.x1, s.x2]);
    else clusterH.push({ y: s.y1, spans: [[s.x1, s.x2]] });
  }
  for (const line of clusterH) {
    line.spans.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const span of line.spans) {
      const m = merged[merged.length - 1];
      if (m && span[0] <= m[1] + 4) m[1] = Math.max(m[1], span[1]);
      else merged.push([span[0], span[1]]);
    }
    line.spans = merged;
  }
  const clusterV: { x: number; spans: [number, number][] }[] = [];
  for (const s of [...v].sort((a, b) => a.x1 - b.x1)) {
    const last = clusterV[clusterV.length - 1];
    if (last && Math.abs(s.x1 - last.x) <= 2) last.spans.push([s.y1, s.y2]);
    else clusterV.push({ x: s.x1, spans: [[s.y1, s.y2]] });
  }
  for (const line of clusterV) {
    line.spans.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const span of line.spans) {
      const m = merged[merged.length - 1];
      if (m && span[0] <= m[1] + 4) m[1] = Math.max(m[1], span[1]);
      else merged.push([span[0], span[1]]);
    }
    line.spans = merged;
  }
  const overlap = (a: [number, number][], b: [number, number][]) => {
    const a0 = Math.min(...a.map((s) => s[0])),
      a1 = Math.max(...a.map((s) => s[1])),
      b0 = Math.min(...b.map((s) => s[0])),
      b1 = Math.max(...b.map((s) => s[1]));
    return (
      Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)) / Math.max(1, Math.min(a1 - a0, b1 - b0))
    );
  };
  const runs: { y: number; spans: [number, number][] }[][] = [];
  let run: { y: number; spans: [number, number][] }[] = [];
  for (const line of clusterH) {
    const prev = run[run.length - 1];
    if (!prev || (line.y - prev.y <= 120 && overlap(prev.spans, line.spans) >= 0.6)) run.push(line);
    else {
      runs.push(run);
      run = [line];
    }
  }
  if (run.length) runs.push(run);
  const grids: RuledGrid[] = [];
  const attempt = (lines: { y: number; spans: [number, number][] }[], depth: number) => {
    if (lines.length < 3) return;
    const ys = lines.map((l) => l.y),
      y0 = Math.min(...ys),
      y1 = Math.max(...ys),
      x0 = Math.min(...lines.flatMap((l) => l.spans.map((s) => s[0]))),
      x1 = Math.max(...lines.flatMap((l) => l.spans.map((s) => s[1])));
    const xs = clusterV
      .filter(
        (vl) =>
          vl.x >= x0 - 3 &&
          vl.x <= x1 + 3 &&
          vl.spans.some((span) => span[0] <= y0 + 3 && span[1] >= y1 - 3),
      )
      .map((vl) => vl.x)
      .sort((a, b) => a - b);
    if (xs.length >= 3) {
      grids.push({ xs, ys: [...ys].sort((a, b) => a - b), x0, x1, y0, y1 });
      return;
    }
    if (depth >= 2 || lines.length < 6) return;
    const sorted = [...lines].sort((a, b) => a.y - b.y);
    let cut = 1,
      widest = 0;
    for (let k = 1; k < sorted.length; k++) {
      const gap = sorted[k].y - sorted[k - 1].y;
      if (gap > widest) {
        widest = gap;
        cut = k;
      }
    }
    attempt(sorted.slice(0, cut), depth + 1);
    attempt(sorted.slice(cut), depth + 1);
  };
  for (const candidate of runs) attempt(candidate, 0);
  return grids;
}

function ruledColumns(rows: TextItem[][], grids: RuledGrid[]): Map<number, string[]> {
  const out = new Map<number, string[]>();
  rows.forEach((row, index) => {
    const yc = row.reduce((sum, item) => sum + item.y, 0) / row.length;
    const grid = grids.find((g) => yc >= g.y0 - 6 && yc <= g.y1 + 6);
    if (!grid) return;
    const inside = row.filter((item) => {
      const center = item.x + item.width / 2;
      return center >= grid.x0 - 2 && center <= grid.x1 + 2;
    });
    if (inside.length < row.length * 0.5) return;
    const cells: string[] = [];
    for (let c = 0; c + 1 < grid.xs.length; c++) {
      const lo = grid.xs[c] - (c ? 2 : 6),
        hi = grid.xs[c + 1] + (c + 2 < grid.xs.length ? 2 : 6);
      const parts = inside
        .filter((item) => {
          const center = item.x + item.width / 2;
          return center >= lo && center < hi;
        })
        .map((item) => item.str);
      cells.push(parts.join(" ").replace(/\s+/g, " ").trim());
    }
    while (cells.length && !cells[cells.length - 1]) cells.pop();
    if (cells.filter(Boolean).length >= 2) out.set(index, cells);
  });
  return out;
}

function resolveImageObject(
  objs: OpListPage["objs"],
  id: string,
): Promise<{ width: number; height: number; kind: number; data: Uint8Array } | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 2000);
    try {
      objs.get(id, (data) => {
        clearTimeout(timer);
        const raw = data as { width?: number; height?: number; kind?: number; data?: Uint8Array };
        resolve(
          raw && Number.isFinite(raw.width) && Number.isFinite(raw.height)
            ? {
                width: raw.width!,
                height: raw.height!,
                kind: raw.kind ?? 2,
                data: raw.data as Uint8Array,
              }
            : null,
        );
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

function imageToRgba(image: {
  width: number;
  height: number;
  kind: number;
  data: Uint8Array;
}): Uint8ClampedArray | null {
  const { width, height, kind, data } = image;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return null;
  if (width * height > 16000000 || width * height < 100) return null;
  if (!data || !(data instanceof Uint8Array)) return null;
  if (kind === 3 && data.length === width * height * 4) return new Uint8ClampedArray(data);
  if (kind === 2 && data.length === width * height * 3) {
    const out = new Uint8ClampedArray(width * height * 4);
    for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
      out[j] = data[i];
      out[j + 1] = data[i + 1];
      out[j + 2] = data[i + 2];
      out[j + 3] = 255;
    }
    return out;
  }
  if (kind === 1 && data.length === width * height) {
    const out = new Uint8ClampedArray(width * height * 4);
    for (let i = 0, j = 0; i < data.length; i++, j += 4) {
      out[j] = data[i];
      out[j + 1] = data[i];
      out[j + 2] = data[i];
      out[j + 3] = 255;
    }
    return out;
  }
  return null;
}

async function encodeExtractedPng(
  env: CanvasEnv | undefined,
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Promise<Uint8Array | null> {
  if (!env) return null;
  try {
    const { canvas, ctx } = env.createCanvas(width, height);
    const context = ctx as {
      createImageData(w: number, h: number): { data: Uint8ClampedArray };
      putImageData(frame: { data: Uint8ClampedArray }, x: number, y: number): void;
    };
    const frame = context.createImageData(width, height);
    frame.data.set(rgba);
    context.putImageData(frame, 0, 0);
    return await env.toBytes(canvas, "png", 1);
  } catch {
    return null;
  }
}

async function collectImages(
  page: OpListPage,
  pictures: PictureRef[],
  env?: CanvasEnv,
): Promise<ExtractedImage[]> {
  const out: ExtractedImage[] = [],
    seen = new Set<string>();
  const encoder = env ?? (typeof window === "undefined" ? undefined : browserEnv());
  for (const picture of pictures) {
    const [x0, y0, x1, y1] = picture.bbox,
      width = x1 - x0,
      height = y1 - y0;
    if (!(width >= 1 && height >= 1)) continue;
    const key = `${Math.round(x0)}:${Math.round(y0)}:${Math.round(width)}:${Math.round(height)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const raw =
      picture.kind === "inline" ? picture.data : await resolveImageObject(page.objs, picture.id);
    if (!raw) continue;
    const rgba = imageToRgba(raw);
    if (!rgba) continue;
    out.push({
      x: x0,
      y: y0,
      width,
      height,
      pixelWidth: raw.width,
      pixelHeight: raw.height,
      png: await encodeExtractedPng(encoder, rgba, raw.width, raw.height),
    });
  }
  return out.sort((a, b) => b.y + b.height / 2 - (a.y + a.height / 2));
}

export function rowColumns(row: TextItem[]): string[] {
  const cols: string[] = [];
  let column = 0,
    current = "",
    right = 0;
  const flush = () => {
    if (current) {
      cols[column++] = current;
    }
  };
  for (const item of row) {
    const gap = item.x - right;
    if (current && gap > Math.max(12, (item.width / Math.max(1, item.str.length)) * 2)) {
      flush();
      current = "";
    }
    current += (current ? " " : "") + item.str;
    right = item.x + item.width;
  }
  flush();
  return cols;
}

function rowRuns(row: TextItem[]): TextRun[] {
  const runs: TextRun[] = [];
  for (const item of row) {
    const last = runs[runs.length - 1];
    if (last && last.bold === item.bold && last.italic === item.italic)
      last.text += (last.text && !last.text.endsWith(" ") ? " " : "") + item.str;
    else runs.push({ text: item.str, bold: item.bold, italic: item.italic });
  }
  return runs.map((r) => ({ ...r, text: r.text.replace(/\s+/g, " ").trim() }));
}

function rowSize(row: TextItem[]) {
  let best = row[0];
  for (const item of row) if (item.str.length > best.str.length) best = item;
  return best.size;
}

function medianSize(rows: TextItem[][]) {
  const sizes = rows.flat().map((i) => i.size);
  if (!sizes.length) return 12;
  sizes.sort((a, b) => a - b);
  return sizes[Math.floor(sizes.length / 2)];
}

const BULLET = /^\s*(•|·|▪|◦|○|–|-|−|\*)\s+/;
const ORDERED = /^\s*(\d{1,3}|[a-zA-Z])\s*[.)]\s+/;
const TERMINAL = /[.!?…:;\u201d\u2019"'”’)\]]$/;

export type PlacedImage = { yc: number; index: number; alt: string };

export function buildBlocks(
  rows: TextItem[][],
  ruled?: Map<number, string[]>,
  placed?: PlacedImage[],
): TextBlock[] {
  const median = medianSize(rows);
  type Row = {
    text: string;
    cols: string[];
    size: number;
    runs: TextRun[];
    kind: "table" | "heading" | "list" | "para";
    level: 1 | 2 | 3;
    ordered: boolean;
  };
  const parsed: Row[] = rows.map((row, rowIndex) => {
    const text = row
      .map((item) => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const cols = ruled?.get(rowIndex) ?? rowColumns(row),
      size = rowSize(row);
    let kind: Row["kind"] = "para",
      level: 1 | 2 | 3 = 3,
      ordered = false;
    if (ruled?.has(rowIndex)) kind = "table";
    else if (cols.length >= 2) kind = "table";
    else if (text.length >= 2 && text.length <= 140 && size >= median * 1.28) {
      kind = "heading";
      level = size >= median * 1.75 ? 1 : size >= median * 1.45 ? 2 : 3;
    } else if (ORDERED.test(text)) {
      kind = "list";
      ordered = true;
    } else if (BULLET.test(text)) kind = "list";
    return { text, cols, size, runs: rowRuns(row), kind, level, ordered };
  });
  const blocks: TextBlock[] = [];
  let i = 0;
  const queue = [...(placed ?? [])].sort((a, b) => b.yc - a.yc);
  let nextImage = 0;
  const flushImages = (beforeY: number) => {
    while (nextImage < queue.length && queue[nextImage].yc > beforeY) {
      const image = queue[nextImage++];
      blocks.push({ type: "image", index: image.index, alt: image.alt });
    }
  };
  const stripMarker = (text: string) => text.replace(BULLET, "").replace(ORDERED, "").trim();
  while (i < parsed.length) {
    flushImages(rows[i][0]?.y ?? -Infinity);
    const row = parsed[i];
    if (row.kind === "table") {
      const group: Row[] = [row];
      while (i + group.length < parsed.length && parsed[i + group.length].kind === "table")
        group.push(parsed[i + group.length]);
      if (group.length >= 2) {
        const width = Math.max(...group.map((r) => r.cols.length));
        blocks.push({
          type: "table",
          grid: group.map((r) => Array.from({ length: width }, (_, c) => r.cols[c] || "")),
        });
      } else {
        blocks.push({ type: "paragraph", text: row.cols.join("  "), runs: row.runs });
      }
      i += group.length;
      continue;
    }
    if (row.kind === "list") {
      const group: Row[] = [row];
      while (i + group.length < parsed.length && parsed[i + group.length].kind === "list")
        group.push(parsed[i + group.length]);
      blocks.push({
        type: "list",
        ordered: group.filter((r) => r.ordered).length >= group.length / 2,
        items: group.map((r) => stripMarker(r.text)),
      });
      i += group.length;
      continue;
    }
    if (row.kind === "heading") {
      blocks.push({ type: "heading", level: row.level, text: row.text });
      i++;
      continue;
    }
    const runs: TextRun[] = [...row.runs];
    let text = row.text,
      j = i + 1;
    while (j < parsed.length && parsed[j].kind === "para") {
      const next = parsed[j];
      const continues = /^[a-z\u00e0-\u00ff]/.test(next.text);
      if (!TERMINAL.test(text) && (continues || text.length > 50)) {
        text += ` ${next.text}`;
        for (const run of next.runs) {
          const last = runs[runs.length - 1];
          if (last && last.bold === run.bold && last.italic === run.italic)
            last.text += ` ${run.text}`;
          else runs.push({ ...run });
        }
        j++;
      } else break;
    }
    blocks.push({ type: "paragraph", text, runs });
    i = j;
  }
  flushImages(-Infinity);
  return blocks;
}

export async function pdfToText(bytes: Uint8Array, signal?: AbortSignal) {
  const pages = await extractTextPages(bytes, signal);
  if (!pages.some((p) => p.lines.length))
    throw new PdfError("No selectable text was found. Use OCR for scanned documents.", "NO_TEXT");
  return pages.map((p) => p.lines.join("\n")).join("\n\n― page break ―\n\n");
}

export async function pdfToDocx(bytes: Uint8Array, signal?: AbortSignal, env?: CanvasEnv) {
  const pages = await extractTextPages(bytes, signal, env);
  if (!pages.some((p) => p.lines.length))
    throw new PdfError("No editable text was found. Run OCR before PDF to Word.", "NO_TEXT");
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    PageBreak,
    ImageRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
  } = await import("docx");
  const border = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };
  const children: InstanceType<typeof Paragraph | typeof Table>[] = [];
  const para = (p: InstanceType<typeof Paragraph>) => children.push(p as never);
  for (let i = 0; i < pages.length; i++) {
    if (i) children.push(new Paragraph({ children: [new PageBreak()] }) as never);
    const blocks = pages[i].blocks,
      images = pages[i].images;
    if (!blocks.length)
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "[This page has no selectable text. OCR may be needed.]",
              italics: true,
            }),
          ],
        }) as never,
      );
    for (const block of blocks) {
      if (block.type === "heading")
        para(
          new Paragraph({
            heading:
              block.level === 1
                ? HeadingLevel.HEADING_1
                : block.level === 2
                  ? HeadingLevel.HEADING_2
                  : HeadingLevel.HEADING_3,
            children: [
              new TextRun({
                text: block.text,
                bold: true,
                size: block.level === 1 ? 32 : block.level === 2 ? 28 : 26,
              }),
            ],
          }),
        );
      else if (block.type === "paragraph")
        para(
          new Paragraph({
            spacing: { after: 100 },
            children: block.runs.map(
              (run) =>
                new TextRun({
                  text: run.text,
                  bold: run.bold || undefined,
                  italics: run.italic || undefined,
                  size: 22,
                }),
            ),
          }),
        );
      else if (block.type === "list")
        block.items.forEach((item, index) =>
          para(
            new Paragraph({
              indent: { left: 360 },
              children: [
                new TextRun({
                  text: `${block.ordered ? `${index + 1}.` : "•"}  ${item}`,
                  size: 22,
                }),
              ],
            }),
          ),
        );
      else if (block.type === "image") {
        const image = images[block.index];
        if (image?.png) {
          const scale = Math.min(1, 450 / Math.max(1, image.width)),
            width = Math.max(1, Math.round(image.width * scale * (96 / 72))),
            height = Math.max(1, Math.round(image.height * scale * (96 / 72)));
          para(
            new Paragraph({
              children: [
                new ImageRun({ type: "png", data: image.png, transformation: { width, height } }),
              ],
            }),
          );
        } else
          para(
            new Paragraph({
              children: [
                new TextRun({ text: `[${block.alt} could not be embedded.]`, italics: true }),
              ],
            }),
          );
      } else if (block.grid.length)
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: block.grid.map(
              (cells) =>
                new TableRow({
                  children: cells.map(
                    (cell) =>
                      new TableCell({
                        borders: cellBorders,
                        children: [
                          new Paragraph({
                            children: [new TextRun({ text: cell, size: 20 })],
                          }),
                        ],
                      }),
                  ),
                }),
            ),
          }),
        );
    }
  }
  return new Uint8Array(
    await Packer.toBuffer(
      new Document({
        creator: "PDFORGE",
        title: "Editable text from PDF",
        sections: [{ children }],
      }),
    ),
  );
}

function mdRuns(runs: TextRun[]) {
  return runs
    .map((run) => {
      if (!run.text) return "";
      if (run.bold && run.italic) return `***${run.text}***`;
      if (run.bold) return `**${run.text}**`;
      if (run.italic) return `*${run.text}*`;
      return run.text;
    })
    .join(" ");
}

export async function pdfToMarkdown(bytes: Uint8Array, signal?: AbortSignal, env?: CanvasEnv) {
  const pages = await extractTextPages(bytes, signal, env);
  if (!pages.some((p) => p.blocks.some((b) => b.type !== "image")))
    throw new PdfError("No selectable text was found. Use OCR for scanned documents.", "NO_TEXT");
  const out: string[] = [];
  pages.forEach((page, index) => {
    if (index) out.push("---");
    for (const block of page.blocks) {
      if (block.type === "heading") out.push(`${"#".repeat(block.level)} ${block.text}`);
      else if (block.type === "paragraph") out.push(mdRuns(block.runs));
      else if (block.type === "list")
        out.push(block.items.map((t, i) => `${block.ordered ? `${i + 1}.` : "-"} ${t}`).join("\n"));
      else if (block.type === "image") {
        const png = page.images[block.index]?.png,
          alt = block.alt.replace(/[[()\]]/g, "");
        if (png && png.length <= 300000) {
          let binary = "";
          for (let k = 0; k < png.length; k++) binary += String.fromCharCode(png[k]);
          out.push(`![${alt}](data:image/png;base64,${btoa(binary)})`);
        } else out.push(`*[Image: ${alt}]*`);
      } else if (block.grid.length) {
        const cells = block.grid.map((row) => row.map((c) => c.replace(/\|/g, "\\|")));
        const lines = [
          `| ${cells[0].join(" | ")} |`,
          `| ${cells[0].map(() => "---").join(" | ")} |`,
        ];
        for (const row of cells.slice(1)) lines.push(`| ${row.join(" | ")} |`);
        out.push(lines.join("\n"));
      }
    }
  });
  return `${out.join("\n\n")}\n`;
}

function blocksToGrid(blocks: TextBlock[]): string[][] {
  const grid: string[][] = [];
  for (const block of blocks) {
    if (block.type === "table") grid.push(...block.grid);
    else if (block.type === "list")
      block.items.forEach((item, i) => grid.push([`${block.ordered ? `${i + 1}.` : "•"} ${item}`]));
    else if (block.type === "image") grid.push([`[Image: ${block.alt}]`]);
    else grid.push([block.text]);
  }
  return grid;
}

export async function pdfToXlsx(bytes: Uint8Array, signal?: AbortSignal) {
  const pages = await extractTextPages(bytes, signal);
  if (!pages.some((p) => p.blocks.some((b) => b.type !== "image")))
    throw new PdfError(
      "No selectable text was found. Use OCR before extracting a spreadsheet.",
      "NO_TEXT",
    );
  const result = await buildXlsx(
    pages.map((page) => ({ name: `Page ${page.page}`, grid: blocksToGrid(page.blocks) })),
  );
  return { ...result, sheets: pages.length };
}

export function csvCell(value: string) {
  const safe = /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function pdfToCsv(bytes: Uint8Array, signal?: AbortSignal) {
  const pages = await extractTextPages(bytes, signal);
  if (!pages.some((p) => p.rows.length))
    throw new PdfError("No selectable text was found. Use OCR before extracting CSV.", "NO_TEXT");
  const records: string[][] = [["page", "row", "column", "text"]];
  for (const page of pages)
    page.rows.forEach((row, index) => {
      (page.ruledCols.get(index) ?? rowColumns(row)).forEach((cell, column) =>
        records.push([String(page.page), String(index + 1), String(column + 1), cell]),
      );
    });
  return "\uFEFF" + records.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

const STOPWORDS = new Set(
  `a,an,the,and,or,but,of,to,in,on,for,with,at,by,from,as,is,are,was,were,be,been,being,have,has,had,do,does,did,will,would,can,could,should,may,might,must,shall,this,that,these,those,it,its,they,them,their,there,here,when,where,which,who,whom,what,how,not,no,yes,all,any,each,every,some,more,most,other,such,into,than,then,also,just,over,under,again,once,per,via,within,without,between,september,october,november,december,january,february,march,april,june,july,august,monday,tuesday,wednesday,thursday,friday,saturday,sunday,का,के,की,को,से,में,ने,पर,है,हैं,था,थे,थी,और,या,लेकिन,जो,यह,वह,ये,वे,का,इस,उस,नहीं,भी,तो,तक,लिए,साथ,द्वारा,गया,गई,गए,हो,होता,होती,होते,किया,किए,रहा,रही,रहे,वाला,वाली,वाले`.split(
    ",",
  ),
);

export function extractiveSummary(
  text: string,
  maxSentences: number,
): { summary: string; picked: number; total: number } {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return { summary: "", picked: 0, total: 0 };
  const raw =
    clean
      .match(/[^.!?…]+[.!?…]+["”'’)]?|.+$/g)
      ?.map((s) => s.trim())
      .filter(Boolean) ?? [];
  const sentences = (raw.length > 1 ? raw : raw).filter((s) => s.length >= 12);
  const pool = sentences.length ? sentences : raw;
  if (!pool.length) return { summary: "", picked: 0, total: 0 };
  const freq = new Map<string, number>();
  for (const word of clean
    .toLowerCase()
    .split(/[^a-z\u0900-\u097fa-z0-9']+/i)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w)))
    freq.set(word, (freq.get(word) ?? 0) + 1);
  const scored = pool.map((sentence, index) => {
    const words = sentence
      .toLowerCase()
      .split(/[^a-z\u0900-\u097f0-9']+/i)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
    const base = words.reduce((sum, w) => sum + (freq.get(w) ?? 0), 0);
    const score = words.length ? base / Math.sqrt(words.length) : 0;
    return { sentence, index, score: index < 3 ? score * 1.25 : score };
  });
  const picked = scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(1, maxSentences))
    .sort((a, b) => a.index - b.index);
  return {
    summary: picked.map((p) => p.sentence).join(" "),
    picked: picked.length,
    total: pool.length,
  };
}

const SUMMARY_SENTENCES = { short: 3, medium: 6, long: 10 } as const;

export async function pdfSummary(
  bytes: Uint8Array,
  level: keyof typeof SUMMARY_SENTENCES = "medium",
  signal?: AbortSignal,
) {
  const pages = await extractTextPages(bytes, signal);
  const text = pages
    .map((p) => p.lines.join(" "))
    .join("\n")
    .trim();
  if (!text)
    throw new PdfError("No selectable text was found. Use OCR for scanned documents.", "NO_TEXT");
  const truncated = text.length > 500000;
  const result = extractiveSummary(
    text.slice(0, 500000),
    SUMMARY_SENTENCES[level] ?? SUMMARY_SENTENCES.medium,
  );
  return { ...result, truncated };
}

export function inspectDocxZip(bytes: Uint8Array) {
  return inspectOfficeZip(bytes, {
    required: "word/document.xml",
    container: "DOCX",
    document: "The archive does not contain a Word document.",
    archive: "DOCX",
  });
}

type OutRun = { text: string; bold: boolean; italic: boolean };
type OutBlock =
  | { kind: "heading"; level: 1 | 2 | 3; runs: OutRun[] }
  | { kind: "para"; runs: OutRun[]; align: "left" | "center" | "right"; quote: boolean }
  | { kind: "bullet"; runs: OutRun[]; marker: string; level: number }
  | { kind: "table"; grid: string[][]; header: boolean }
  | { kind: "image"; data: Uint8Array; png: boolean; width: number; height: number };

type BlockFonts = {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  text: PDFFont;
  devanagari: PDFFont | null;
};

async function layoutFonts(allText: string): Promise<BlockFonts> {
  const { PDFDocument } = await import("pdf-lib");
  const { embedTextFont } = await import("./fonts");
  const probe = await PDFDocument.create();
  const regular = await embedTextFont(probe, "az AZ 09"),
    bold = await embedTextFont(probe, "az AZ 09", true);
  let italic = regular;
  try {
    const { StandardFonts } = await import("pdf-lib");
    italic = await probe.embedFont(StandardFonts.HelveticaOblique);
  } catch {
    italic = regular;
  }
  let text = regular,
    devanagari: PDFFont | null = null;
  if (/[^\x00-\x7f]/.test(allText)) {
    text = await embedTextFont(probe, allText);
    if (/[\u0900-\u097f]/.test(allText)) devanagari = text;
  }
  return { regular, bold, italic, text, devanagari };
}

function pickFont(fonts: BlockFonts, run: OutRun): PDFFont {
  if (/[^\x00-\x7f]/.test(run.text)) {
    if (/[\u0900-\u097f]/.test(run.text) && fonts.devanagari) return fonts.devanagari;
    return fonts.text;
  }
  if (run.bold) return fonts.bold;
  if (run.italic) return fonts.italic;
  return fonts.regular;
}

export async function writeBlocksPdf(
  title: string,
  blocks: OutBlock[],
  producer: string,
  signal?: AbortSignal,
) {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const allText = blocks
    .map((b) =>
      b.kind === "table"
        ? b.grid.flat().join(" ")
        : b.kind === "image"
          ? ""
          : b.runs.map((r) => r.text).join(" "),
    )
    .join("\n");
  if (!allText.trim()) throw new PdfError("This document has no supported text content.", "INPUT");
  const fonts = await layoutFonts(allText);
  const doc = await PDFDocument.create();
  const needs = { bold: false, italic: false, text: false, devanagari: false };
  for (const block of blocks) {
    if (block.kind === "table" || block.kind === "image") continue;
    for (const run of block.runs) {
      if (/[^\x00-\x7f]/.test(run.text)) {
        needs.text = true;
        if (/[\u0900-\u097f]/.test(run.text)) needs.devanagari = true;
      } else if (run.bold) needs.bold = true;
      else if (run.italic) needs.italic = true;
    }
  }
  const { embedTextFont } = await import("./fonts");
  const { StandardFonts } = await import("pdf-lib");
  const regular = await embedTextFont(doc, "az AZ 09");
  const bold = needs.bold ? await embedTextFont(doc, "az AZ 09", true) : regular;
  let italic = regular;
  if (needs.italic) {
    try {
      italic = await doc.embedFont(StandardFonts.HelveticaOblique);
    } catch {
      italic = regular;
    }
  }
  let text = regular;
  if (needs.text) text = await embedTextFont(doc, allText);
  const live: BlockFonts = {
    regular,
    bold,
    italic,
    text,
    devanagari: needs.devanagari ? text : null,
  };
  doc.setTitle(title.slice(0, 200));
  doc.setProducer(producer);
  const pageWidth = 595.28,
    pageHeight = 841.89,
    margin = 56,
    maxWidth = pageWidth - margin * 2;
  let page = doc.addPage([pageWidth, pageHeight]),
    y = pageHeight - margin;
  let pageCount = 1;
  const need = (height: number) => {
    if (y - height < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      if (++pageCount > 2000)
        throw new PdfError("This document is too long to convert. Split it first.", "LIMIT");
    }
  };
  const drawWrapped = (
    runs: OutRun[],
    opts: { size: number; indent: number; color: { r: number; g: number; b: number } },
  ) => {
    const words: { word: string; font: PDFFont }[] = [];
    for (const run of runs)
      for (const piece of run.text.replace(/\t/g, "    ").split(/(\s+)/)) {
        if (!piece) continue;
        if (/^\s+$/.test(piece)) {
          if (piece.includes("\n")) words.push({ word: "\n", font: pickFont(live, run) });
          continue;
        }
        words.push({ word: piece, font: pickFont(live, run) });
      }
    const lineHeight = opts.size * 1.4;
    let line: { word: string; font: PDFFont }[] = [],
      width = 0;
    const space = live.regular.widthOfTextAtSize(" ", opts.size);
    const paint = (flushLine: { word: string; font: PDFFont }[]) => {
      if (!flushLine.length) return;
      need(lineHeight + 2);
      let x = margin + opts.indent;
      for (const w of flushLine) {
        page.drawText(w.word, {
          x,
          y: y - opts.size,
          size: opts.size,
          font: w.font,
          color: rgb(opts.color.r, opts.color.g, opts.color.b),
        });
        x += w.font.widthOfTextAtSize(w.word, opts.size) + space;
      }
      y -= lineHeight;
    };
    for (const w of words) {
      if (w.word === "\n") {
        paint(line);
        line = [];
        width = 0;
        continue;
      }
      const wWidth = w.font.widthOfTextAtSize(w.word, opts.size);
      if (width + wWidth > maxWidth - opts.indent && line.length) {
        paint(line);
        line = [];
        width = 0;
      }
      if (wWidth > maxWidth - opts.indent) {
        let chunk = "";
        for (const ch of w.word) {
          const trial = chunk + ch;
          if (live.regular.widthOfTextAtSize(trial, opts.size) > maxWidth - opts.indent && chunk) {
            paint([{ word: chunk, font: w.font }]);
            chunk = "";
          }
          chunk += ch;
        }
        if (chunk) {
          line.push({ word: chunk, font: w.font });
          width += w.font.widthOfTextAtSize(chunk, opts.size) + space;
        }
        continue;
      }
      line.push(w);
      width += wWidth + space;
    }
    if (line.length) paint(line);
  };
  const drawTable = (grid: string[][], header: boolean) => {
    if (!grid.length) return;
    const size = 10,
      pad = 5,
      cols = Math.max(...grid.map((r) => r.length));
    const widths = Array.from({ length: cols }, (_, c) => {
      let w = 30;
      for (const row of grid) {
        const cell = row[c] || "";
        for (const part of cell.split("\n"))
          w = Math.max(w, Math.min(260, live.regular.widthOfTextAtSize(part, size) + pad * 2));
      }
      return w;
    });
    const total = widths.reduce((a, b) => a + b, 0);
    const scale = total > maxWidth ? maxWidth / total : 1;
    for (let i = 0; i < widths.length; i++) widths[i] *= scale;
    const lineHeight = size * 1.35;
    grid.forEach((row, r) => {
      checkAbort(signal);
      const cellLines = Array.from({ length: cols }, (_, c) => {
        const lines: string[] = [];
        for (const part of (row[c] || "").split("\n")) {
          let current = "";
          for (const word of part.split(/ +/).filter(Boolean)) {
            const trial = current ? `${current} ${word}` : word;
            if (live.regular.widthOfTextAtSize(trial, size) <= widths[c] - pad * 2) current = trial;
            else {
              if (current) lines.push(current);
              current = word;
            }
          }
          lines.push(current);
        }
        return lines.length ? lines : [""];
      });
      const rowHeight = Math.max(...cellLines.map((l) => l.length)) * lineHeight + pad * 2;
      need(rowHeight + 4);
      if (r === 0 && header) {
        page.drawRectangle({
          x: margin,
          y: y - rowHeight,
          width: maxWidth,
          height: rowHeight,
          color: rgb(0.93, 0.95, 0.9),
        });
      }
      let x = margin;
      cellLines.forEach((lines, c) => {
        page.drawRectangle({
          x,
          y: y - rowHeight,
          width: widths[c],
          height: rowHeight,
          borderColor: rgb(0.6, 0.63, 0.66),
          borderWidth: 0.7,
        });
        lines.forEach((text, li) => {
          if (!text) return;
          page.drawText(text, {
            x: x + pad,
            y: y - pad - size - li * lineHeight,
            size,
            font: r === 0 && header ? bold : regular,
            color: rgb(0.1, 0.12, 0.14),
          });
        });
        x += widths[c];
      });
      y -= rowHeight;
    });
    y -= 8;
  };
  for (const block of blocks) {
    checkAbort(signal);
    if (block.kind === "heading") {
      const size = block.level === 1 ? 20 : block.level === 2 ? 16 : 13;
      y -= 8;
      drawWrapped(
        block.runs.map((r) => ({ ...r, bold: true })),
        { size, indent: 0, color: { r: 0.1, g: 0.25, b: 0.16 } },
      );
      y -= 6;
    } else if (block.kind === "para") {
      if (block.quote) {
        const size = 11;
        const startY = y;
        drawWrapped(block.runs, { size, indent: 26, color: { r: 0.3, g: 0.33, b: 0.36 } });
        page.drawRectangle({
          x: margin + 12,
          y,
          width: 2.5,
          height: Math.max(8, startY - y),
          color: rgb(0.6, 0.68, 0.6),
        });
      } else if (block.align !== "left") {
        const text = block.runs.map((r) => r.text).join(" ");
        const size = 11;
        const width = Math.min(maxWidth, live.regular.widthOfTextAtSize(text.slice(0, 200), size));
        const indent = block.align === "center" ? (maxWidth - width) / 2 : maxWidth - width;
        drawWrapped(block.runs, {
          size,
          indent: Math.max(0, indent),
          color: { r: 0.1, g: 0.12, b: 0.14 },
        });
      } else {
        drawWrapped(block.runs, { size: 11, indent: 0, color: { r: 0.1, g: 0.12, b: 0.14 } });
      }
      y -= 6;
    } else if (block.kind === "bullet") {
      drawWrapped([{ text: block.marker, bold: false, italic: false }, ...block.runs], {
        size: 11,
        indent: 18 + block.level * 16,
        color: { r: 0.1, g: 0.12, b: 0.14 },
      });
      y -= 4;
    } else if (block.kind === "table") {
      y -= 4;
      drawTable(block.grid, block.header);
    } else if (block.kind === "image") {
      const availW = maxWidth,
        availH = pageHeight - margin * 2;
      const scale = Math.min(availW / block.width, availH / block.height, 1);
      const w = Math.max(1, block.width * scale),
        h = Math.max(1, block.height * scale);
      need(h + 8);
      try {
        const embedded = block.png
          ? await doc.embedPng(block.data)
          : await doc.embedJpg(block.data);
        page.drawImage(embedded, { x: margin + (availW - w) / 2, y: y - h, width: w, height: h });
        y -= h + 8;
      } catch {
        y -= 2;
      }
    }
  }
  return doc.save();
}

export async function xlsxToPdf(bytes: Uint8Array, signal?: AbortSignal) {
  const data: XlsxData = await readXlsx(bytes);
  checkAbort(signal);
  const blocks: OutBlock[] = [];
  let skipped = 0;
  for (const sheet of data.sheets) {
    if (!sheet.grid.length) {
      skipped++;
      continue;
    }
    blocks.push({
      kind: "heading",
      level: 2,
      runs: [{ text: sheet.name, bold: true, italic: false }],
    });
    blocks.push({ kind: "table", grid: sheet.grid, header: true });
  }
  if (!blocks.length) throw new PdfError("No cell values were found in this workbook.", "NO_TEXT");
  const warnings: string[] = [];
  if (data.truncated)
    warnings.push("The workbook exceeded the 250,000-cell safety budget; later rows were skipped.");
  if (skipped)
    warnings.push(`${skipped} empty ${skipped === 1 ? "sheet was" : "sheets were"} skipped.`);
  warnings.push(
    "Simplified table layout: merged cells, charts, images and custom number formats are not reproduced.",
  );
  return {
    bytes: await writeBlocksPdf(
      "Excel workbook",
      blocks,
      "PDFORGE text-first XLSX conversion",
      signal,
    ),
    warnings,
  };
}

type DocxListFormat = { ordered: boolean };

function parseNumbering(numberingXml: string) {
  const abstract = new Map<string, Map<string, DocxListFormat>>();
  for (const m of numberingXml.matchAll(
    /<w:abstractNum[^>]*w:abstractNumId="(\d+)"[^>]*>([\s\S]*?)<\/w:abstractNum>/g,
  )) {
    const levels = new Map<string, DocxListFormat>();
    for (const lvl of m[2].matchAll(/<w:lvl[^>]*w:ilvl="(\d+)"[^>]*>([\s\S]*?)<\/w:lvl>/g)) {
      const fmt = /<w:numFmt[^>]*w:val="([^"]+)"/.exec(lvl[2])?.[1] ?? "decimal";
      levels.set(lvl[1], { ordered: fmt !== "bullet" });
    }
    abstract.set(m[1], levels);
  }
  const nums = new Map<string, string>();
  for (const m of numberingXml.matchAll(/<w:num[^>]*w:numId="(\d+)"[^>]*>([\s\S]*?)<\/w:num>/g)) {
    const id = /<w:abstractNumId[^>]*w:val="(\d+)"/.exec(m[2])?.[1];
    if (id) nums.set(m[1], id);
  }
  return { abstract, nums };
}

function splitElements(body: string, tag: "p" | "tbl" | "tr" | "tc"): string[] {
  const out: string[] = [];
  const openTag = `<w:${tag}`,
    closeTag = `</w:${tag}>`;
  const openRe = new RegExp(`<w:${tag}(?=[\\s>])`, "g");
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = openRe.exec(body)) && guard++ < 60000) {
    let depth = 0,
      j = m.index;
    while (guard++ < 200000) {
      const nextOpen = body.indexOf(openTag, j);
      const nextClose = body.indexOf(closeTag, j);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) {
        // A longer tag name (<w:tblPr>) is not a nested element; skip past it.
        if (/[\s>]/.test(body[nextOpen + openTag.length] || "")) {
          const end = body.indexOf(">", nextOpen + openTag.length);
          if (end >= 0 && body[end - 1] === "/") j = end + 1;
          else {
            depth++;
            j = nextOpen + openTag.length;
          }
        } else j = nextOpen + openTag.length;
      } else {
        depth--;
        j = nextClose + closeTag.length;
        if (depth <= 0) {
          out.push(body.slice(m.index, j));
          openRe.lastIndex = j;
          break;
        }
      }
    }
  }
  return out;
}

function splitTopLevel(body: string, tag: "p" | "tbl"): { index: number; xml: string }[] {
  const out: { index: number; xml: string }[] = [];
  const openRe = new RegExp(`<w:${tag}(?=[\\s>])`, "g");
  const closeTag = `</w:${tag}>`;
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = openRe.exec(body)) && guard++ < 60000) {
    // Skip nested matches already consumed by an earlier element.
    if (out.length && m.index < out[out.length - 1].index + out[out.length - 1].xml.length)
      continue;
    const openTag = `<w:${tag}`;
    let depth = 0,
      j = m.index;
    while (guard++ < 200000) {
      const nextOpen = body.indexOf(openTag, j);
      const nextClose = body.indexOf(closeTag, j);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) {
        // A longer tag name (<w:tblPr>) is not a nested element; skip past it.
        if (/[\s>]/.test(body[nextOpen + openTag.length] || "")) {
          const end = body.indexOf(">", nextOpen + openTag.length);
          if (end >= 0 && body[end - 1] === "/") j = end + 1;
          else {
            depth++;
            j = nextOpen + openTag.length;
          }
        } else j = nextOpen + openTag.length;
      } else {
        depth--;
        j = nextClose + closeTag.length;
        if (depth <= 0) {
          out.push({ index: m.index, xml: body.slice(m.index, j) });
          openRe.lastIndex = j;
          break;
        }
      }
    }
  }
  return out;
}

function parseDocxParagraph(xml: string) {
  const style = /<w:pStyle[^>]*w:val="([^"]+)"/.exec(xml)?.[1] ?? "";
  const align = /<w:jc[^>]*w:val="([^"]+)"/.exec(xml)?.[1] ?? "left";
  const numId = /<w:numId[^>]*w:val="([^"]+)"/.exec(xml)?.[1] ?? "";
  const ilvl = Number(/<w:ilvl[^>]*w:val="([^"]+)"/.exec(xml)?.[1] ?? "0");
  const runs: OutRun[] = [];
  const images: string[] = [];
  for (const m of xml.matchAll(/<w:r(?=[\s>])([\s\S]*?)<\/w:r>/g)) {
    const runXml = m[1];
    for (const img of runXml.matchAll(/<a:blip[^>]*r:embed="(rId\d+)"/g)) images.push(img[1]);
    const bold = /<w:b(?=[\s/>])/.test(runXml),
      italic = /<w:i(?=[\s/>])/.test(runXml);
    let text = "";
    for (const t of runXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)) text += xmlDecode(t[1]);
    text = text.replace(/\u00a0/g, " ");
    const tabs = (runXml.match(/<w:tab(?=[\s/>])/g) || []).length;
    if (tabs) text += "    ".repeat(Math.min(tabs, 8));
    if (/<w:br(?=[\s/>])/.test(runXml)) text += "\n";
    if (text) {
      const last = runs[runs.length - 1];
      if (last && last.bold === bold && last.italic === italic) last.text += text;
      else runs.push({ text, bold, italic });
    }
    if (images.length >= 50) break;
    if (runs.length > 2000) break;
  }
  return { style, align, numId, ilvl, runs, images };
}

function parseDocxCell(cellXml: string): string {
  const parts: string[] = [];
  for (const xml of splitElements(cellXml, "p")) {
    const parsed = parseDocxParagraph(xml);
    const text = parsed.runs.map((r) => r.text).join("");
    if (text.trim()) parts.push(text.replace(/\s+/g, " ").trim());
  }
  return parts.join("\n").slice(0, 50000);
}

export async function docxTextToPdf(bytes: Uint8Array, signal?: AbortSignal) {
  inspectDocxZip(bytes);
  checkAbort(signal);
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(bytes);
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) throw new PdfError("The Word document has no readable content.", "INVALID");
  const relsXml = (await zip.file("word/_rels/document.xml.rels")?.async("string")) ?? "";
  const rels = new Map<string, string>();
  for (const m of relsXml.matchAll(/<Relationship[^>]*Id="(rId\d+)"[^>]*Target="([^"]+)"/g))
    rels.set(m[1], m[2]);
  const numberingXml = (await zip.file("word/numbering.xml")?.async("string")) ?? "";
  const numbering = parseNumbering(numberingXml);
  const body = /<w:body[^>]*>([\s\S]*)<\/w:body>/.exec(docXml)?.[1] ?? docXml;
  const paras = splitTopLevel(body, "p").map((p) => ({ ...p, kind: "p" as const }));
  const tables = splitTopLevel(body, "tbl").map((t) => ({ ...t, kind: "tbl" as const }));
  // Drop paragraphs that live inside tables; table cells are parsed separately.
  const tableRanges = tables.map((t) => [t.index, t.index + t.xml.length]);
  const topParas = paras.filter((p) => !tableRanges.some(([a, b]) => p.index > a && p.index < b));
  const ordered = [...topParas, ...tables].sort((a, b) => a.index - b.index);
  if (ordered.length > 22000)
    throw new PdfError("This document has too many paragraphs to convert.", "LIMIT");
  const blocks: OutBlock[] = [];
  const warnings: string[] = [];
  const counters = new Map<string, number>();
  let skippedImages = 0,
    truncatedCells = 0;
  const imageCache = new Map<string, Uint8Array>();
  for (const el of ordered) {
    checkAbort(signal);
    if (el.kind === "tbl") {
      const grid: string[][] = [];
      for (const rowXml of splitElements(el.xml, "tr").slice(0, 2000)) {
        const cells: string[] = [];
        for (const cellXml of splitElements(rowXml, "tc")) {
          const span = Math.min(
            12,
            Number(/<w:gridSpan[^>]*w:val="(\d+)"/.exec(cellXml)?.[1] ?? "1"),
          );
          const text = parseDocxCell(cellXml);
          if (text.length >= 50000) truncatedCells++;
          cells.push(text);
          for (let s = 1; s < span && cells.length < 24; s++) cells.push("");
          if (cells.length >= 24) break;
        }
        if (cells.length) grid.push(cells.slice(0, 24));
      }
      if (grid.length) {
        const width = Math.max(...grid.map((r) => r.length));
        blocks.push({
          kind: "table",
          grid: grid.map((r) => Array.from({ length: width }, (_, i) => r[i] || "")),
          header: false,
        });
      }
      continue;
    }
    const parsed = parseDocxParagraph(el.xml);
    for (const rid of parsed.images) {
      const target = rels.get(rid) ?? "";
      const name = target.startsWith("media/") ? `word/${target}` : target;
      const lower = name.toLowerCase();
      const supported = lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg");
      const entry = supported ? zip.file(name) : null;
      if (!entry) {
        skippedImages++;
        continue;
      }
      try {
        let data = imageCache.get(name);
        if (!data) {
          data = await entry.async("uint8array");
          if (data.length > 30 * 1024 * 1024) {
            skippedImages++;
            continue;
          }
          imageCache.set(name, data);
        }
        const { imageDimensions } = await import("./imageHeader");
        const dims = imageDimensions(data);
        blocks.push({
          kind: "image",
          data,
          png: lower.endsWith(".png"),
          width: dims.width,
          height: dims.height,
        });
      } catch {
        skippedImages++;
      }
      if (blocks.length > 24000) break;
    }
    const text = parsed.runs.map((r) => r.text).join("");
    if (!text.trim()) continue;
    const style = parsed.style.toLowerCase();
    if (/^heading\s?([1-3])/.test(style) || style === "title") {
      const level =
        style === "title" ? 1 : (Number(style.replace(/[^0-9]/g, "") || "1") as 1 | 2 | 3);
      blocks.push({ kind: "heading", level: Math.min(3, level) as 1 | 2 | 3, runs: parsed.runs });
    } else if (parsed.numId && parsed.numId !== "0") {
      const abs = numbering.nums.get(parsed.numId);
      const fmt = abs ? numbering.abstract.get(abs)?.get(String(parsed.ilvl)) : undefined;
      const orderedList = fmt ? fmt.ordered : true;
      const key = `${parsed.numId}:${parsed.ilvl}`;
      const n = (counters.get(key) ?? 0) + 1;
      counters.set(key, n);
      blocks.push({
        kind: "bullet",
        runs: parsed.runs,
        marker: orderedList ? `${n}.` : "•",
        level: Math.min(8, parsed.ilvl),
      });
    } else if (style.includes("quote")) {
      blocks.push({ kind: "para", runs: parsed.runs, align: "left", quote: true });
    } else {
      const align = parsed.align === "center" || parsed.align === "right" ? parsed.align : "left";
      blocks.push({ kind: "para", runs: parsed.runs, align, quote: false });
    }
    if (blocks.length > 24000)
      throw new PdfError("This document is too long to convert. Split it first.", "LIMIT");
  }
  if (skippedImages)
    warnings.push(
      `${skippedImages} image${skippedImages === 1 ? " was" : "s were"} skipped (only embedded PNG/JPEG are supported in text mode).`,
    );
  if (truncatedCells) warnings.push("Very long table cells were truncated to 50,000 characters.");
  warnings.push(
    "Simplified layout: headers, footers, floating objects and exact Word pagination are not reproduced.",
  );
  return {
    bytes: await writeBlocksPdf(
      "Word document",
      blocks,
      "PDFORGE text-first DOCX conversion",
      signal,
    ),
    warnings,
  };
}
