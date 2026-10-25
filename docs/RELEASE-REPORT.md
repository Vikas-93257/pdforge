# PDFORGE 1.1.0 — verified public deployment / private source

**Website:** https://vikas-93257.github.io/pdforge/  
**Private source:** https://github.com/Vikas-93257/pdforge  
**Successful workflow:** https://github.com/Vikas-93257/pdforge/actions/runs/40215942813  
**Deployed application commit:** `c3b8b9e4c07b3e7df93034360f0e4b9c84917b5c`  
**Date:** 25 October 2026.

## Completed controls

- Repository verified **PRIVATE** after publication; no additional collaborators.
- Anonymous GitHub API and raw-source requests returned **404**.
- Website intentionally public, with **HTTPS enforced**, as selected by the user.
- Original application uses the restricted-use license. Official tool use remains free.
- Independent third-party licenses/rights were preserved; nine upstream provenance entries match their recorded hashes.
- Public application source links removed; production application source maps disabled and absent from the public export inventory.
- CI refuses to proceed when the source repository is not private.
- Credentials/private environment files, source files, QA inputs and repository metadata were not included in the site export.

These are not technical copy prevention: browsers necessarily receive the application JavaScript/styles/assets, and these remain inspectable/copyable. Restricted licensing is a legal control, not an anti-theft guarantee. Earlier separately licensed copies retain valid previously granted rights.

## Actual verification results

| Check                                                  | Result                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| GitHub Actions build + deployment                      | **SUCCESS**                                                 |
| CI unit tests                                          | **88/88 passed**, 0 failed/skipped                          |
| CI browsers: Chromium/Firefox/Linux WebKit             | **228/228 passed** — 76 per engine, 0 failed/skipped/flaky  |
| CI independent native/output checks                    | **30/30 passed**; native qpdf 11.9.0                        |
| Actual public website, anonymous Chromium context      | **76/76 passed**, 0 failed/skipped/flaky                    |
| Public-site download checks with native validators/OCR | **30/30 passed**; native qpdf 12.2.0 / Poppler 25.03.0      |
| Static content                                         | **41 pages**, 41 unique titles/descriptions/sitemap entries |
| Local references / export hashes / engine hashes       | **1,660 / 508 / 214 checked**, 0 errors                     |
| npm advisory snapshot                                  | **0 known vulnerabilities**                                 |

All thirty tools generated real downloads on the public host. The public suite also checked invalid inputs, cancellation, English/Hindi OCR, EXIF, identical comparison, workspace/signature clearing, local-processing requests, navigation, responsive layout, keyboard/accessibility states, real 404s and licensing/source-link disclosure.

The native checks inspect actual PDFs and semantic content, including encryption/decryption, source-object removal in redaction/sanitization, black redaction pixels and OCR of the image-based DOCX conversion. Fixtures and passwords are synthetic, not production-user documents.

## Lighthouse on the actual public website

Mobile Lighthouse 13.5.0, 25 October 2026, requested against the real HTTPS deployment:

| Page    | Performance | Accessibility | Best practices | SEO |
| ------- | ----------: | ------------: | -------------: | --: |
| Home    |          98 |           100 |            100 | 100 |
| Merge   |          99 |           100 |            100 | 100 |
| Ocr     |          99 |           100 |            100 | 100 |
| Privacy |          99 |           100 |            100 | 100 |

These are four lab pages, not field Core Web Vitals or an every-page certification. A technical 100 score does not guarantee indexing, search rank, traffic, AI citations or recommendations. Source privacy does not prevent the public website from being indexed.

## Publication and source provenance

The deployed code is the commit shown above. A later documentation-only commit may record these results without redeploying identical application code; the GitHub Pages deployment record remains authoritative for the deployed commit. No billing-plan purchase or upgrade was performed. Private-repository Pages setup was accepted by GitHub for the account.

The current restricted-use application edition does not change independently licensed upstream work. Historical 1.0 records are clearly labeled and are not the current license/deployment status.

## Boundaries and maintenance

DOCX conversions simplify layouts; DOCX→PDF is image-based. OCR needs review. Visual signatures are not certificate-backed. Crop is not redaction. Raster redaction/sanitization lose searchability/forms/signatures and need careful selection/review. Resource/device/hosting limits still apply. Private source is not proof of security or legal/trademark compliance.

Keep account access strong, review authorized Apps/collaborators, publish a real operator support/security contact and re-run release gates after changes. Linux WebKit tests do not certify actual Safari/macOS/iOS or assistive-technology behavior. The advisory report is a dated database snapshot, not an independent security audit.
