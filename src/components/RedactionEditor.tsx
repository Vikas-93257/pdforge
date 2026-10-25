"use client";
/* eslint-disable @next/next/no-img-element -- Document previews are local canvas data URLs. */
import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { Trash2, Plus, LoaderCircle } from "lucide-react";
import type { RedactionBox } from "@/lib/pdf/render";
export default function RedactionEditor({
  bytes,
  pageCount,
  boxes,
  onChange,
  disabled,
}: {
  bytes: Uint8Array;
  pageCount: number;
  boxes: RedactionBox[];
  onChange: (boxes: RedactionBox[]) => void;
  disabled: boolean;
}) {
  const [page, setPage] = useState(1),
    [preview, setPreview] = useState<{ url: string; width: number; height: number } | null>(null),
    [error, setError] = useState(""),
    [draft, setDraft] = useState<RedactionBox | null>(null),
    [x, setX] = useState(10),
    [y, setY] = useState(20),
    [width, setWidth] = useState(50),
    [height, setHeight] = useState(10);
  const start = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    (async () => {
      try {
        const render = await import("@/lib/pdf/render"),
          open = await render.openDocument(bytes);
        try {
          render.checkAbort(abort.signal);
          const p = await open.doc.getPage(page),
            r = await render.renderPage(
              p,
              Math.min(1.5, 720 / p.getViewport({ scale: 1 }).width),
              render.browserEnv(),
            );
          if (active) {
            setPreview({
              url: (r.canvas as HTMLCanvasElement).toDataURL("image/png"),
              width: r.width,
              height: r.height,
            });
            setError("");
          }
        } finally {
          await open.destroy();
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Preview could not load.");
      }
    })();
    return () => {
      active = false;
      abort.abort();
    };
  }, [bytes, page]);
  const point = (e: PointerEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)),
      y: Math.max(0, Math.min(1, (e.clientY - b.top) / b.height)),
    };
  };
  const begin = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = point(e);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const end = point(e),
      s = start.current;
    setDraft({
      page,
      x: Math.min(s.x, end.x),
      y: Math.min(s.y, end.y),
      width: Math.abs(s.x - end.x),
      height: Math.abs(s.y - end.y),
    });
  };
  const finish = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const end = point(e),
      s = start.current,
      b = {
        page,
        x: Math.min(s.x, end.x),
        y: Math.min(s.y, end.y),
        width: Math.abs(s.x - end.x),
        height: Math.abs(s.y - end.y),
      };
    start.current = null;
    if (b.width > 0.003 && b.height > 0.003) onChange([...boxes, b]);
    setDraft(null);
  };
  return (
    <div className="redaction-editor">
      <div className="editor-toolbar">
        <label>
          Preview page{" "}
          <select
            value={page}
            onChange={(e) => {
              setPage(Number(e.target.value));
              setPreview(null);
            }}
            disabled={disabled}
          >
            {Array.from({ length: pageCount }, (_, i) => (
              <option value={i + 1} key={i}>
                {i + 1}
              </option>
            ))}
          </select>{" "}
          of {pageCount}
        </label>
        <span>Drag over information to remove</span>
      </div>
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : preview ? (
        <div
          className="redaction-surface"
          style={{ aspectRatio: `${preview.width}/${preview.height}` }}
          onPointerDown={begin}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={() => {
            start.current = null;
            setDraft(null);
          }}
          role="group"
          aria-label="PDF page preview. Draw regions here, or add coordinates below."
        >
          <img
            src={preview.url}
            alt={`Original page ${page} before redaction`}
            width={preview.width}
            height={preview.height}
            draggable={false}
          />
          <svg
            className="redaction-overlay"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {[...boxes.filter((b) => b.page === page), ...(draft ? [draft] : [])].map((b, i) => (
              <rect
                key={i}
                x={b.x * 1000}
                y={b.y * 1000}
                width={b.width * 1000}
                height={b.height * 1000}
                fill="#000"
              />
            ))}
          </svg>
        </div>
      ) : (
        <div className="preview-loading">
          <LoaderCircle className="spin" size={22} aria-hidden="true" /> Loading page preview…
        </div>
      )}
      <details className="coordinate-details">
        <summary>Add a region using coordinates (keyboard accessible)</summary>
        <p>Percentages start at the top-left of the visible, rotated page.</p>
        <div className="field-grid field-grid-four">
          {[
            { name: "Left (%)", value: x, set: setX },
            { name: "Top (%)", value: y, set: setY },
            { name: "Width (%)", value: width, set: setWidth },
            { name: "Height (%)", value: height, set: setHeight },
          ].map((f) => (
            <label className="field" key={f.name}>
              <span>{f.name}</span>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={f.value}
                onChange={(e) => f.set(Number(e.target.value))}
                disabled={disabled}
              />
            </label>
          ))}
        </div>
        <button
          className="button button-outline button-small"
          type="button"
          disabled={disabled}
          onClick={() =>
            onChange([
              ...boxes,
              { page, x: x / 100, y: y / 100, width: width / 100, height: height / 100 },
            ])
          }
        >
          <Plus size={15} aria-hidden="true" /> Add region on page {page}
        </button>
      </details>
      {boxes.length > 0 && (
        <div className="region-list" aria-label="Selected redaction regions">
          {boxes.map((b, i) => (
            <div key={i}>
              <span>
                Region {i + 1} · page {b.page} · {Math.round(b.width * 100)}% ×{" "}
                {Math.round(b.height * 100)}%
              </span>
              <button
                className="icon-button"
                type="button"
                onClick={() => onChange(boxes.filter((_, j) => j !== i))}
                aria-label={`Remove region ${i + 1}`}
                disabled={disabled}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="field-hint">
        Black regions are only a preview until you apply permanent redaction. Cover the entire
        sensitive area, including any edges.
      </p>
    </div>
  );
}
