import { assetUrl } from "../site";
import { PdfError } from "./engine";
type Runtime = {
  callMain(args: string[]): number;
  FS: { writeFile(path: string, data: Uint8Array): void; readFile(path: string): Uint8Array };
};
type Factory = (options: Record<string, unknown>) => Promise<Runtime>;
export async function runQpdf(
  args: string[],
  bytes: Uint8Array,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  if (signal?.aborted) throw new PdfError("Processing cancelled.", "CANCELLED");
  if (typeof window === "undefined") {
    const mod = await import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ "@neslinesli93/qpdf-wasm"
    );
    const { createRequire } = await import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ "node:module"
    );
    const path = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "node:path");
    const require = createRequire(import.meta.url);
    const engine = await (mod.default as unknown as Factory)({
      locateFile: () =>
        path.join(path.dirname(require.resolve("@neslinesli93/qpdf-wasm")), "qpdf.wasm"),
      noInitialRun: true,
      print: () => {},
      printErr: () => {},
    });
    engine.FS.writeFile("/in.pdf", bytes);
    const previousExitCode = process.exitCode;
    let rc = 0;
    try {
      rc = engine.callMain(args);
    } catch (err) {
      rc = Number((err as { status?: number }).status ?? 2);
    } finally {
      process.exitCode = previousExitCode;
    }
    if (rc !== 0 && rc !== 3)
      throw new PdfError(
        "The PDF engine could not process this file. Check its password or structure.",
        "QPDF",
      );
    try {
      return engine.FS.readFile("/out.pdf").slice();
    } catch {
      throw new PdfError("No recoverable PDF output was produced.", "QPDF");
    }
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(assetUrl("/engines/qpdf/runner.js"));
    let finished = false;
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      worker.terminate();
    };
    const done = (error?: Error, output?: Uint8Array) => {
      if (finished) return;
      finished = true;
      cleanup();
      if (error) reject(error);
      else resolve(output!);
    };
    const cancel = () => done(new PdfError("Processing cancelled.", "CANCELLED"));
    const timer = setTimeout(
      () =>
        done(
          new PdfError("This file took too long to process. Try a smaller document.", "TIMEOUT"),
        ),
      120000,
    );
    signal?.addEventListener("abort", cancel, { once: true });
    worker.onmessage = (event: MessageEvent<{ bytes?: ArrayBuffer; error?: string }>) =>
      event.data.bytes
        ? done(undefined, new Uint8Array(event.data.bytes))
        : done(new PdfError(event.data.error || "The local PDF engine failed.", "QPDF"));
    worker.onerror = () =>
      done(
        new PdfError(
          "The local PDF engine could not load. Verify the site’s engine assets and reload.",
          "ENGINE",
        ),
      );
    const copy = bytes.slice();
    worker.postMessage({ args, bytes: copy.buffer }, [copy.buffer]);
  });
}
export async function protectPdf(
  bytes: Uint8Array,
  password: string,
  ownerPassword?: string,
  signal?: AbortSignal,
) {
  if (password.length < 8)
    throw new PdfError("Use at least 8 characters for the opening password.", "INPUT");
  if (new TextEncoder().encode(password).length > 127 || password.includes("\0"))
    throw new PdfError(
      "Use a password of at most 127 UTF-8 bytes, without null characters.",
      "INPUT",
    );
  return runQpdf(
    ["--encrypt", password, ownerPassword || password, "256", "--", "/in.pdf", "/out.pdf"],
    bytes,
    signal,
  );
}
export async function unlockPdf(bytes: Uint8Array, password: string, signal?: AbortSignal) {
  if (password.includes("\0") || new TextEncoder().encode(password).length > 127)
    throw new PdfError(
      "Use a known password of at most 127 UTF-8 bytes without null characters.",
      "INPUT",
    );
  try {
    return await runQpdf(
      [`--password=${password}`, "--decrypt", "/in.pdf", "/out.pdf"],
      bytes,
      signal,
    );
  } catch (err) {
    if (err instanceof PdfError && ["CANCELLED", "ENGINE", "TIMEOUT"].includes(err.code)) throw err;
    throw new PdfError(
      "Could not unlock this document. Check the known open/owner password and file integrity.",
      "PASSWORD",
    );
  }
}
export function losslessOptimize(bytes: Uint8Array, signal?: AbortSignal) {
  return runQpdf(
    [
      "--object-streams=generate",
      "--recompress-flate",
      "--compression-level=9",
      "/in.pdf",
      "/out.pdf",
    ],
    bytes,
    signal,
  );
}
export async function repairPdf(bytes: Uint8Array, signal?: AbortSignal): Promise<Uint8Array> {
  for (const args of [
    ["/in.pdf", "/out.pdf"],
    ["--ignore-xref-streams", "/in.pdf", "/out.pdf"],
  ]) {
    try {
      const output = await runQpdf(args, bytes, signal);
      const { loadPdf } = await import("./engine");
      const doc = await loadPdf(output);
      if (doc.getPageCount() > 0) return output;
    } catch (err) {
      if (err instanceof PdfError && ["CANCELLED", "ENGINE", "TIMEOUT"].includes(err.code))
        throw err;
    }
  }
  try {
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(bytes, {
      throwOnInvalidObject: true,
      updateMetadata: false,
    });
    if (!doc.getPageCount()) throw new Error("No pages");
    return await doc.save();
  } catch {
    throw new PdfError(
      "This file is too damaged to recover, or requires unlocking first. No replacement pages have been invented.",
      "UNRECOVERABLE",
    );
  }
}
export async function isEncrypted(bytes: Uint8Array) {
  const { PDFDocument } = await import("pdf-lib");
  try {
    const d = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    return d.isEncrypted;
  } catch {
    return /\/Encrypt\s/.test(new TextDecoder("latin1").decode(bytes));
  }
}
