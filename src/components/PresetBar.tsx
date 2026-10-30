"use client";
import { useState } from "react";
import { Bookmark, Download, Trash2, Upload } from "lucide-react";
import type { ToolOptions } from "@/lib/operations";
import {
  deletePreset,
  exportPack,
  importPack,
  loadPresets,
  savePreset,
  type StoredPreset,
} from "@/lib/presets";
type Setter = <K extends keyof ToolOptions>(key: K, value: ToolOptions[K]) => void;
export default function PresetBar({
  slug,
  options,
  apply,
}: {
  slug: string;
  options: ToolOptions;
  apply: Setter;
}) {
  const [presets, setPresets] = useState<StoredPreset[]>(() => loadPresets(slug));
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [importKey, setImportKey] = useState(0);
  const refresh = (selectId = "") => {
    setPresets(loadPresets(slug));
    setSelected(selectId);
  };
  const applyPreset = () => {
    const preset = presets.find((p) => p.id === selected);
    if (!preset) {
      setMessage("Choose a saved preset first.");
      return;
    }
    for (const [key, value] of Object.entries(preset.options))
      apply(key as keyof ToolOptions, value as never);
    setMessage(`Applied “${preset.name}”. Files and signatures are never stored in presets.`);
  };
  const save = () => {
    try {
      const preset = savePreset(slug, name, options);
      setName("");
      refresh(preset.id);
      setMessage(`Saved “${preset.name}” in this browser.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Preset could not be saved here.");
    }
  };
  const remove = () => {
    if (!selected) {
      setMessage("Choose a saved preset first.");
      return;
    }
    deletePreset(selected);
    refresh();
    setMessage("Preset deleted from this browser.");
  };
  const download = () => {
    const blob = new Blob([exportPack(slug)], { type: "application/json" });
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `pdforge-${slug}-presets.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Preset pack downloaded — share the file with your team.");
  };
  const upload = async (file: File) => {
    try {
      const { added, skipped } = importPack(await file.text());
      refresh();
      setMessage(
        `Imported ${added.length} preset${added.length === 1 ? "" : "s"}` +
          (skipped.length
            ? `, skipped ${skipped.length}: ${skipped.map((s) => `${s.name} (${s.reason})`).join("; ")}`
            : "."),
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Import failed.");
    }
  };
  return (
    <section className="preset-bar" aria-label="Team presets">
      <h2>
        <Bookmark size={16} aria-hidden="true" /> Team presets
      </h2>
      <div className="preset-row">
        <label className="field">
          <span>Saved presets for this tool</span>
          <select
            aria-label="Saved presets for this tool"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Choose a preset…</option>
            {presets.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="preset-actions">
          <button type="button" className="button button-outline" onClick={applyPreset}>
            Apply
          </button>
          <button type="button" className="button button-outline" onClick={remove}>
            <Trash2 size={15} aria-hidden="true" /> Delete
          </button>
          <button type="button" className="button button-outline" onClick={download}>
            <Download size={15} aria-hidden="true" /> Export pack
          </button>
          <button
            type="button"
            className="button button-outline"
            onClick={() => setImportKey((k) => k + 1)}
          >
            <Upload size={15} aria-hidden="true" /> Import pack
          </button>
          {importKey > 0 && (
            <input
              key={importKey}
              ref={(node) => node?.click()}
              type="file"
              accept=".json,application/json"
              className="visually-hidden"
              aria-label="Import preset pack file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setImportKey(0);
                if (file) void upload(file);
              }}
            />
          )}
        </div>
      </div>
      <div className="preset-row">
        <label className="field">
          <span>Save current settings as</span>
          <input
            aria-label="Save current settings as"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Client invoices"
            maxLength={40}
            autoComplete="off"
          />
        </label>
        <div className="preset-actions">
          <button type="button" className="button button-outline" onClick={save}>
            Save preset
          </button>
        </div>
      </div>
      {message && (
        <p className="settings-note" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
