# Security policy

This is a local-processing PDF utility, not an independently certified security product.
See `docs/SECURITY-ARCHITECTURE.md` and the website's Security & limitations page.

## Reporting

Repository owners should enable GitHub private vulnerability reporting before launch.
Use that private channel for vulnerabilities in the deployed copy. If it is unavailable,
ask the maintainer for a private reporting route **without disclosing exploit details or
attaching confidential documents to a public issue**.

Include a minimal synthetic fixture, reproduction steps, browser/OS versions, affected
commit, expected behavior and observed behavior. Do not include customer documents,
passwords, private keys or personal information. No security mailbox is invented by this
release; the operator must publish a real contact appropriate for their deployment.

## Updates

The repository includes dependency-update configuration. Review updates, regenerate local
engine assets, and rerun all gates. Update Tesseract's worker and core together. A clean
`npm audit` result is an advisory snapshot, not proof that all dependencies are defect-free.
