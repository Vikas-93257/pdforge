# PDFORGE 1.1.1 — private-source PDF tools

**Your PDFs. Your device. Your rules.**

Thirty free-to-use PDF tools, local browser processing, English/Hindi OCR, real AES-256 protection, image-based permanent redaction and a responsive interface. No account, document upload API, database, paid conversion service or added PDFORGE watermark.

## Search/discovery release

This SEO-only update targets the existing free project site. It adds accurate tool-specific content, guides and public synthetic evidence, without changing the processing engine or publishing the separate commercial beta. See [search-discovery implementation and owner actions](docs/SEARCH-DISCOVERY.md). No top-three rank, indexing or AI recommendation is guaranteed.

## Source and website visibility

- **Source repository:** private, owner-controlled. Do not change it to public to work around hosting limitations.
- **Website:** public, so anyone can use the tools without receiving repository access.
- **Application license:** restricted-use; see [LICENSE](LICENSE). Official service use is free. Redistribution/mirroring/rehosting of original application material is not granted without separate permission, except as applicable law permits.
- **Third-party components:** retain their own licenses, rights and notices. They are not made proprietary by the application license.
- **Not technical copy protection:** browsers necessarily receive JavaScript, styles, images and WASM. These remain inspectable/copyable. Production application source maps are disabled, but this is not a confidentiality or anti-theft guarantee.
- Earlier separately licensed copies keep any rights already validly granted. Historical 1.0 reports describe that earlier edition, not the current license.

## Deployment

Private repository: `Vikas-93257/pdforge`.

Configured public Pages target: **https://vikas-93257.github.io/pdforge/**. The current deployment status/URL is authoritative in the repository's Actions / `github-pages` environment; a configured target is not proof a deployment has completed.

The included workflow:

1. Requires the repository to be private.
2. Installs exact locked dependencies and all three test engines.
3. Checks formatting, lint, fresh route types, unit tests and the production export.
4. Tests all tool downloads, errors, privacy behavior and accessibility in Chromium, Firefox and Linux WebKit.
5. Independently checks outputs using native qpdf/Poppler and OCR.
6. Gates Lighthouse SEO/accessibility and dependency advisories.
7. Uploads only the static `out` directory and deploys through official, commit-pinned Pages Actions.

The workflow derives the real canonical URL/project path from Pages configuration. It does not publish a private source URL in the public application. Never put credentials in `NEXT_PUBLIC_*`, committed files or the export.

GitHub accepted Pages configuration for this private repository without purchasing/upgrading a plan. In general, private-repository Pages hosting requires an eligible account plan; if that eligibility changes, use an appropriate host rather than making the source public. See [deployment details](docs/GITHUB-PAGES.md).

## Run locally

Use **Node 22 LTS**; Node 20 is not supported for the build/test stack.

```bash
npm ci
npm run build
npm run preview
```

Open http://localhost:3000/. The local preview accepts GET/HEAD, not document uploads. Use `npm run dev` for development.

## The toolkit

| Group    | Tools                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Organize | Merge, split, organize, extract pages, remove pages, rotate, visual comparison                                                                                                 |
| Optimize | Lossless/optional image compression, structural repair, AcroForm flattening                                                                                                    |
| Convert  | PDF to JPG/PNG, JPG/PNG/WebP to PDF, PDF to editable-text DOCX, simplified DOCX to PDF, PDF to text, text to PDF, English/Hindi OCR, embedded-image extraction, positional CSV |
| Edit     | Page numbers, watermark, visual signature, crop, resize, metadata                                                                                                              |
| Secure   | AES-256 opening-password protection, known-password unlock, permanent raster redaction, image-only sanitization                                                                |

### Preserve these limitations

- Compression is lossless by default; measured smallest output wins, and originals are kept when alternatives grow. Image modes can remove searchability/forms/signatures.
- Redaction covers selected pixels before rebuilding **every** page into a fresh image-only PDF. Original source objects are not copied. Cover every sensitive occurrence and independently review.
- Crop is not redaction. Sanitize does not remove visible secrets. Metadata editing is not hidden-content removal.
- Signatures are visual, not certificate-backed identity verification.
- PDF→DOCX exports editable text, not exact layout. DOCX→PDF renders supported content into image-based PDF pages. No Office parity is claimed.
- OCR is probabilistic and needs review. Searchable OCR output is not a fully tagged accessible PDF.
- CSV contains inferred page/row/column/text records, not reconstructed spreadsheets or verified accounting data.
- Keep originals. No standards/security/legal certification or zero-defect promise is made.

## Privacy and limits

Documents are read into browser memory and processed locally. Public engines/models/fonts load from the static host. There are no app analytics, tracking cookies, document-history stores or document-upload APIs. The host still sees ordinary page/asset requests and may log IP/browser headers. A compromised device, extension or altered deployment can defeat this boundary.

Clearing releases application references/revokes download URLs; it does not guarantee forensic RAM erasure or delete downloaded files.

- 100 MB/file; 300 MB/session; 50 selected files.
- 150 rendered pages/run; 40 OCR pages.
- 16 MP/rendered canvas; image headers checked before decode, up to 24 MP and 16,384 pixels per side.
- Additional cumulative pixel/output budgets and job timeouts apply. Device limitations can be reached sooner.

See [processing/security architecture](docs/SECURITY-ARCHITECTURE.md).

## Verification

```bash
sudo apt-get update && sudo apt-get install -y qpdf poppler-utils
npx playwright install --with-deps chromium firefox webkit
CROSS_BROWSER=1 npm run verify
```

The last assignment is POSIX syntax; PowerShell can set `$env:CROSS_BROWSER='1'` first. Native validators should be installed using your OS's equivalent packages.

Other useful commands:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:base-path
npm run test:browser
npm run test:cross-browser
npm run test:independent
npm run test:site
```

`verify` manages a temporary static server on port 3200. Browser/native outputs and reports are generated in gitignored `reports/`. `test:independent` expects actual browser downloads to exist. Project-path checking backs up/restores `out`; do not run it concurrently with another build.

Current release evidence: [release report](docs/RELEASE-REPORT.md). Historical 1.0 measurements are labeled separately. Test documents/passwords are synthetic. A passing suite/advisory snapshot is not proof against every defect or malicious input.

## Maintenance

- Tool catalog/content: `src/lib/tools.ts`, `src/lib/content.ts`.
- Processing: `src/lib/pdf`; UI/session/downloads: `src/components`.
- Local runtime copying/hash inventory: `scripts/assets.mjs`.
- Licenses: `scripts/licenses.mjs`, application `LICENSE`, `public/licenses` and font/model notices.
- Deployment: `.github/workflows/deploy.yml`.

Update Tesseract worker/core together. Review dependency updates, regenerate assets and rerun gates. Keep independent upstream notices intact. Review account security, authorized Apps and collaborators; do not share the private source without the owner's permission.

## Search and public launch

The public export has crawlable tool/guidance pages, unique metadata, truthful structured data, sitemap and real canonical URLs. A technical SEO score is not guaranteed indexing, rank, traffic or AI recommendation. See [SEO notes](docs/SEO.md).

Publish a real operator support/security contact and review the public brand/domain and hosting rules before a broad launch. This repository does not invent an email, registered business or trademark clearance. The application license is a practical project notice, not individualized legal advice; get qualified review for high-stakes enforcement/commercial use.
