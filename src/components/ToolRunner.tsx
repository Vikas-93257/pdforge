"use client";
/* eslint-disable @next/next/no-img-element -- Previews are in-memory data URLs, not remotely optimized images. */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  ShieldCheck,
  FileText,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Trash2,
  LoaderCircle,
  Check,
  Download,
  Archive,
  Eye,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import type { ToolDef } from "@/lib/tools";
import {
  ACCEPT,
  DEFAULT_OPTIONS,
  identifyFile,
  validateSelection,
  type LocalFile,
  type ToolOptions,
  type ToolResult,
} from "@/lib/operations";
import { fmtBytes } from "@/lib/site";
import ToolSettings from "./ToolSettings";
import RedactionEditor from "./RedactionEditor";
import FormFiller from "./FormFiller";
import ResultPanel, { type Completed } from "./ResultPanel";
import { DriveOpenButton } from "./DriveButtons";
type Thumb = { page: number; dataUrl: string; rotation: number };
function defaults(slug: string): ToolOptions {
  return {
    ...DEFAULT_OPTIONS,
    order: [],
    rotations: {},
    boxes: [],
    fieldValues: {},
    ranges: slug === "pdf-to-jpg" || slug === "pdf-to-png" ? "" : "1",
    fontSize: slug === "watermark" ? 48 : slug === "text-to-pdf" ? 12 : 11,
  };
}
export default function ToolRunner({ tool }: { tool: ToolDef }) {
  const [session, setSession] = useState(0),
    [files, setFiles] = useState<LocalFile[]>([]),
    [o, setOptions] = useState<ToolOptions>(() => defaults(tool.slug)),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [dragging, setDragging] = useState(false),
    [thumbs, setThumbs] = useState<Thumb[]>([]),
    [pageCount, setPageCount] = useState(0),
    [progress, setProgress] = useState<{ percent: number | null; label: string }>({
      percent: null,
      label: "",
    }),
    [completed, setCompleted] = useState<Completed | null>(null);
  const input = useRef<HTMLInputElement>(null),
    job = useRef<AbortController | null>(null),
    urls = useRef<string[]>([]),
    mounted = useRef(true),
    resultRef = useRef<HTMLElement>(null),
    errorRef = useRef<HTMLDivElement>(null);
  const set = useCallback(
    <K extends keyof ToolOptions>(key: K, value: ToolOptions[K]) =>
      setOptions((previous) => ({ ...previous, [key]: value })),
    [],
  );
  const onSignature = useCallback(
    (bytes: Uint8Array | null) => setOptions((previous) => ({ ...previous, signature: bytes })),
    [],
  );
  const onBoxes = useCallback(
    (boxes: ToolOptions["boxes"]) => setOptions((previous) => ({ ...previous, boxes })),
    [],
  );
  const onFieldValues = useCallback(
    (fieldValues: ToolOptions["fieldValues"]) =>
      setOptions((previous) => ({ ...previous, fieldValues })),
    [],
  );
  const clearResults = useCallback(() => {
    urls.current.forEach(URL.revokeObjectURL);
    urls.current = [];
    setCompleted(null);
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      job.current?.abort();
      urls.current.forEach(URL.revokeObjectURL);
    };
  }, []);
  const addFiles = async (selected: File[]) => {
    if (busy || loading || !selected.length) return;
    setError("");
    setLoading(true);
    clearResults();
    const controller = new AbortController();
    job.current = controller;
    try {
      validateSelection(tool, selected, tool.multiple ? files : []);
      const loaded: LocalFile[] = [];
      for (const file of selected) {
        const bytes = new Uint8Array(await file.arrayBuffer()),
          kind = identifyFile(bytes, file.name);
        const compatible =
          kind === tool.accept ||
          (tool.accept === "pdf-image" && (kind === "pdf" || kind === "image"));
        if (!compatible)
          throw new Error(
            `“${file.name}” is not a supported ${tool.accept === "pdf-image" ? "PDF or JPG/PNG/WebP" : tool.accept} file. File contents must match a supported format.`,
          );
        const type =
          kind === "image"
            ? bytes[0] === 0x89
              ? "image/png"
              : bytes[0] === 0xff
                ? "image/jpeg"
                : "image/webp"
            : file.type;
        loaded.push({ id: crypto.randomUUID(), name: file.name, type, size: file.size, bytes });
      }
      if (!mounted.current || controller.signal.aborted) return;
      const next = tool.multiple ? [...files, ...loaded] : loaded;
      setFiles(next);
      setThumbs([]);
      setPageCount(0);
      if (["organize", "redact", "metadata"].includes(tool.slug)) {
        const engine = await import("@/lib/pdf/engine"),
          doc = await engine.loadPdf(loaded[0].bytes);
        if (!mounted.current || controller.signal.aborted) return;
        setPageCount(doc.getPageCount());
        if (tool.slug === "organize") {
          const previews = await (
            await import("@/lib/pdf/render")
          ).getThumbnails(loaded[0].bytes, 150, controller.signal);
          if (!mounted.current || controller.signal.aborted) return;
          setThumbs(previews);
          setOptions((p) => ({ ...p, order: previews.map((t) => t.page - 1), rotations: {} }));
        }
        if (tool.slug === "redact") setOptions((p) => ({ ...p, boxes: [], confirm: false }));
        if (tool.slug === "metadata") {
          const m = await engine.getMetadata(loaded[0].bytes);
          if (mounted.current)
            setOptions((p) => ({
              ...p,
              title: m.title,
              author: m.author,
              subject: m.subject,
              keywords: m.keywords,
              clearMetadata: false,
            }));
        }
      }
    } catch (e) {
      if (mounted.current && !controller.signal.aborted)
        setError(e instanceof Error ? e.message : "The file could not be opened.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  };
  const addDriveFile = async (picked: { name: string; mime: string; bytes: Uint8Array }) => {
    if (busy || loading) return;
    setError("");
    clearResults();
    try {
      validateSelection(
        tool,
        [{ name: picked.name, size: picked.bytes.length }],
        tool.multiple ? files : [],
      );
      const kind = identifyFile(picked.bytes, picked.name);
      const compatible =
        kind === tool.accept ||
        (tool.accept === "pdf-image" && (kind === "pdf" || kind === "image"));
      if (!compatible)
        throw new Error(
          `“${picked.name}” is not a supported ${tool.accept} file. File contents must match a supported format.`,
        );
      const next = tool.multiple
        ? [
            ...files,
            {
              id: crypto.randomUUID(),
              name: picked.name,
              type: picked.mime,
              size: picked.bytes.length,
              bytes: picked.bytes,
            },
          ]
        : [
            {
              id: crypto.randomUUID(),
              name: picked.name,
              type: picked.mime,
              size: picked.bytes.length,
              bytes: picked.bytes,
            },
          ];
      setFiles(next);
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "The file could not be opened.");
    }
  };
  const clear = () => {
    job.current?.abort();
    clearResults();
    setFiles([]);
    setOptions(defaults(tool.slug));
    setSession((s) => s + 1);
    setError("");
    setThumbs([]);
    setPageCount(0);
    setProgress({ percent: null, label: "" });
    if (input.current) input.current.value = "";
  };
  const moveFile = (index: number, direction: number) => {
    const next = [...files];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setFiles(next);
    clearResults();
  };
  const movePage = (index: number, direction: number) => {
    const order = [...o.order];
    [order[index], order[index + direction]] = [order[index + direction], order[index]];
    set("order", order);
    clearResults();
  };
  const run = async () => {
    if (busy || loading) return;
    setError("");
    clearResults();
    setBusy(true);
    setProgress({ percent: null, label: "Preparing local processing…" });
    const controller = new AbortController();
    job.current = controller;
    try {
      await new Promise((resolve) => setTimeout(resolve, 20));
      const { executeTool } = await import("@/lib/operations");
      const result = await executeTool(tool.slug, files, o, {
        signal: controller.signal,
        onProgress: (percent, label) => {
          if (mounted.current) setProgress({ percent, label });
        },
      });
      if (!mounted.current || controller.signal.aborted) return;
      const links = result.files.map((f) => {
        const url = URL.createObjectURL(new Blob([f.bytes.slice().buffer], { type: f.mime }));
        urls.current.push(url);
        return { url, name: f.name, mime: f.mime, size: f.bytes.length };
      });
      setCompleted({ ...result, links });
      setProgress({ percent: 100, label: "Processing complete" });
      setTimeout(
        () =>
          resultRef.current?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
            block: "nearest",
          }),
        50,
      );
    } catch (e) {
      if (mounted.current) {
        setError(
          controller.signal.aborted
            ? "Processing cancelled. No partial output was saved."
            : e instanceof Error
              ? e.message
              : "Something went wrong while processing. No result was saved.",
        );
        setTimeout(() => errorRef.current?.focus(), 0);
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const disabled = busy || loading,
    ready =
      (files.length > 0 || (tool.slug === "text-to-pdf" && o.text.trim().length > 0)) && !disabled;
  return (
    <section className="workspace" aria-label={`${tool.name} local workspace`}>
      <div className="workspace-toolbar">
        <span>
          <span className="status-dot" /> LOCAL SESSION{" "}
          <span className="muted">/ no history saved</span>
        </span>
        {(files.length > 0 || o.text || completed) && (
          <button type="button" className="text-button" onClick={clear} disabled={disabled}>
            <RefreshCw size={13} aria-hidden="true" /> Clear workspace
          </button>
        )}
      </div>
      <div className="workspace-body">
        <div className="workspace-section-label">
          01 · {tool.multiple ? "ADD YOUR FILES" : "ADD YOUR FILE"}
        </div>
        <input
          hidden
          ref={input}
          id={`file-${tool.slug}`}
          tabIndex={-1}
          type="file"
          accept={ACCEPT[tool.accept]}
          multiple={tool.multiple}
          aria-label={tool.multiple ? "Choose files" : "Choose file"}
          disabled={disabled}
          onChange={(e) => {
            const selected = Array.from(e.target.files ?? []);
            e.target.value = "";
            void addFiles(selected);
          }}
        />
        <div
          className={`drop-zone ${dragging ? "dragging" : ""} ${files.length ? "has-files" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!disabled) void addFiles(Array.from(e.dataTransfer.files));
          }}
        >
          <div className="upload-icon">
            <Upload size={25} strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h2>
            {files.length
              ? tool.multiple
                ? "Add another file"
                : "Choose a different file"
              : "Drop it here. Keep it here."}
          </h2>
          <p>
            {files.length
              ? "Your documents stay in this browser session."
              : "Drag and drop your files, or choose from your device."}
          </p>
          <button
            type="button"
            className="button button-green"
            onClick={() => input.current?.click()}
            disabled={disabled}
          >
            {loading ? (
              <>
                <LoaderCircle size={16} className="spin" aria-hidden="true" /> Reading locally…
              </>
            ) : (
              <>
                <PlusIcon />
                {tool.multiple ? "Choose files" : "Choose file"}
              </>
            )}
          </button>
          <span className="drop-help">
            {tool.accept === "pdf"
              ? "PDF"
              : tool.accept === "image"
                ? "JPG, PNG or WebP"
                : tool.accept === "document"
                  ? "DOCX"
                  : tool.accept === "spreadsheet"
                    ? "XLSX spreadsheet"
                    : tool.accept === "presentation"
                      ? "PPTX presentation"
                      : tool.accept === "text"
                        ? "UTF-8 TXT"
                        : "PDF, JPG, PNG or WebP"}{" "}
            · Max 100 MB per file{tool.multiple ? " · 300 MB total" : ""}
          </span>
        </div>
        <DriveOpenButton accept={tool.accept} disabled={disabled} onPick={addDriveFile} />
        {files.length > 0 && (
          <div className="file-list" aria-label="Selected files">
            {files.map((f, index) => (
              <div className="file-row" key={f.id}>
                <span className="file-order">{String(index + 1).padStart(2, "0")}</span>
                <FileText size={20} aria-hidden="true" />
                <div className="file-info">
                  <strong title={f.name}>{f.name}</strong>
                  <span>
                    {fmtBytes(f.size)}
                    {pageCount && index === 0 ? ` · ${pageCount} pages` : ""}
                  </span>
                </div>
                <div className="file-actions">
                  {tool.multiple && (
                    <>
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => moveFile(index, -1)}
                        disabled={disabled || index === 0}
                        aria-label={`Move file ${index + 1} earlier`}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => moveFile(index, 1)}
                        disabled={disabled || index === files.length - 1}
                        aria-label={`Move file ${index + 1} later`}
                      >
                        <ArrowDown size={15} />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="icon-button"
                    disabled={disabled}
                    onClick={() => {
                      const remaining = files.filter((item) => item.id !== f.id);
                      setFiles(remaining);
                      setThumbs([]);
                      setPageCount(0);
                      if (!remaining.length) {
                        setOptions(defaults(tool.slug));
                        setSession((s) => s + 1);
                      }
                      clearResults();
                    }}
                    aria-label={`Remove file ${index + 1}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <ToolSettings
          key={session}
          slug={tool.slug}
          o={o}
          set={set}
          disabled={disabled}
          onSignature={onSignature}
        />
        {tool.slug === "organize" && thumbs.length > 0 && (
          <div className="page-organizer" aria-label="Organize pages">
            {o.order.map((original, index) => (
              <div className="page-tile" key={original}>
                <div className="thumbnail-frame">
                  <img
                    src={thumbs[original].dataUrl}
                    alt={`Original page ${original + 1}`}
                    width={150}
                    height={210}
                    style={{ transform: `rotate(${o.rotations[original] ?? 0}deg)` }}
                  />
                </div>
                <span>
                  Page {original + 1} <small>→ {index + 1}</small>
                </span>
                <div className="page-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Move page ${original + 1} earlier`}
                    disabled={disabled || index === 0}
                    onClick={() => movePage(index, -1)}
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Move page ${original + 1} later`}
                    disabled={disabled || index === o.order.length - 1}
                    onClick={() => movePage(index, 1)}
                  >
                    <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Rotate page ${original + 1}`}
                    disabled={disabled}
                    onClick={() =>
                      set("rotations", {
                        ...o.rotations,
                        [original]: ((o.rotations[original] ?? 0) + 90) % 360,
                      })
                    }
                  >
                    <RotateCw size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Delete page ${original + 1}`}
                    disabled={disabled || o.order.length === 1}
                    onClick={() =>
                      set(
                        "order",
                        o.order.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {tool.slug === "redact" && files.length > 0 && pageCount > 0 && (
          <RedactionEditor
            key={files[0].id}
            bytes={files[0].bytes}
            pageCount={pageCount}
            boxes={o.boxes}
            onChange={onBoxes}
            disabled={disabled}
          />
        )}
        {tool.slug === "fill-pdf-form" && files.length > 0 && (
          <FormFiller
            key={files[0].id}
            bytes={files[0].bytes}
            values={o.fieldValues}
            onChange={onFieldValues}
            disabled={disabled}
          />
        )}
        {error && (
          <div className="form-error" role="alert" ref={errorRef} tabIndex={-1}>
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{error}</span>
            <button
              type="button"
              className="icon-button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={15} />
            </button>
          </div>
        )}
        {busy && (
          <div className="progress-panel" role="status" aria-live="polite">
            <div>
              <LoaderCircle size={18} className="spin" aria-hidden="true" />
              <span>{progress.label}</span>
              {progress.percent !== null && <strong>{progress.percent}%</strong>}
            </div>
            {progress.percent !== null && (
              <progress max={100} value={progress.percent} aria-label="Processing progress" />
            )}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                job.current?.abort();
                setProgress((p) => ({ ...p, label: "Cancellation requested…" }));
              }}
            >
              Cancel processing
            </button>
          </div>
        )}
        <div className="process-row">
          <span>
            <ShieldCheck size={16} aria-hidden="true" /> No uploads. Processed on your device.
          </span>
          <button
            className="button button-dark"
            type="button"
            onClick={() => void run()}
            disabled={!ready}
          >
            {busy ? (
              <LoaderCircle className="spin" size={17} aria-hidden="true" />
            ) : (
              <>
                {tool.cta}
                <ArrowRight size={17} aria-hidden="true" />
              </>
            )}
          </button>
        </div>
        {completed && (
          <section ref={resultRef} className="result-panel" aria-labelledby="result-title">
            <ResultPanel result={completed} slug={tool.slug} />
          </section>
        )}
      </div>
    </section>
  );
}
function PlusIcon() {
  return (
    <span aria-hidden="true" className="plus-icon">
      +
    </span>
  );
}
