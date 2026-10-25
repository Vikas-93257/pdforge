import { assetUrl } from "../site";
import { PdfError } from "./engine";
/** Minimal bridge to the pinned Tesseract worker protocol. Owning the Worker
 * directly lets us terminate it during initialization as well as recognition. */
export class LocalOcrWorker {
  private worker: Worker;
  private pending = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  private sequence = 0;
  private closed = false;
  private failure: Error = new PdfError("The OCR worker is closed.", "OCR");
  private timer: ReturnType<typeof setTimeout>;
  private abort = () => this.close(new PdfError("Processing cancelled.", "CANCELLED"));
  constructor(
    private signal?: AbortSignal,
    onProgress?: (status: string, progress: number) => void,
  ) {
    if (signal?.aborted) throw new PdfError("Processing cancelled.", "CANCELLED");
    this.worker = new Worker(assetUrl("/engines/ocr/worker.min.js"));
    this.timer = setTimeout(
      () =>
        this.close(
          new PdfError(
            "OCR took longer than five minutes. Split the document into smaller jobs.",
            "TIMEOUT",
          ),
        ),
      300000,
    );
    signal?.addEventListener("abort", this.abort, { once: true });
    this.worker.onerror = (event) => {
      event.preventDefault();
      this.close(
        new PdfError(
          "The local OCR engine could not load. Reload the page or check the hosted engine assets.",
          "ENGINE",
        ),
      );
    };
    this.worker.onmessage = (
      event: MessageEvent<{ jobId: string; status: string; data: unknown }>,
    ) => {
      const { jobId, status, data } = event.data;
      if (this.closed) return;
      if (status === "progress") {
        const message = data as { status?: string; progress?: number };
        onProgress?.(message.status || "Processing", message.progress ?? 0);
        return;
      }
      const pending = this.pending.get(jobId);
      if (!pending) return;
      this.pending.delete(jobId);
      if (status === "resolve") pending.resolve(data);
      else {
        const error = new PdfError(`The local OCR engine failed: ${String(data)}`, "OCR");
        pending.reject(error);
        this.close(error);
      }
    };
  }
  request<T = unknown>(
    action: string,
    payload: Record<string, unknown>,
    transfer: Transferable[] = [],
  ): Promise<T> {
    if (this.closed) return Promise.reject(this.failure);
    const id = `local-${++this.sequence}`;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: (value) => resolve(value as T), reject });
      try {
        this.worker.postMessage(
          { workerId: "pdforge-local", jobId: id, action, payload },
          transfer,
        );
      } catch (error) {
        this.pending.delete(id);
        reject(error);
        this.close(new PdfError("The OCR job could not be sent to the local worker.", "OCR"));
      }
    });
  }
  async initialize(language: "eng" | "hin" | "eng+hin") {
    await this.request("load", {
      options: { lstmOnly: true, corePath: assetUrl("/engines/ocr/"), logging: false },
    });
    await this.request("loadLanguage", {
      langs: language,
      options: {
        langPath: assetUrl("/engines/ocr/lang/"),
        gzip: true,
        cacheMethod: "none",
        lstmOnly: true,
      },
    });
    await this.request("initialize", { langs: language, oem: 1, config: {} });
    await this.request("setParameters", {
      params: { preserve_interword_spaces: "1", user_defined_dpi: "144" },
    });
  }
  close(error?: Error) {
    if (this.closed) return;
    this.closed = true;
    if (error) this.failure = error;
    clearTimeout(this.timer);
    this.signal?.removeEventListener("abort", this.abort);
    this.worker.terminate();
    for (const pending of this.pending.values()) pending.reject(this.failure);
    this.pending.clear();
  }
}
