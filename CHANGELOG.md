# Changelog

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
