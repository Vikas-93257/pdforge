"use client";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
export default function SignaturePad({
  onChange,
  disabled,
}: {
  onChange: (bytes: Uint8Array | null) => void;
  disabled: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    drawing = useRef(false),
    [mode, setMode] = useState<"type" | "draw">("type"),
    [name, setName] = useState("");
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (mode === "type" && name.trim()) {
      ctx.fillStyle = "#172b25";
      let size = 64;
      ctx.font = `italic ${size}px Georgia,serif`;
      while (ctx.measureText(name).width > 550 && size > 12) {
        size -= 2;
        ctx.font = `italic ${size}px Georgia,serif`;
      }
      ctx.fillText(name, 24, 110);
      let current = true;
      c.toBlob(async (blob) => {
        if (blob) {
          const b = new Uint8Array(await blob.arrayBuffer());
          if (current) onChange(b);
        }
      }, "image/png");
      return () => {
        current = false;
      };
    }
    onChange(null);
  }, [mode, name, onChange]);
  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * e.currentTarget.width,
      y: ((e.clientY - rect.top) / rect.height) * e.currentTarget.height,
    };
  };
  const start = (e: PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "draw" || disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e),
      ctx = e.currentTarget.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#172b25";
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return;
    const p = point(e),
      ctx = e.currentTarget.getContext("2d")!;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const end = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    e.currentTarget.toBlob(async (b) => {
      if (b) onChange(new Uint8Array(await b.arrayBuffer()));
    }, "image/png");
  };
  return (
    <div className="signature-editor">
      <div className="segmented" role="group" aria-label="Signature input method">
        <button
          type="button"
          onClick={() => setMode("type")}
          aria-pressed={mode === "type"}
          disabled={disabled}
        >
          Type signature
        </button>
        <button
          type="button"
          onClick={() => setMode("draw")}
          aria-pressed={mode === "draw"}
          disabled={disabled}
        >
          Draw signature
        </button>
      </div>
      {mode === "type" && (
        <label className="field">
          <span>Your signature text</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={80}
            autoComplete="off"
            disabled={disabled}
          />
        </label>
      )}
      <canvas
        ref={canvas}
        width={600}
        height={180}
        className={mode === "draw" ? "signature-canvas drawing" : "signature-canvas"}
        aria-label={
          mode === "draw"
            ? "Draw your signature here. A keyboard-accessible type signature option is available."
            : "Signature preview"
        }
        role="img"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
      <div className="signature-caption">
        <span>
          {mode === "draw"
            ? "Use your mouse, finger or pen."
            : "Your signature is rendered as an image."}
        </span>
        <button
          type="button"
          className="text-button"
          disabled={disabled}
          onClick={() => {
            canvas.current?.getContext("2d")?.clearRect(0, 0, 600, 180);
            setName("");
            onChange(null);
          }}
        >
          Clear signature
        </button>
      </div>
    </div>
  );
}
