"use client";
/* eslint-disable @next/next/no-img-element -- Previews are in-memory data URLs, not remotely optimized images. */
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Archive, Check, Download, Eye, FileText, LoaderCircle } from "lucide-react";
import type { ToolResult } from "@/lib/operations";
import { fmtBytes } from "@/lib/site";
import { DriveSaveButtons } from "./DriveButtons";
export type Completed = ToolResult & {
  links: { url: string; name: string; mime: string; size: number }[];
  receipt?: { url: string; name: string; size: number };
};
export default function ResultPanel({ result, slug }: { result: Completed; slug: string }) {
  const [zipUrl, setZipUrl] = useState(""),
    [packing, setPacking] = useState(false),
    [zipError, setZipError] = useState(""),
    [preview, setPreview] = useState(""),
    [previewing, setPreviewing] = useState(false);
  const bundle = useRef("");
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      if (bundle.current) URL.revokeObjectURL(bundle.current);
    };
  }, []);
  const makeZip = async () => {
    setPacking(true);
    setZipError("");
    try {
      const JSZip = (await import("jszip")).default,
        zip = new JSZip();
      result.files.forEach((f, i) =>
        zip.file(`${String(i + 1).padStart(3, "0")}-${f.name}`, f.bytes),
      );
      const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
      if (!active.current) return;
      const url = URL.createObjectURL(blob);
      bundle.current = url;
      setZipUrl(url);
    } catch {
      if (active.current)
        setZipError("The ZIP could not be prepared. Download individual files instead.");
    } finally {
      if (active.current) setPacking(false);
    }
  };
  const showPreview = async () => {
    setPreviewing(true);
    setZipError("");
    try {
      const render = await import("@/lib/pdf/render"),
        opened = await render.openDocument(result.files[0].bytes);
      try {
        const p = await opened.doc.getPage(1),
          r = await render.renderPage(
            p,
            Math.min(1.2, 650 / p.getViewport({ scale: 1 }).width),
            render.browserEnv(),
          );
        if (active.current)
          setPreview((r.canvas as HTMLCanvasElement).toDataURL("image/jpeg", 0.85));
      } finally {
        await opened.destroy();
      }
    } catch (e) {
      if (active.current)
        setZipError(e instanceof Error ? e.message : "Preview could not be loaded.");
    } finally {
      if (active.current) setPreviewing(false);
    }
  };
  const first = result.links[0],
    saved = result.metrics ? Math.max(0, result.metrics.before - result.metrics.after) : 0;
  return (
    <>
      <div className="result-heading">
        <span className="success-icon">
          <Check size={22} aria-hidden="true" />
        </span>
        <div>
          <h2 id="result-title">Your files. Ready to go.</h2>
          <p role="status">
            {result.files.length} {result.files.length === 1 ? "file" : "files"} created locally.
            Review before sharing.
          </p>
        </div>
      </div>
      {result.metrics && (
        <div className="compression-metrics">
          <div>
            <span>Original</span>
            <strong>{fmtBytes(result.metrics.before)}</strong>
          </div>
          <ArrowRight size={20} aria-hidden="true" />
          <div>
            <span>Output</span>
            <strong>{fmtBytes(result.metrics.after)}</strong>
          </div>
          <div className="savings">
            <strong>
              {saved
                ? `${Math.round((saved / result.metrics.before) * 100)}% smaller`
                : "Original kept"}
            </strong>
            <span>{saved ? `${fmtBytes(saved)} saved` : "No size increase"}</span>
          </div>
        </div>
      )}
      <ul className="result-notes">
        {result.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <div className="result-actions">
        {result.files.length === 1 ? (
          <a className="button button-green" href={first.url} download={first.name}>
            <Download size={18} aria-hidden="true" /> Download{" "}
            {first.name.toLowerCase().endsWith(".pdf") ? "PDF" : "file"}
            <span className="download-size">{fmtBytes(first.size)}</span>
          </a>
        ) : zipUrl ? (
          <a className="button button-green" href={zipUrl} download={`pdforge-${slug}.zip`}>
            <Download size={18} aria-hidden="true" /> Download ZIP
          </a>
        ) : (
          <button
            type="button"
            className="button button-green"
            onClick={() => void makeZip()}
            disabled={packing}
          >
            {packing ? (
              <LoaderCircle size={18} className="spin" aria-hidden="true" />
            ) : (
              <Archive size={18} aria-hidden="true" />
            )}
            {packing ? "Preparing ZIP…" : "Prepare ZIP download"}
          </button>
        )}
        {first.mime === "application/pdf" && slug !== "protect" && !preview && (
          <button
            className="button button-outline"
            type="button"
            onClick={() => void showPreview()}
            disabled={previewing}
          >
            {previewing ? (
              <LoaderCircle size={16} className="spin" aria-hidden="true" />
            ) : (
              <Eye size={16} aria-hidden="true" />
            )}{" "}
            Preview first page
          </button>
        )}
      </div>
      <DriveSaveButtons files={result.files} />
      {result.receipt && (
        <p className="result-receipt">
          <a href={result.receipt.url} download={result.receipt.name}>
            <FileText size={15} aria-hidden="true" />
            <span>Download audit receipt</span>
            <small>{fmtBytes(result.receipt.size)}</small>
          </a>
          <span>Inputs, outputs and settings with SHA-256 hashes.</span>
        </p>
      )}
      {zipError && (
        <p className="form-error" role="alert">
          {zipError}
        </p>
      )}
      {result.files.length > 1 && (
        <details className="individual-files">
          <summary>Download individual files ({result.files.length})</summary>
          {result.links.map((f, i) => (
            <a href={f.url} key={i} download={f.name}>
              <FileText size={15} aria-hidden="true" />
              <span>{f.name}</span>
              <small>{fmtBytes(f.size)}</small>
              <Download size={15} aria-hidden="true" />
            </a>
          ))}
        </details>
      )}
      {preview && (
        <div className="result-preview">
          <img
            src={preview}
            alt="First page of the processed PDF. Review the full downloaded document before sharing."
            width={650}
            height={850}
          />
        </div>
      )}
      {result.previewText && (
        <details className="text-preview">
          <summary>Preview extracted text</summary>
          <pre>
            {result.previewText.slice(0, 12000)}
            {result.previewText.length > 12000
              ? "\n… Download the file for the complete text."
              : ""}
          </pre>
        </details>
      )}
      <p className="result-reminder">
        Your original file has not been changed. Downloaded copies are your responsibility; PDFORGE
        does not retain them.
      </p>
    </>
  );
}
