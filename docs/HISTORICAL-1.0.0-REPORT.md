# PDFORGE 1.0.0 — measured release report

**Release date:** 25 October 2026. **Status:** locally verified source and static-preview release; no public repository or remote deployment created.

This is a rebuilt, free, browser-first PDF toolkit based on the selected ZIP 3 prototype. It is an alternative for the thirty listed workflows, not a claim of complete iLovePDF/Microsoft Office parity, zero defects, security certification or guaranteed search/AI placement.

## Final verification

A clean `npm ci` succeeded, installing 526 packages. The previous `.next` directory was removed before running the final verification, so route-type generation and the build did not depend on retained generated files.

The final complete command was:

```bash
CROSS_BROWSER=1 npm run verify
```

| Gate                                     | Observed result                                                                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Locked clean install                     | PASS; postinstall copied local engines and generated notices                                                                 |
| ESLint                                   | PASS, zero warnings allowed                                                                                                  |
| Fresh route type generation + TypeScript | PASS                                                                                                                         |
| Unit tests                               | **83/83 PASS**, 0 failed/skipped; approximately 5.3 seconds                                                                  |
| Production static export                 | PASS; 479 total files, including the export inventory; approximately 39.7 MiB logical payload                                |
| Chromium browser suite                   | **75/75 PASS**                                                                                                               |
| Firefox browser suite                    | **75/75 PASS**                                                                                                               |
| Linux WebKit browser suite               | **75/75 PASS**                                                                                                               |
| Combined browser result                  | **225 PASS, 0 failed, 0 skipped, 0 flaky**, no configured retries; approximately 6.3 minutes                                 |
| Native/output verification               | **30/30 PASS** against the browser downloads left by the final WebKit run                                                    |
| Static content/links/metadata            | **41 pages; 1,660 local references; 0 errors**                                                                               |
| Bundled runtime integrity                | **214 engine-file and 478 exported-payload SHA-256 checks PASS**; font/model/upstream-notice provenance hashes also verified |
| npm advisory snapshot                    | **0 known vulnerabilities** in the queried database                                                                          |
| Source formatting                        | PASS with Prettier                                                                                                           |

Raw combined output: `reports/final-verification.log`. The browser JSON has `expected: 225`, `unexpected: 0`, `skipped: 0`, `flaky: 0`. The clean-install log and JSON advisory/static/native/Lighthouse reports are included with the evidence release.

After identifying the bundled qpdf runtime as 12.2.0, upstream notices were pinned to that exact release and the final static/hash checks were repeated. This attribution-only change does not change the application processing code.

## GitHub project-path verification

A separate production build used:

```text
NEXT_PUBLIC_BASE_PATH=/pdforge-check
NEXT_PUBLIC_SITE_URL=https://example.invalid/pdforge-check
```

`example.invalid` is intentionally a reserved synthetic canonical test value, not a public deployment.

- All **41 content pages** passed metadata, sitemap, asset-path and local-reference validation.
- All **30 real browser tool/download tests passed in Chromium** under `/pdforge-check/`.
- qpdf, PDF.js, OCR language data, all OCR core variants and local fonts resolved correctly under the prefix.
- The script restored the root export afterward; the final full verification rebuilt the root export from source.

Evidence: `reports/project-path.log`, `project-path-static.json`, `project-path-browser.json`, `project-path-summary.json`.

Repeat using `npm run test:base-path`. This intentionally rebuilds twice across a complete test/release cycle; it backs up/restores `out`. Avoid running it at the same time as another build or test job.

## What the browser tests actually check

The 75 cases per engine comprise **30 tool cases and 45 interface/negative/privacy/accessibility cases**. The tool tests use the actual application and download real output; they do not return mocked conversion results.

All thirty tools were exercised:

- Merge, split, organize, extract pages, remove pages, rotate.
- Compress, repair, PDF to JPG, PDF to PNG, images to PDF.
- PDF to Word, Word to PDF, PDF to text, text to PDF.
- Page numbers, watermark, visual signature, protect, known-password unlock.
- Crop, resize, flatten, permanent redaction, OCR.
- Metadata, sanitize, visual comparison, extract images, positional CSV.

