"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Download,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { TOOLS, getTool, type ToolDef } from "@/lib/tools";
import {
  ACCEPT,
  DEFAULT_OPTIONS,
  identifyFile,
  validateSelection,
  type LocalFile,
  type ToolOptions,
} from "@/lib/operations";
import {
  OUTPUT_KIND,
  PIPELINES,
  PIPELINE_EXCLUDED,
  PIPELINE_LIMITS,
  acceptsOutput,
  executePipeline,
  isPipelineEligible,
  type PipelineStage,
} from "@/lib/pipelines";
import { LIMITS, fmtBytes } from "@/lib/site";
import ResultPanel, { type Completed } from "./ResultPanel";
import { DriveOpenButton } from "./DriveButtons";

type CompletedPipeline = Completed & { stages: PipelineStage[] };

export default function PipelineRunner() {
  const [presetId, setPresetId] = useState(PIPELINES[0].id);
  const [custom, setCustom] = useState(false);
  const [chain, setChain] = useState<string[]>(["compress", "sanitize"]);
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [completed, setCompleted] = useState<CompletedPipeline | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const job = useRef<AbortController | null>(null);
  const urls = useRef<string[]>([]);

  const steps = useMemo(
    () =>
      custom
        ? chain.map((slug) => ({ slug }))
        : (PIPELINES.find((p) => p.id === presetId)?.steps ?? []),
    [custom, chain, presetId],
  );
  const firstTool: ToolDef | undefined = getTool(steps[0]?.slug ?? "");
  const needsPassword = steps.some((s) => s.slug === "protect" || s.slug === "unlock");
  const needsConfirm = steps.some((s) => s.slug === "sanitize" || s.slug === "redact");

  const eligibleNext = useMemo(() => {
    if (!chain.length) return TOOLS.filter((t) => isPipelineEligible(t.slug));
    const kind = OUTPUT_KIND[chain[chain.length - 1]];
    if (!kind) return [];
    return TOOLS.filter((t) => isPipelineEligible(t.slug) && acceptsOutput(kind, t.accept));
  }, [chain]);

  const clear = () => {
    job.current?.abort();
    urls.current.forEach(URL.revokeObjectURL);
    urls.current = [];
    setFiles([]);
    setPassword("");
    setConfirm(false);
    setError("");
    setCompleted(null);
    setProgress("");
    if (input.current) input.current.value = "";
  };

  const checkKind = (name: string, bytes: Uint8Array) => {
    if (!firstTool) throw new Error("Choose pipeline steps before adding files.");
    const kind = identifyFile(bytes, name);
    const ok =
      kind === firstTool.accept ||
      (firstTool.accept === "pdf-image" && (kind === "pdf" || kind === "image"));
    if (!ok)
      throw new Error(`“${name}” is not supported ${firstTool.accept} input for this pipeline.`);
  };

  const addFiles = async (selected: File[]) => {
    if (busy || loading || !selected.length) return;
    setError("");
    setLoading(true);
    setCompleted(null);
    try {
      if (!firstTool) throw new Error("Choose pipeline steps before adding files.");
      validateSelection(
        { ...firstTool, multiple: true },
        selected.map((f) => ({ name: f.name, size: f.size })),
        files,
      );
      const loaded: LocalFile[] = [];
      for (const file of selected) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        checkKind(file.name, bytes);
        loaded.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          bytes,
        });
      }
      setFiles((previous) => [...previous, ...loaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The file could not be opened.");
    } finally {
      setLoading(false);
    }
  };

  const addDriveFile = (picked: { name: string; mime: string; bytes: Uint8Array }) => {
    if (busy || loading || !firstTool) return;
    setError("");
    setCompleted(null);
    try {
      validateSelection(
        { ...firstTool, multiple: true },
        [{ name: picked.name, size: picked.bytes.length }],
        files,
      );
      checkKind(picked.name, picked.bytes);
      setFiles((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          name: picked.name,
          type: picked.mime,
          size: picked.bytes.length,
          bytes: picked.bytes,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The file could not be opened.");
    }
  };

  const run = async () => {
    if (busy || loading || !files.length || !steps.length) return;
    if (needsPassword && !password) {
      setError("This pipeline protects or unlocks files. Enter the password first.");
      return;
    }
    setError("");
    setCompleted(null);
    setBusy(true);
    setProgress("Preparing local processing…");
    const controller = new AbortController();
    job.current = controller;
    try {
      const options: ToolOptions = {
        ...DEFAULT_OPTIONS,
        password,
        passwordConfirm: password,
        confirm,
      };
      const result = await executePipeline(steps, files, options, {
        signal: controller.signal,
        onProgress: (_percent, label) => setProgress(label),
      });
      if (controller.signal.aborted) return;
      const links = result.files.map((f) => {
        const url = URL.createObjectURL(new Blob([f.bytes.slice().buffer], { type: f.mime }));
        urls.current.push(url);
        return { url, name: f.name, mime: f.mime, size: f.bytes.length };
      });
      setCompleted({ ...result, links, stages: result.stages });
      setProgress("Processing complete");
    } catch (e) {
      setError(
        controller.signal.aborted
          ? "Processing cancelled. No partial output was saved."
          : e instanceof Error
            ? e.message
            : "Something went wrong while processing. No result was saved.",
      );
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || loading;
  return (
    <section className="workspace" aria-label="Pipeline workspace">
      <div className="workspace-toolbar">
        <span>
          <span className="status-dot" /> LOCAL SESSION{" "}
          <span className="muted">/ no history saved</span>
        </span>
        {(files.length > 0 || completed) && (
          <button type="button" className="text-button" onClick={clear} disabled={disabled}>
            <RefreshCw size={13} aria-hidden="true" /> Clear workspace
          </button>
        )}
      </div>
      <div className="workspace-body">
        <div className="workspace-section-label">01 · CHOOSE A WORKFLOW</div>
        <div className="pipe-mode">
          <button
            type="button"
            className={`button ${custom ? "button-outline" : "button-green"}`}
            aria-pressed={!custom}
            onClick={() => setCustom(false)}
            disabled={disabled}
          >
            Ready-made pipeline
          </button>
          <button
            type="button"
            className={`button ${custom ? "button-green" : "button-outline"}`}
            aria-pressed={custom}
            onClick={() => setCustom(true)}
            disabled={disabled}
          >
            Build your own
          </button>
        </div>
        {!custom ? (
          <label className="pipe-preset">
            <span>Pipeline</span>
            <select
              aria-label="Ready-made pipeline"
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
              disabled={disabled}
            >
              {PIPELINES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <span className="settings-note">
              {PIPELINES.find((p) => p.id === presetId)?.description}
            </span>
            <ol className="pipe-steps">
              {(PIPELINES.find((p) => p.id === presetId)?.steps ?? []).map((s) => (
                <li key={s.slug}>{getTool(s.slug)?.name ?? s.slug}</li>
              ))}
            </ol>
          </label>
        ) : (
          <div className="pipe-builder">
            <ol className="pipe-steps">
              {chain.map((slug, i) => (
                <li key={`${slug}-${i}`}>
                  <span>
                    {i + 1}. {getTool(slug)?.name ?? slug}
                  </span>
                  <span className="pipe-step-buttons">
                    <button
                      type="button"
                      className="text-button"
                      aria-label={`Move ${slug} up`}
                      disabled={disabled || i === 0}
                      onClick={() => {
                        const next = [...chain];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        setChain(next);
                      }}
                    >
                      <ArrowUp size={13} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      aria-label={`Move ${slug} down`}
                      disabled={disabled || i + 1 === chain.length}
                      onClick={() => {
                        const next = [...chain];
                        [next[i + 1], next[i]] = [next[i], next[i + 1]];
                        setChain(next);
                      }}
                    >
                      <ArrowDown size={13} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      aria-label={`Remove ${slug}`}
                      disabled={disabled}
                      onClick={() => setChain(chain.filter((_, k) => k !== i))}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </span>
                </li>
              ))}
            </ol>
            <label className="pipe-preset">
              <span>Add a compatible next step</span>
              <span className="pipe-add">
                <select
                  aria-label="Add a compatible next step"
                  value=""
                  disabled={disabled || chain.length >= PIPELINE_LIMITS.maxSteps}
                  onChange={(e) => {
                    if (e.target.value) setChain([...chain, e.target.value]);
                  }}
                >
                  <option value="">Choose a tool…</option>
                  {eligibleNext.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <Plus size={15} aria-hidden="true" />
              </span>
            </label>
            <p className="settings-note">
              Only steps that can open the previous output are offered.{" "}
              {Object.entries(PIPELINE_EXCLUDED).length} tools need hands-on input and stay
              single-run only.
            </p>
          </div>
        )}
        <div className="workspace-section-label">02 · ADD YOUR FILES</div>
        <input
          hidden
          ref={input}
          id="pipeline-files"
          tabIndex={-1}
          type="file"
          accept={firstTool ? ACCEPT[firstTool.accept] : undefined}
          multiple
          aria-label="Choose files"
          disabled={disabled || !firstTool}
          onChange={(e) => {
            const selected = Array.from(e.target.files ?? []);
            e.target.value = "";
            void addFiles(selected);
          }}
        />
        <div className="drop-zone has-files">
          <div className="upload-icon">
            <Upload size={25} strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h2>{files.length ? "Add another file" : "Drop files here. Keep them here."}</h2>
          <p>
            {firstTool
              ? `Every step runs locally, in order. Starts with ${firstTool.name}.`
              : "Choose steps first."}
          </p>
          <button
            type="button"
            className="button button-green"
            onClick={() => input.current?.click()}
            disabled={disabled || !firstTool}
          >
            {loading ? (
              <>
                <LoaderCircle size={16} className="spin" aria-hidden="true" /> Reading locally…
              </>
            ) : (
              <>Choose files</>
            )}
          </button>
          <span className="drop-help">
            Max 100 MB per file · {LIMITS.files} files and 300 MB total
          </span>
        </div>
        <DriveOpenButton
          accept={firstTool?.accept ?? "pdf"}
          disabled={disabled || !firstTool}
          onPick={addDriveFile}
        />
        {files.length > 0 && (
          <ul className="file-list" aria-label="Selected files">
            {files.map((f) => (
              <li className="file-row" key={f.id}>
                <span>{f.name}</span>
                <small>{fmtBytes(f.size)}</small>
                <button
                  type="button"
                  className="text-button"
                  aria-label={`Remove ${f.name}`}
                  disabled={disabled}
                  onClick={() => setFiles(files.filter((x) => x.id !== f.id))}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {needsPassword && (
          <label className="pipe-preset">
            <span>Password for the protect/unlock step (min 8 characters)</span>
            <input
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={disabled}
            />
          </label>
        )}
        {needsConfirm && (
          <label className="check-row">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              disabled={disabled}
            />
            <span>
              I understand image-rebuilding steps remove original text, forms and signatures.
            </span>
          </label>
        )}
        <div className="workspace-section-label">03 · RUN</div>
        <button
          type="button"
          className="button button-green"
          onClick={() => void run()}
          disabled={disabled || !files.length || !steps.length}
        >
          {busy ? (
            <LoaderCircle size={16} className="spin" aria-hidden="true" />
          ) : (
            <Download size={16} aria-hidden="true" />
          )}
          {busy ? "Running pipeline…" : "Run pipeline"}
        </button>
        {progress && (
          <p className="settings-note" role="status">
            {progress}
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {completed && (
          <div className="result-panel">
            <ol className="pipe-stages" aria-label="Pipeline stages">
              {completed.stages.map((s, i) => (
                <li key={`${s.slug}-${i}`}>
                  Step {i + 1} · {s.name}: {s.inFiles} in → {s.outFiles} out
                </li>
              ))}
            </ol>
            <ResultPanel result={completed} slug="pipeline" />
            <p className="settings-note">
              Prefer the terminal? The same engine runs locally as{" "}
              <Link href="/guides/command-line-pipelines/">a command-line tool</Link>.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
