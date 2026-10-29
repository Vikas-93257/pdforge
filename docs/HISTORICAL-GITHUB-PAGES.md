# Public website from a private source repository

> Historical record: hosting moved from GitHub Pages to Vercel on 2026-10-30. See [docs/VERCEL.md](VERCEL.md) for the current deployment. This file is kept unchanged below for history.

## Selected policy

The user explicitly selected a **public website, private repository and restricted application reuse**. These are different controls:

- Repository privacy limits source-repository access to authorized accounts/Apps.
- The website is deliberately public. Browser-delivered code and assets are inspectable/copyable.
- The application license restricts redistribution of original application material. It does not override applicable law or upstream third-party permissions.
- Production application source maps are disabled. Minification/private source are not technical anti-copy guarantees.

## Actual configuration

- Repository: `https://github.com/Vikas-93257/pdforge` — verified **PRIVATE** when created.
- No additional collaborators were added.
- Pages was configured with `build_type=workflow`, and GitHub returned `public=true` for the **website**.
- Target website: `https://vikas-93257.github.io/pdforge/`.
- Default deployment branch: `main`.
- No plan purchase/upgrade was performed. GitHub accepted private-repository Pages setup for this account.

A configured Pages target can still return 404 before a successful deployment. Use the Actions/deployment status and actual HTTP checks to establish that publication completed.

## Hosting eligibility

GitHub's documentation states that Free includes Pages for public repositories, while private-repository Pages needs an eligible paid account/organization plan. A private repository does not normally make a Pages website private; private website access controls are a separate Enterprise feature. This project intentionally publishes the website publicly.

References:

- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site

If eligibility changes, deployment may stop. **Do not make the source public as a workaround.** Select a suitable static host, configure its real public URL/base path and rerun all verification.

## Workflow

The private-repository guard runs first. Official checkout/setup/Pages/artifact Actions are pinned to verified release commits, with Dependabot proposing updates.

The build job installs Node 22, locked npm dependencies, qpdf, Poppler and Chromium/Firefox/WebKit. It runs formatting plus `CROSS_BROWSER=1 npm run verify`, using `actions/configure-pages` outputs for:

```text
NEXT_PUBLIC_SITE_URL=https://vikas-93257.github.io/pdforge
NEXT_PUBLIC_BASE_PATH=/pdforge
```

There is no public source-repository URL in the exported app. Build/test credentials must never be included in public environment variables or `out`.

The deploy job depends on all gates passing. Only `out` is uploaded as the Pages site. QA artifacts stay under private repository Actions access; they are not copied into the public export. Fixtures are synthetic.

## Owner maintenance

1. Authenticate GitHub CLI/Git with the account authorized for the private repository.
2. Clone the repository privately; never paste access tokens into chat or commit them.
3. Verify repository visibility remains private before pushing:

```bash
gh repo view Vikas-93257/pdforge --json visibility
```

4. Commit to `main` and push. A push triggers the verified workflow. If Pages was temporarily disabled, re-enable GitHub Actions in Settings → Pages and rerun the workflow.
5. Inspect the deployment environment URL and test real tool downloads on the public host.

Review authorized GitHub Apps/collaborators and use strong account authentication. Personal-private-repository access/fork rules differ from organization policies; a private repository is not a guarantee against compromised credentials, authorized copies or service-provider access.

## Custom domain

Configure real DNS/domain verification and HTTPS using GitHub's official instructions, then rerun deployment so canonical links, robots, sitemap and asset paths agree. Do not add a placeholder CNAME or invent a verification token.

https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

## Final public checks

- Home and deep tool URLs respond with HTTP 200; unknown URLs respond 404.
- Canonicals/sitemap identify the actual public hostname/path, never localhost.
- qpdf WASM, PDF.js worker, all OCR LSTM variants, models and fonts load locally.
- Merge, Protect/Unlock and English/Hindi OCR generate real downloads.
- Application licensing is restricted/free-to-use; third-party notices remain intact.
- No private source link, source maps, QA fixtures, repository credentials or document-upload endpoint is published.
- Real-device file pickers/downloads and assistive technologies still need ongoing review.

## Quotas and policy

Free use of the tools does not imply unlimited host bandwidth, private Actions minutes, artifact storage, CPU/RAM or availability. GitHub Pages documentation describes site/bandwidth/deployment limits and commercial-use restrictions. Re-check current rules if the operating model or traffic changes; do not promise unlimited infrastructure or buy upgrades without the owner's approval.

- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features