Assertions cover output signatures, PDF page counts/order/dimensions/selectable text, ZIP members, genuine OOXML, CSV values, actual password encryption/decryption and image properties—not just filenames or success messages.

Additional coverage includes:

- Search/filter/no-results recovery, real client navigation, a genuine HTTP 404 and keyboard skip link.
- Widths of 320, 390, 768 and 1,440 CSS pixels; actual mobile merge processing.
- Automated axe WCAG A/AA checks on home, merge, sign, redact, privacy and guides, plus selected/result/redaction-preview states.
- Invalid/empty/renamed SVG inputs; impossible ranges; delete-all; bad crop; short/mismatched/wrong passwords; missing signature; unconfirmed destructive operations; missing redaction regions; textless extraction; unrecoverable input; encrypted merge; insufficient input.
- Real English and Hindi OCR, including searchable PDF text and recognized Hindi `भारत`.
- JPEG EXIF orientation; identical PDFs producing zero changed pixels; DOCX macro rejection.
- No cross-origin application requests or document-upload methods during the tool scenarios; no document storage in the tested browser stores.
- Clear workspace revoking downloads and removing typed/drawn signature state; navigation/back not restoring selected documents.
- OCR asset failure/cancellation disposing every Worker, including cancellation during native Worker initialization.

One initial WebKit cancellation test raced a tiny PDF finishing before the test runner could click Cancel. The test was corrected to hold the **real engine request** during that cancellation-only case; normal tool cases still load and run the real engine. The final complete 225-case run passed without retries or flaky cases.

## Independent output checks

Native **qpdf 12.2.0** validated twenty-five actual downloaded PDFs, including encrypted output with its known password. **Poppler 25.03.0** independently interpreted text/pages/pixels. Additional semantic checks confirmed:

1. OCR of a Poppler-rendered DOCX→PDF output recognized the source title/body/table content, rather than a blank/fake conversion. The recorded fixture confidence was 95, not an accuracy guarantee.
2. Redaction and sanitization did not retain the fixture's original selectable secrets, source metadata, attachments, JavaScript/actions or other inspected hidden source objects.
3. A rendered sample pixel inside the redacted area was solid black, `[0, 0, 0, 255]`.
4. Poppler read the expected content after known-password unlocking.

qpdf's browser runtime also reported **12.2.0**, distributed through `@neslinesli93/qpdf-wasm@0.3.0`; its runtime copyright output is recorded. The native validator is a separate executable, not the application's PDF-reading code. These checks do not establish that the upstream engines themselves have no defects.

## Lighthouse measurements

Lighthouse **13.5.0**, mobile defaults, against the locally served **production static export**, 25 October 2026:

| Page      | Performance | Accessibility | Best practices |     SEO |
| --------- | ----------: | ------------: | -------------: | ------: |
| Home      |      **95** |       **100** |        **100** | **100** |
| Merge PDF |      **98** |       **100** |        **100** | **100** |
| OCR PDF   |      **98** |       **100** |        **100** | **100** |
| Privacy   |      **95** |       **100** |        **100** | **100** |

These are **four local lab pages**, not an every-page Lighthouse certification or field Core Web Vitals measurement. The static checker separately inspected all 41 content pages. Performance still has opportunities around unused/legacy framework JavaScript and main-thread work; raw reports preserve those findings rather than hiding them.

A 100 technical SEO score does not guarantee indexing, rank, traffic, AI citations or recommendations. The real public hostname must be supplied by deployment; the local preview intentionally has localhost canonical URLs. See [SEO launch notes](SEO.md).

## Static SEO inventory

- 41 content pages, unique titles, unique descriptions and matching sitemap entries.
- 34 structured-data blocks, all valid JSON with the schema.org context.
- One H1 per content page, English language/viewport declarations, canonical URLs and social metadata.
- 1,660 checked local links/scripts/styles/images and no missing target.
- Genuine 404 responses; framework-generated not-found helper pages excluded from the content-page inventory.
- No fake ratings, testimonials, download counts, AI endorsements or operator/contact identity.

