# Changelog

## 1.7.0 — 2026-10-30 (compliance release)

- Added redaction audit logs: every redaction downloads a deterministic
  Markdown record of regions by page and position plus method and scale.
- Added CLI watch mode: run one tool over a hot folder with stable-file
  detection, per-file receipts, logged skips and --max-files batches.
  Merge, compare and OCR are refused upfront with reasons.
- No accounts, uploads, paywall, e-sign cloud or repository-visibility
  changes; original application source stays private/restricted.

## 1.6.0 — 2026-10-30 (business release)

- Added SHA-256 audit receipts: every app run and every CLI run with
  --receipt records version, timestamp, tool or pipeline, full settings
  and input/output hashes. Passwords and signature bytes are withheld.
- Added team preset packs: save named settings per tool in the browser,
  export JSON packs to share, and import with per-entry added/skipped
  reports. Files and signatures are never stored in presets.
- Added Bates-style numbering to page numbers: optional prefix plus
  zero-padding (EXH-0001…), with honest validation.
- No accounts, uploads, paywall, e-sign cloud or repository-visibility
  changes; original application source stays private/restricted.

## 1.5.0 — 2026-10-30 (intelligence release)

- Added on-device document insight: every tool page reports scanned pages,
  word counts, a stopword-voted language guess, key topics, contact-pattern
  counts, stored title/author and form fields, with fixed-rule next-step
  suggestions. No models, no network calls.
- Added the Inspect PDF tool: downloads the same findings as a Markdown
  report. Available in the app and the CLI; excluded from pipelines because
  it produces a report rather than a processable document.
- Added duplicate-file notices on multi-file tools via content hashing.
- No accounts, uploads, paywall, e-sign cloud, heavy-AI cloud or
  repository-visibility changes; original application source stays
  private/restricted.

## 1.4.0 — 2026-10-30 (ecosystem release)

- Added multi-step pipelines: 8 ready-made workflows plus a custom chain
  builder that only offers compatible next steps. Steps thread file sets
  through, with per-stage counts, default settings and honest gates for
  passwords and image-rebuilding confirms.
- Added a local pdforge CLI with the same engine: single tools, pipelines,
  option overrides, form fields, signatures, JSON output and exit codes.
  OCR and visual Word mode refuse with an explanation instead of failing.
- Added client-side cloud storage: Google Drive, Dropbox and OneDrive over
  OAuth PKCE with least-privilege scopes. Tokens stay in the tab; providers
  stay hidden until the site owner sets public client IDs.
- Fixed the PPTX input label on the file drop zone.
- No accounts, uploads, paywall, e-sign cloud, AI cloud or repository-visibility
  changes; original application source stays private/restricted.

## 1.3.0 — 2026-10-30 (slides + extraction release)

- Added two real tools: PDF to PowerPoint (one editable slide per page with
  detected text, tables and embedded images) and PowerPoint to PDF (searchable
  text-first pages from slide titles, bullets, tables and images). Total is now
  37 tools; still 100% local.
- Added two-column reading order: sustained vertical gutters split column text
  before row grouping, so side-by-side columns no longer merge into one line.
- Added bordered-table detection from PDF vector grid lines: ruled cells split
  exactly on drawn rules instead of positional gaps.
- Embedded native page images into Word, Markdown and PowerPoint exports in
  reading order; spreadsheets keep honest image placeholders.
- Image-only PDFs still redirect to OCR instead of producing empty-image files.
- No accounts, uploads, paywall, e-sign cloud, AI cloud or repository-visibility
  changes; original application source stays private/restricted.

## 1.2.0 — 2026-10-30 (conversion-quality release)

- Added five real tools: PDF to Markdown, PDF to Excel, Excel to PDF, fillable-form
  filling and extractive PDF summaries. Total is now 35 tools; still 100% local.
- Rebuilt PDF to Word as a structured exporter: detected headings, real DOCX tables,
  lists and bold/italic runs instead of flat paragraphs. Complex layouts, charts and
  original images remain simplified by design.
- Made Word to PDF text-first by default (searchable, selectable words and tables)
  with the previous image-based rendering kept as an explicit visual mode.
- Added a hand-rolled local XLSX reader/writer: per-sheet PDF grids, numeric cells,
  ISO date display, shared-string workbooks and formula-injection-safe text cells.
- Published the testing method, dated evidence and limits with the 1.2.0 numbers.
- No accounts, uploads, paywall, e-sign cloud, AI cloud or repository-visibility
  changes; original application source stays private/restricted.

## 1.1.1 — 2026-10-28 (SEO/discovery-only release)

- Corrected the private/restricted application hero badge; upstream open-source attribution retained.
- Added service-specific input/output/limitations/workflow content for all thirty real tools.
- Added three original task guides, public synthetic PDF/DOCX evidence and a dated test-method page.
- Improved priority tool metadata, project identity, visible matching structured data and real content dates.
- Prepared path-scoped, proof-validated IndexNow notifications; no ranking/indexing guarantee.
- No commercial-beta features, hosting migration, payment or repository-visibility changes.

## 1.1.0 — 2026-10-25

- User-selected private-source, publicly usable deployment edition.
- Restricted-use application license; official document tools remain free.
- Preserved all independent third-party licenses and historical grants.
- Removed public source-code links/claims; disabled production application source maps.
- Required a private source repository in the deployment workflow.
- GitHub repository created privately; production deployment is tracked separately.

## 1.0.0 — 2026-10-25

- Rebuilt the supplied PDFORGE prototype as a free, static, browser-first application.
- Removed the database, account/API infrastructure and document-job telemetry.
- Added 30 real tools, local English/Hindi OCR, image-only redaction/sanitization,
  metadata editing, form flattening, visual comparison and positional CSV export.
- Fixed missing qpdf WASM packaging and matched Tesseract 7 worker/core assets, including
  relaxed-SIMD, SIMD and non-SIMD LSTM variants.
- Replaced size-increasing default raster compression with lossless optimization and
  smallest-candidate selection. Image-based compression remains an explicit trade-off.
- Added typed errors, file/format/size checks, page-range validation, pixel/output budgets,
  real progress stages, cancellation, owned/disposable workers and URL cleanup.
- Fixed visible-coordinate placement/cropping for quarter-turn rotated pages, JPEG EXIF
  orientation, blank-page resizing, Hindi font runtime and cleared-signature state.
- Added a responsive interface, keyboard alternatives, contrast fixes, static SEO pages,
  truthful structured data, guides, policy pages and deployment-derived canonical URLs.
- Added Node, browser, accessibility, native-validator and Lighthouse release gates,
  plus a GitHub Pages verification/deployment workflow.

See `docs/RELEASE-REPORT.md` for measured release results and remaining limitations.
