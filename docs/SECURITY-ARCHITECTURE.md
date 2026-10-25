# Processing architecture and security boundaries

## Static by design

Next.js exports HTML, CSS, JavaScript and public assets. Production requires no Node server. `scripts/serve.mjs` is a local static-preview/test server, not an upload or conversion API. It binds to `0.0.0.0`, handles GET/HEAD, rejects upload methods, supplies correct JS/WASM MIME types and optionally compresses public responses.

There is no `src/app/api`, database adapter, authentication system, payment service, document-job telemetry endpoint, cloud conversion API or document store.

## Main modules

| Module                          | Responsibility                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/lib/tools.ts`              | Thirty tool definitions, real output descriptions, instructions and limitations                      |
| `src/lib/operations.ts`         | Input compatibility, selection limits, typed options and dispatch                                    |
| `src/lib/pdf/engine.ts`         | PDF writing/copying, ranges, page operations, text, signatures, forms and metadata                   |
| `src/lib/pdf/render.ts`         | PDF.js rendering, image export, compression selection, raster rebuilds, comparison, image extraction |
| `src/lib/pdf/secure.ts`         | qpdf encryption, known-password decryption, lossless optimization and recovery                       |
| `public/engines/qpdf/runner.js` | Disposable, job-owned qpdf Worker and WebAssembly runtime                                            |
| `src/lib/pdf/convert.ts`        | Selectable-text extraction, real DOCX/CSV generation, DOCX archive preflight                         |
| `src/lib/pdf/convertClient.ts`  | Sanitized local DOCX rendering and searchable OCR PDF assembly                                       |
| `src/lib/pdf/ocrWorker.ts`      | Owned Tesseract Worker protocol bridge, initialization, progress, failure and termination            |
| `src/lib/pdf/imageHeader.ts`    | Header dimension checks before image decoding                                                        |
| `src/lib/pdf/fonts.ts`          | Bundled Latin/Devanagari font embedding and unsupported-character rejection                          |
| `src/components/ToolRunner.tsx` | Session-only file state, progress/errors, controls, download URL lifecycle                           |

## Data flow

1. File metadata is checked before reading: empty files, file count, single/multiple selection, 100 MB/file and 300 MB total.
2. Bytes are read into browser memory. Content signatures must match a supported type; a renamed SVG or text file is not accepted as a PDF/image.
3. Tools load local code/assets as needed. Fonts, OCR language data and runtime binaries are public files, not user-document requests.
4. The selected operation generates real output bytes. Destructive raster operations require explicit confirmation. Password confirmation and page-range validation happen before writing an output.
5. A result appears only after the operation returns nonempty output and the job is not cancelled. The user decides what to download; nothing is auto-uploaded.
6. Clear workspace revokes result/bundle URLs, resets options and signature state, and releases app references. Navigation aborts active jobs and disposes job resources. This is not a forensic RAM-erasure guarantee.

The browser's HTTP cache may cache public code/models/fonts. The app does not intentionally place documents or passwords in cookies, localStorage, sessionStorage, IndexedDB or a service-worker cache. OCR model persistence through Tesseract's IndexedDB cache is disabled.

## qpdf operations

Browser qpdf jobs run in a fresh classic Worker containing their own WASM memory and filesystem. Inputs/outputs are transferred as copies and the Worker is terminated on completion, failure, cancellation or the two-minute qpdf timeout. Passwords remain local, though browser/device compromise can expose memory.

Protection writes real AES-256 encryption. A known password is required for unlocking encrypted input. Minimum protection password: 8 characters; maximum: 127 UTF-8 bytes, without nulls. PDF permission flags are not DRM guarantees. There is no password guessing/recovery service.

The Node test branch restores the caller's process exit code after the Emscripten CLI call; expected qpdf failures must not silently poison the test process's exit status. Actual operation failures still reject and fail tests when unexpected.

## OCR lifecycle

The app directly owns the pinned Tesseract Worker protocol bridge rather than waiting for a library-created worker to become available after initialization. This lets cancellation terminate the Worker during engine loading, language initialization and recognition. Pending requests are rejected and the Worker, timeout and abort listener are disposed.

English and Hindi `tessdata_fast` models are bundled locally. The Tesseract 7 worker and core are pinned to matching major versions. Relaxed-SIMD, SIMD and non-SIMD LSTM assets are copied and hashed at build time. No CDN fallback is intentionally used by the app.

OCR produces actual recognized UTF-8 text and a searchable PDF text layer. Recognition is probabilistic: review important text. Maximum job time is five minutes; split slower/longer jobs. OCR does not produce a fully tagged accessible PDF or certify its contents.

## Redaction and sanitization

Redaction does not place a removable PDF rectangle over source text. It:

1. renders the visible, rotated/cropped page;
2. covers normalized selected regions on the canvas, including a small edge margin;
3. embeds only the new page image in a newly created PDF;
4. repeats for every page without copying source document objects.

Original source text, image resources, metadata, attachments, forms, links, actions and signatures are not copied. Newly generated generic producer metadata may identify PDFORGE, but not the source author/title. The output is image-only.

Users must cover every sensitive occurrence. The tool does not detect secrets, validate disclosure decisions or claim certified/legal redaction compliance. Rasterization can reduce quality and removes searchability, accessibility structure, forms and signatures.

Sanitize performs the same fresh-image rebuild without selected black regions. It preserves visible information. Metadata editing only changes standard info/XMP; it does not delete source content or attachments. Crop merely changes a visible boundary and must never be treated as redaction.

## Office/text conversion boundaries

PDF → DOCX exports genuine selectable text into a real editable OOXML Word file, with simple paragraph/page boundaries. It does not reconstruct arbitrary typography, charts, graphics, table structure or reading order.

DOCX → PDF preflights the ZIP directory (part count, expanded-size declarations, `word/document.xml`, macro rejection). Mammoth converts supported content to HTML; DOMPurify removes unsafe tags/attributes and non-data image sources. html2canvas renders bounded page slices, then pdf-lib creates an image-based PDF. Headers, footers, complex layouts and Word-specific behavior are not fully reproduced. ZIP preflight is a safeguard, not a full malicious-archive security proof.

PDF → CSV writes actual positional page/row/column/text records. Formula-leading values are escaped to reduce spreadsheet formula execution. The extraction does not validate accounting data or rebuild a spreadsheet.

Bundled fonts support Latin/Devanagari text. Unsupported scripts/emoji are rejected rather than silently turned into missing glyphs. Existing PDF rendering may support additional embedded fonts; that does not imply arbitrary new-text font support.

## Resource controls

- Selection: 100 MB/file, 300 MB total, 50 files.
- Render/export/rebuild previews: up to 150 selected pages; OCR up to 40.
- A render canvas is capped at 16 million pixels; requested DPI can be reduced to fit that budget.
- Input image headers are checked before decode: at most 24 megapixels, 16,384 pixels on either side.
- Raster rebuilds have an 80-megapixel aggregate budget; image-export output is limited to 250 MB.
- OCR has 100-megapixel and 128 MB output budgets, plus a five-minute deadline.
- DOCX ZIP preflight limits part count and declared expansion; rendered DOCX is capped at 150 pages.

These are safeguards, not an assurance that any document below the thresholds will fit in every device. Parsing, decoding, layout and WASM can have higher intermediate-memory requirements. Complex or hostile documents can still exhaust resources. The app is not an antivirus scanner or a hardened malware sandbox.

## Limitations to preserve in future changes

- Do not label an unchanged/placeholder file as a successful conversion or protection operation.
- Do not discard selectable text by default just to claim a compression percentage.
- Do not call visual signatures certificate-backed signing.
- Do not call crop, watermark or metadata editing permanent redaction.
- Do not claim infinite hardware, universally perfect OCR, full Office fidelity, guaranteed rankings or security certification.
- Do not add remote analytics/uploads without changing the architecture, privacy documentation, tests and user disclosures.
- Keep originals unchanged and require review before reliance or sharing.

## Release evidence and future assurance

Unit/browser/native-validator/a11y/Lighthouse/advisory results establish behavior for the tested release and fixtures. They do not prove absence of every defect, standards conformance, exploit or platform difference. Independent security assessment, real assistive-technology testing and real-device browser testing remain valuable before high-risk or large-scale use.
