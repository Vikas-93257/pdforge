# PDFORGE 1.1.0 — private-source deployment edition

Release date: 25 October 2026.

## Selected controls

- Source repository: **private** (`Vikas-93257/pdforge`); no extra collaborators added.
- Website: **public**, as explicitly selected by the user.
- Original application: restricted-use licensing, free official-service use.
- Independent third-party libraries/engines/fonts/models: their original licenses remain intact.
- Production application source maps: disabled.
- Public source links/open-source-application claims: removed.
- Deployment workflow: refuses to proceed when the source repository is not private.

These controls are not technical copy prevention. Visitors necessarily receive browser code/assets, and legal enforcement depends on applicable law. Previously granted rights for older separately licensed copies are not revoked.

## Verification status

Local formatting, lint, fresh type generation/typecheck, production build, all 41 static content pages, 478 exported-payload hashes, 214 engine hashes, **88/88 unit tests** and the new policy browser case in all three engines have passed. The dependency advisory snapshot has zero known vulnerabilities. Full remote release CI is pending; the public target is not yet verified live. The authoritative current results are generated in `reports/` and the private Actions artifacts. Do not represent the historical 1.0 results as a completed 1.1 run.

The tool-processing implementation is unchanged by this policy update. New release-policy tests cover application licensing, public copy, source-map settings, the private-repository guard and preserved upstream assets. A browser case checks the actual public-facing license/source text.

Historical evidence is retained in `HISTORICAL-1.0.0-REPORT.md` / `HISTORICAL-1.0.0-SUMMARY.json`. It recorded 83 unit tests, 225 browser tests, native output checks and four local Lighthouse pages, under the earlier edition's policy. It is not proof that the new public deployment has completed.

## Publication

GitHub accepted Pages configuration for the private repository and returned this public target:

https://vikas-93257.github.io/pdforge/

A configured target may be 404 before CI/deployment succeeds. Final status must be established from the actual workflow/deployment and public HTTP/tool checks, not assumed.

## Boundaries preserved

All thirty tools remain free/local. DOCX conversions simplify layouts; DOCX→PDF is image-based. OCR needs review. Visual signatures are not certificate-backed; crop is not redaction; raster redaction/sanitization lose searchability/forms/signatures and require independent review. Resource limits, hosting quotas and unusual/malicious-file risks remain.

No zero-defect/security/legal/trademark certification, search ranking, indexing or AI recommendation is guaranteed. A technical Lighthouse result is a local lab measurement, not public field-performance assurance.
