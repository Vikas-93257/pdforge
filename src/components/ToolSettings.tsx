"use client";
import type { ReactNode } from "react";
import type { ToolOptions } from "@/lib/operations";
import SignaturePad from "./SignaturePad";
type Setter = <K extends keyof ToolOptions>(key: K, value: ToolOptions[K]) => void;
type NumericKey = {
  [K in keyof ToolOptions]: ToolOptions[K] extends number ? K : never;
}[keyof ToolOptions];
export default function ToolSettings({
  slug,
  o,
  set,
  disabled,
  onSignature,
}: {
  slug: string;
  o: ToolOptions;
  set: Setter;
  disabled: boolean;
  onSignature: (bytes: Uint8Array | null) => void;
}) {
  const num = (label: string, key: NumericKey, min: number, max: number, step = 1) => (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={o[key]}
        onChange={(e) => set(key, Number(e.target.value))}
      />
    </label>
  );
  const input = (
    label: string,
    key: "ranges" | "watermarkText" | "title" | "author" | "subject" | "keywords",
    hint?: string,
  ) => (
    <label className="field">
      <span>{label}</span>
      <input
        value={o[key]}
        onChange={(e) => set(key, e.target.value)}
        maxLength={key === "ranges" ? 5000 : 1000}
        autoComplete="off"
      />
      {hint && <small>{hint}</small>}
    </label>
  );
  const select = <K extends keyof ToolOptions>(
    label: string,
    key: K,
    items: [string, string][],
  ) => (
    <label className="field">
      <span>{label}</span>
      <select value={String(o[key])} onChange={(e) => set(key, e.target.value as ToolOptions[K])}>
        {items.map(([v, l]) => (
          <option value={v} key={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
  const resolution = (
    <label className="field">
      <span>Render resolution</span>
      <select value={o.scale} onChange={(e) => set("scale", Number(e.target.value))}>
        <option value={1}>72 DPI · smaller</option>
        <option value={1.5}>108 DPI · balanced</option>
        <option value={2}>144 DPI · clearer</option>
        <option value={3}>216 DPI · larger</option>
      </select>
      <small>Large pages are capped at 16 megapixels for memory safety.</small>
    </label>
  );
  const confirmed = (
    <label className="check-row">
      <input
        type="checkbox"
        checked={o.confirm}
        onChange={(e) => set("confirm", e.target.checked)}
      />
      <span>
        I understand the output is image-based. Selectable text, forms, links and existing
        signatures will be removed.
      </span>
    </label>
  );
  let content: ReactNode;
  switch (slug) {
    case "split":
      content = (
        <>
          {select("Split method", "splitMode", [
            ["ranges", "One PDF per range"],
            ["each", "One PDF per page"],
          ])}
          {o.splitMode === "ranges" &&
            input(
              "Page ranges",
              "ranges",
              "Example: 1-3,5,8-10. Each comma-separated group is a separate PDF.",
            )}
        </>
      );
      break;
    case "extract-pages":
    case "remove-pages":
      content = input(
        slug === "extract-pages" ? "Pages to keep" : "Pages to remove",
        "ranges",
        "Page numbers start at 1. Example: 1-3,5,8-10.",
      );
      break;
    case "rotate":
      content = (
        <label className="field">
          <span>Rotation angle</span>
          <select value={o.angle} onChange={(e) => set("angle", Number(e.target.value))}>
            <option value={90}>90° clockwise</option>
            <option value={180}>180°</option>
            <option value={270}>270° clockwise</option>
          </select>
        </label>
      );
      break;
    case "compress":
      content = (
        <>
          {select("Compression method", "compression", [
            ["lossless", "Lossless · preserve selectable text"],
            ["recommended", "Smaller images · may rasterize pages"],
            ["extreme", "Maximum image reduction · lowest quality"],
          ])}
          <p className="settings-note">
            We compare real output sizes and keep the original if nothing is smaller. Image modes
            can remove selectable text, forms, links and signatures; lossless is the default.
          </p>
        </>
      );
      break;
    case "pdf-to-jpg":
    case "pdf-to-png":
      content = (
        <>
          {input("Pages to export (blank = all)", "ranges", "Example: 1-3,5")}
          {resolution}
          {slug === "pdf-to-jpg" && (
            <label className="field">
              <span>JPEG quality: {Math.round(o.quality * 100)}%</span>
              <input
                type="range"
                min={0.3}
                max={1}
                step={0.05}
                value={o.quality}
                onChange={(e) => set("quality", Number(e.target.value))}
              />
            </label>
          )}
        </>
      );
      break;
    case "jpg-to-pdf":
      content = (
        <div className="field-grid">
          {select("Page size", "pageSize", [
            ["a4", "A4"],
            ["fit", "Fit each image"],
          ])}
          {select("Orientation", "orientation", [
            ["auto", "Automatic"],
            ["portrait", "Portrait"],
            ["landscape", "Landscape"],
          ])}
          {num("Margin (PDF points)", "margin", 0, 100)}
        </div>
      );
      break;
    case "text-to-pdf":
      content = (
        <>
          {input("Document title (optional)", "title")}
          {num("Text size (points)", "fontSize", 8, 32)}
          <label className="field">
            <span>Or paste your text</span>
            <textarea
              value={o.text}
              onChange={(e) => set("text", e.target.value)}
              rows={9}
              placeholder="Paste UTF-8 Latin or Devanagari text here, or select a .txt file above."
              maxLength={2000000}
            />
            <small>
              Pasted text takes precedence over an uploaded text file. Unsupported scripts and emoji
              are rejected rather than silently dropped.
            </small>
          </label>
        </>
      );
      break;
    case "page-numbers":
      content = (
        <>
          <div className="field-grid">
            {select("Number position", "position", [
              ["bottom-center", "Bottom center"],
              ["bottom-left", "Bottom left"],
              ["bottom-right", "Bottom right"],
              ["top-center", "Top center"],
              ["top-left", "Top left"],
              ["top-right", "Top right"],
            ])}
            {num("Start at number", "start", 1, 1000000)}
            {num("Font size (points)", "fontSize", 6, 72)}
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={o.withTotal}
              onChange={(e) => set("withTotal", e.target.checked)}
            />
            <span>Show the final number, for example 1 / 12</span>
          </label>
        </>
      );
      break;
    case "watermark":
      content = (
        <>
          {input("Watermark text", "watermarkText")}
          <div className="field-grid">
            {num("Text size (points)", "fontSize", 6, 160)}
            {num("Text angle (degrees)", "watermarkRotation", -180, 180)}
            <label className="field">
              <span>Text color</span>
              <input type="color" value={o.color} onChange={(e) => set("color", e.target.value)} />
            </label>
          </div>
          <label className="field">
            <span>Opacity: {Math.round(o.opacity * 100)}%</span>
            <input
              type="range"
              value={o.opacity}
              min={0.05}
              max={1}
              step={0.05}
              onChange={(e) => set("opacity", Number(e.target.value))}
            />
          </label>
        </>
      );
      break;
    case "sign":
      content = (
        <>
          <SignaturePad onChange={onSignature} disabled={disabled} />
          <div className="field-grid">
            {num("Page (0 = last page)", "signaturePage", 0, 15000)}
            {select("Signature position", "signatureCorner", [
              ["bottom-right", "Bottom right"],
              ["bottom-left", "Bottom left"],
              ["top-right", "Top right"],
              ["top-left", "Top left"],
            ])}
            {num("Signature width (points)", "signatureWidth", 30, 500)}
          </div>
        </>
      );
      break;
    case "protect":
    case "unlock":
      content = (
        <>
          <label className="field">
            <span>{slug === "protect" ? "Opening password" : "Known document password"}</span>
            <input
              type="password"
              value={o.password}
              autoComplete={slug === "protect" ? "new-password" : "off"}
              onChange={(e) => set("password", e.target.value)}
              maxLength={127}
              spellCheck={false}
            />
            <small>
              {slug === "protect"
                ? "At least 8 characters, up to 127 UTF-8 bytes. A longer, unique passphrase is better."
                : "Only unlock documents you own or have permission to access. This is not password cracking."}
            </small>
          </label>
          {slug === "protect" && (
            <label className="field">
              <span>Confirm opening password</span>
              <input
                type="password"
                value={o.passwordConfirm}
                autoComplete="new-password"
                onChange={(e) => set("passwordConfirm", e.target.value)}
                maxLength={127}
              />
            </label>
          )}
        </>
      );
      break;
    case "crop":
      content = (
        <>
          <div className="field-grid">
            {num("Top margin (points)", "cropTop", 0, 2000)}
            {num("Bottom margin (points)", "cropBottom", 0, 2000)}
            {num("Left margin (points)", "cropLeft", 0, 2000)}
            {num("Right margin (points)", "cropRight", 0, 2000)}
          </div>
          <p className="settings-note">
            72 PDF points = 1 inch. Crop hides content beyond a boundary; it does not delete
            sensitive information.
          </p>
        </>
      );
      break;
    case "resize":
      content = (
        <>
          {select("Target paper size", "paper", [
            ["a4", "A4 · 210 × 297 mm"],
            ["letter", "US Letter · 8.5 × 11 in"],
            ["legal", "US Legal · 8.5 × 14 in"],
            ["a3", "A3 · 297 × 420 mm"],
          ])}
          <label className="check-row">
            <input
              type="checkbox"
              checked={o.landscape}
              onChange={(e) => set("landscape", e.target.checked)}
            />
            <span>Landscape orientation</span>
          </label>
        </>
      );
      break;
    case "redact":
    case "sanitize":
      content = (
        <>
          {resolution}
          {confirmed}
        </>
      );
      break;
    case "ocr":
      content = (
        <>
          {select("Recognition language", "language", [
            ["eng", "English"],
            ["hin", "Hindi"],
            ["eng+hin", "English + Hindi"],
          ])}
          <p className="settings-note">
            The local engine and language models load on first use. Outputs include a searchable PDF
            and UTF-8 text. Review all recognized text; accuracy varies by scan quality.
          </p>
        </>
      );
      break;
    case "word-to-pdf":
      content = (
        <>
          {select("Conversion mode", "wordMode", [
            ["text", "Text-first · searchable, simplified layout"],
            ["visual", "Visual · page images, closer appearance"],
          ])}
          <p className="settings-note">
            Text mode keeps words selectable and searchable with a simplified layout. Visual mode
            renders page images that look closer to Word but contain no selectable text.
          </p>
        </>
      );
      break;
    case "summarize":
      content = (
        <>
          {select("Summary length", "summaryLength", [
            ["short", "Short · 3 key sentences"],
            ["medium", "Medium · 6 key sentences"],
            ["long", "Detailed · 10 key sentences"],
          ])}
          <p className="settings-note">
            Extractive summarization selects existing sentences by local word frequency. It does not
            use a cloud AI and does not verify facts.
          </p>
        </>
      );
      break;
    case "metadata":
      content = (
        <>
          <label className="check-row">
            <input
              type="checkbox"
              checked={o.clearMetadata}
              onChange={(e) => set("clearMetadata", e.target.checked)}
            />
            <span>Clear standard metadata and XMP instead</span>
          </label>
          <div className="field-grid">
            {input("Title", "title")}
            {input("Author", "author")}
            {input("Subject", "subject")}
            {input("Keywords (comma-separated)", "keywords")}
          </div>
          <p className="field-hint">
            When clear is checked, the fields above are ignored. Visible content and attachments
            remain.
          </p>
        </>
      );
      break;
    default:
      content = (
        <p className="settings-note">
          {slug === "inspect"
            ? "No settings needed. The document is measured on your device and the findings download as a Markdown report."
            : slug === "merge"
              ? "The file order above is the final page order. Move files with the arrow buttons before merging."
              : slug === "organize"
                ? "Use the page controls below to reorder, rotate or remove pages. Keep at least one."
                : slug === "compare"
                  ? "Add exactly two PDFs. Differences are highlighted in red on rendered page maps, with a JSON report."
                  : slug === "repair"
                    ? "Attempts structural recovery without inventing replacement content. Some damaged files cannot be repaired."
                    : slug === "flatten"
                      ? "Filled standard AcroForm fields become static page content. XFA forms are not supported."
                      : slug === "pdf-to-word"
                        ? "Creates a real editable DOCX with detected headings, tables, styling and embedded page images. Complex layouts and charts are simplified."
                        : slug === "pdf-to-markdown"
                          ? "Converts detected headings, lists and simple tables into Markdown text, embedding small page images. Appearance is not preserved."
                          : slug === "pdf-to-excel"
                            ? "Rebuilds positional text grids into one workbook sheet per page. This is a heuristic extraction; review every number."
                            : slug === "excel-to-pdf"
                              ? "Renders each worksheet as a searchable table. Merged cells, charts and custom formats are simplified."
                              : slug === "pdf-to-powerpoint"
                                ? "Builds one editable slide per page with detected text, tables and images. Charts and precise layout are simplified."
                                : slug === "powerpoint-to-pdf"
                                  ? "Converts slide titles, bullets, tables and images into searchable PDF pages. Animations, notes and charts are not reproduced."
                                  : slug === "fill-pdf-form"
                                    ? "Enter a value for each detected field below. Fields stay editable; use Flatten afterwards to make them static."
                                    : slug === "pdf-to-csv"
                                      ? "Exports positional text as page, row, column and text fields. This is a heuristic extraction; review inferred columns."
                                      : slug === "extract-images"
                                        ? "Extracts supported embedded raster images at native dimensions, rather than rendering full pages."
                                        : "Extracts selectable text. For scans, choose the OCR tool first."}
        </p>
      );
  }
  return (
    <fieldset className="settings-fields" disabled={disabled}>
      <legend className="workspace-section-label">02 · MAKE IT YOURS</legend>
      {content}
    </fieldset>
  );
}
