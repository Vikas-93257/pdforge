import { DEFAULT_OPTIONS, type ToolOptions } from "./operations";
import { TOOLS } from "./tools";
export const PRESET_STORAGE_KEY = "pdforge.presets.v1";
export const PRESET_PACK_TAG = "pdforge-preset-pack";
export type StoredPreset = {
  id: string;
  tool: string;
  name: string;
  options: Partial<ToolOptions>;
  updatedAt: string;
};
const KNOWN_KEYS = new Set(Object.keys(DEFAULT_OPTIONS));
const BINARY_KEYS = new Set(["signature"]);
const memory = new Map<string, string>();
function storage(): { getItem(k: string): string | null; setItem(k: string, v: string): void } {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    /* private mode etc. falls through to memory */
  }
  return {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => {
      memory.set(k, v);
    },
  };
}
function readAll(): StoredPreset[] {
  try {
    const raw = storage().getItem(PRESET_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is StoredPreset =>
        typeof p === "object" &&
        p !== null &&
        typeof (p as StoredPreset).id === "string" &&
        TOOLS.some((t) => t.slug === (p as StoredPreset).tool) &&
        typeof (p as StoredPreset).name === "string" &&
        typeof (p as StoredPreset).options === "object",
    );
  } catch {
    return [];
  }
}
function writeAll(presets: StoredPreset[]) {
  try {
    storage().setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    throw new Error("Presets could not be saved in this browser (storage is unavailable).");
  }
}
export function clearPresets() {
  writeAll([]);
}
export function loadPresets(tool?: string): StoredPreset[] {
  const all = readAll();
  return tool ? all.filter((p) => p.tool === tool) : all;
}
export function sanitizePresetOptions(options: Partial<ToolOptions>): Partial<ToolOptions> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(options)) {
    if (!KNOWN_KEYS.has(key) || BINARY_KEYS.has(key)) continue;
    clean[key] = JSON.parse(JSON.stringify(value)) as unknown;
  }
  return clean as Partial<ToolOptions>;
}
function checkName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) throw new Error("Name the preset before saving it.");
  if (trimmed.length > 40) throw new Error("Keep preset names to 40 characters.");
  return trimmed;
}
export function savePreset(tool: string, name: string, options: ToolOptions): StoredPreset {
  if (!TOOLS.some((t) => t.slug === tool)) throw new Error(`Unknown tool: ${tool}.`);
  const all = readAll();
  const preset: StoredPreset = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `p-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
    tool,
    name: checkName(name),
    options: sanitizePresetOptions(options),
    updatedAt: new Date().toISOString(),
  };
  writeAll([...all.filter((p) => !(p.tool === tool && p.name === preset.name)), preset]);
  return preset;
}
export function deletePreset(id: string): StoredPreset[] {
  const next = readAll().filter((p) => p.id !== id);
  writeAll(next);
  return next;
}
export function exportPack(tool?: string): string {
  return JSON.stringify(
    {
      app: PRESET_PACK_TAG,
      version: 1,
      exportedAt: new Date().toISOString(),
      presets: loadPresets(tool).map((p) => ({
        tool: p.tool,
        name: p.name,
        options: p.options,
      })),
    },
    null,
    2,
  );
}
export function importPack(text: string): {
  added: StoredPreset[];
  skipped: { name: string; reason: string }[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Import is not valid JSON.");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as { app?: unknown }).app !== PRESET_PACK_TAG ||
    !Array.isArray((parsed as { presets?: unknown }).presets)
  )
    throw new Error("Import is not a PDFORGE preset pack.");
  const all = readAll(),
    added: StoredPreset[] = [],
    skipped: { name: string; reason: string }[] = [];
  for (const entry of (parsed as { presets: unknown[] }).presets) {
    const fail = (reason: string) =>
      skipped.push({
        name:
          typeof entry === "object" && entry !== null
            ? String((entry as { name?: unknown }).name ?? "unnamed")
            : "unnamed",
        reason,
      });
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      fail("entry is not an object");
      continue;
    }
    const { tool, name, options } = entry as Record<string, unknown>;
    if (typeof tool !== "string" || !TOOLS.some((t) => t.slug === tool)) {
      fail(`unknown tool ${JSON.stringify(tool)}`);
      continue;
    }
    if (typeof name !== "string" || !name.trim() || name.trim().length > 40) {
      fail("name must be 1–40 characters");
      continue;
    }
    if (typeof options !== "object" || options === null || Array.isArray(options)) {
      fail("options must be an object");
      continue;
    }
    const clean: Record<string, unknown> = {};
    let bad = "";
    for (const [key, value] of Object.entries(options)) {
      if (BINARY_KEYS.has(key)) {
        bad = "signatures are never stored in presets";
        break;
      }
      if (!KNOWN_KEYS.has(key)) {
        bad = `unknown option ${JSON.stringify(key)}`;
        break;
      }
      const expected = typeof DEFAULT_OPTIONS[key as keyof ToolOptions];
      if (value !== null && typeof value !== expected && expected !== "object") {
        bad = `option ${JSON.stringify(key)} must be ${expected}`;
        break;
      }
      try {
        clean[key] = JSON.parse(JSON.stringify(value)) as unknown;
      } catch {
        bad = `option ${JSON.stringify(key)} is not serializable`;
        break;
      }
    }
    if (bad) {
      fail(bad);
      continue;
    }
    const preset: StoredPreset = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `p-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
      tool,
      name: name.trim(),
      options: clean as Partial<ToolOptions>,
      updatedAt: new Date().toISOString(),
    };
    const at = all.findIndex((p) => p.tool === tool && p.name === preset.name);
    if (at >= 0) all[at] = preset;
    else all.push(preset);
    added.push(preset);
  }
  writeAll(all);
  return { added, skipped };
}
