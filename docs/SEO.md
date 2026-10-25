# Technical SEO, discoverability and honest expectations

## What the product implements

- Static, crawlable HTML for the home page, 30 functional tool pages, six policy/about pages, a guide index and three practical guides: **41 content pages**.
- Unique titles and descriptions, a real H1, canonical URLs, Open Graph/Twitter metadata and a responsive viewport.
- A deployment-derived sitemap and robots file, plus useful internal links and a genuine HTTP 404.
- Truthful `WebApplication`, `BreadcrumbList`, `WebSite` and guide `Article` structured data. No fabricated ratings, review counts, user counts, awards or author identities.
- Direct descriptions of what each tool does, meaningful instructions, output trade-offs and limitations.
- Local assets, lazy-loaded processing code, no third-party tracking scripts and no remote web fonts.
- An optional factual `llms.txt` overview. It is not claimed to create ranking or AI-inclusion benefits.

`npm run test:site` verifies pages, unique metadata, canonical/sitemap agreement, local references, JSON-LD parsing and local asset hashes. `npm run audit:seo` writes raw Lighthouse JSON/HTML reports and exits nonzero if the tested pages have SEO or accessibility scores below 100. It does not fabricate a score from a checklist.

## A score is not a ranking

Lighthouse's technical SEO category checks a limited set of machine-detectable requirements. A 100 score does not establish content authority, field Core Web Vitals, indexing, domain reputation, a search position or an AI recommendation. Local lab performance is not field performance on the public host.

There is no honest way to promise first place on Google or inclusion as the top answer in every AI assistant. Engines choose what to index, rank, cite or recommend; those decisions change over time.

## Public launch checklist

1. Deploy using the included workflow so the real hostname and project path are baked into HTML, canonical links, social images, robots and sitemap. Do not publish a localhost-canonical preview.
2. Verify ownership of the public domain/property in the relevant search-console products. For a project site without DNS ownership, use the available URL-prefix/HTML-verification method. Add any real verification file under `public/` and rebuild; never invent a verification token.
3. Submit the public `sitemap.xml` and inspect important tool pages after deployment. Confirm they are accessible to crawlers and not blocked/noindexed.
4. Check the deployed site in real browsers and real mobile conditions. Monitor field performance when enough traffic exists.
5. Publish accurate maintainer/contact, source, privacy and limitation information. Keep it current.
6. Build genuinely useful guides based on real user problems. Improve the product and documentation; earn legitimate links, references and user trust. Avoid generated spam, fake mentions, bought reviews and guaranteed-ranking vendors.
7. Review crawl errors, unusual hosting failures and broken links after changes. Re-run gates when the brand, repository path or domain changes.

## AI-search considerations

Google's published AI-search guidance applies ordinary helpful-content and technical-search fundamentals; there is no special AI schema or magic text file that guarantees AI inclusion. Clearly state the product's identity, price, processing architecture, supported tasks and limitations in ordinary readable text. Make the public site and processing documentation inspectable, without exposing the private source repository and cite genuine sources where needed.

Do not equate allowing a crawler with being recommended by it. Do not misrepresent the app as officially endorsed by Google, OpenAI, Anthropic, Microsoft or another engine. The release contains no fake "AI recommended" badge or hidden prompt-injection instructions.

Useful official references:

- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview

## Maintaining the promise

The right ongoing targets are reliable functionality, truthful documentation, accessible interfaces, good real-user performance and verifiable technical hygiene. Re-run lab audits, but do not manipulate the tests or remove honest limitations to make a score look better. Record actual scores and the environment in the release report.
