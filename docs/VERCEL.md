# Deploying PDFORGE on Vercel (private repo, public site)

Since 2026-10-30 the public site deploys from this private repository to Vercel
instead of GitHub Pages. The application itself is unchanged: a static export,
no servers, no accounts, no document uploads. The GitHub workflow now runs
verification gates only; Vercel's Git integration performs the deployment.

## Owner setup (one time, ~10 minutes)

1. Make the repository private again if it is not. Vercel's Hobby plan deploys
   private repositories; do not keep the source public to work around hosting.
2. In the Vercel dashboard: Add New Project → Import `Vikas-93257/pdforge`.
   - Framework preset: Next.js (the committed `vercel.json` pins the static
     output directory and security headers).
   - Root directory: repository root. Build command and output come from
     `vercel.json`; Node version comes from `package.json` `engines`.
3. Set production environment variables in the Vercel project:
   - `NEXT_PUBLIC_SITE_URL=https://<your-domain>` (canonical origin; baked
     into sitemap, canonical tags, feeds and structured data at build time).
   - Leave `NEXT_PUBLIC_BASE_PATH` unset (root-path hosting).
   - Never put credentials in `NEXT_PUBLIC_*`; they ship to browsers.
4. In GitHub repository Settings → Secrets and variables → Variables, set
   `PUBLIC_SITE_URL` to the same canonical origin so CI gates verify the URLs
   the public site will actually serve.
5. Deploy `main` from Vercel. Preview deployments are automatic for pull
   requests; review them before merging.

## What the automation does

- Every push to `main` runs `.github/workflows/deploy.yml`: private-repo
  check, locked install, native validators, three browser engines, formatting,
  `npm run verify` (lint, typecheck, unit, static export, site checks,
  cross-browser tools, independent output checks, Lighthouse, advisories).
- Vercel deploys `main` independently after its own build. A green gate run
  plus a successful Vercel deployment is the release bar; neither alone is.
- `vercel.json` adds transport/security headers GitHub Pages could not send
  (HSTS, framing, referrer, permissions). There is deliberately no
  Content-Security-Policy yet: WASM engines, workers and blob downloads need
  a carefully tested policy first.

## After each production deployment

- Run the public-host browser/native reruns against the real URL and record
  them (see `public/testing-baseline.json` and the 1.1 `docs/RELEASE-*`).
- Submit the sitemap in Search Console and notify IndexNow, e.g.
  `npm run indexnow -- --site https://<your-domain> --submit`
  (notification receipt is not indexing/rank proof).
- Confirm `https://<your-domain>/404.html` behavior, `/sw.js`, manifest,
  and that no `maps` or source files leak into the export inventory.

## Future serverless note

Static export cannot include Next.js `/api` routes, but a
`framework: null` Vercel project may still ship Vercel Functions from an
`api/` directory alongside the static site. Any future end-to-end encrypted
sync must keep keys and plaintext on-device: the server may only ever see
opaque ciphertext blobs. No sync design that uploads documents is acceptable.