## Test environment

| Component               | Observed version |
| ----------------------- | ---------------- |
| Node / npm              | 22.23.4 / 10.8.2 |
| Next.js / React         | 16.4.3 / 19.3.1  |
| Playwright              | 1.64.1           |
| Chromium                | 156.0.8078.4     |
| Firefox                 | 157.0            |
| Linux WebKit engine     | 27.2             |
| Tesseract worker / core | 7.0.0 / 7.0.0    |
| Native qpdf / Poppler   | 12.2.0 / 25.03.0 |
| Lighthouse / axe-core   | 13.5.0 / 4.14.0  |

Jobs used one test/build worker in a memory-constrained Linux workspace. **Linux WebKit is engine coverage, not certification on real Safari/macOS/iOS.** Real-device file pickers/downloads, assistive technologies and low-memory conditions should be checked on the final deployment.

## Important repaired behaviors

- Removed prototype backend/database/account assumptions for a genuinely static, free release.
- Shipped actual qpdf/PDF.js/OCR runtimes, models and fonts with consistent project-path URLs.
- Matched Tesseract 7 with core 7 and included relaxed-SIMD, SIMD and non-SIMD LSTM variants.
- Replaced misleading/placeholder conversion behavior with genuine downloadable outputs and explicit unsupported cases.
- Made compression lossless by default and kept originals when output would grow.
- Rebuilt redaction/sanitization without original source objects; distinguished crop and visual signatures from stronger security operations.
- Added resource and image-header preflight checks, password/range validation and meaningful failures.
- Owned OCR Workers during initialization, with termination on failure/cancel/timeout.
- Cleared internal signature and file state correctly; revoked download URLs.
- Fixed accessibility contrast, metadata, footer links and generated-type checks for fresh installs.

## Remaining boundaries

- Free/local does not mean unlimited RAM, unlimited hosting bandwidth or support for every malformed PDF.
- DOCX conversions simplify layouts; DOCX→PDF is image-based. PDF→DOCX requires selectable text and exports editable text, not exact layout.
- OCR is probabilistic. Searchable OCR output is not a fully tagged accessible PDF.
- Redaction/sanitization remove searchability, forms and signatures. Users must cover every sensitive occurrence and independently review outputs.
- Crop is not redaction; visual signatures are not certificate-backed signing; permission flags are not DRM.
- ZIP/header safeguards are not an antivirus or proof against all malicious/decompression-bomb inputs.
- The npm audit is a dated advisory snapshot, not an independent security audit.
- MIT applies to the application. Upstream packages/fonts/models retain their own terms. The wrapper's ISC declaration and the exact qpdf Apache-2.0 notices are preserved; this is not legal/trademark clearance.

## Packaging and launch status

The source archive contains the application, lockfile, local runtime assets, fonts/models, tests/fixtures, MIT/upstream notices, detailed documentation, dependency-update configuration and a GitHub Pages Actions workflow. Dependency directories, caches, private environment files and generated exports are excluded.

The static-preview archive contains the exact local/root export plus a dependency-free Node server. Do not publish its localhost canonicals unchanged. Use the source workflow to derive your real Pages/custom-domain URL and rebuild correctly.

The evidence archive contains the final logs/JSON, four full Lighthouse JSON/HTML pairs, browser-produced downloads, project-prefix evidence, provenance and screenshots. Fixtures/output documents are synthetic.

The workflow calls the same verified full gate runner with all three engines. Official Actions releases were read from their repositories, their supported inputs/outputs inspected, and their release commits pinned. YAML/references were statically checked. **The workflow has not been run on a remote GitHub runner**; the operator still needs to enable Pages/Actions and review deployment permissions/settings.

Before public launch: follow [GitHub Pages instructions](GITHUB-PAGES.md), configure a real support/security contact, review the public brand/domain and hosting terms, deploy, check the actual public URL on real devices, then verify search-console ownership and submit the sitemap. No public URL, search ranking or AI recommendation is invented by this release.
