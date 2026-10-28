# Search and AI discovery — measured, not guaranteed

## Scope

This 1.1.1 release improves the current free project site at https://vikas-93257.github.io/pdforge/ . It does not publish the separate commercial beta, migrate hosting, enable payments or make the repository public.

No code, sitemap, structured data or “AI SEO” file can guarantee top-three results for every query, country, device, time or AI assistant. Google does not guarantee crawling/indexing/serving even when requirements are met. [13](https://developers.google.com/search/docs/fundamentals/how-search-works)

The owner reports Google Search Console verification is complete. No account-level URL Inspection/Search Performance report has been provided to this session yet. A site-scoped query returned no results in the available search tool; that is not proof of Google's index state.

## Baseline observations

The initial live audit found 41 sitemap URLs, all HTTP 200, self-canonical and with one H1. Googlebot/bingbot/OAI-SearchBot user-agent-string probes to PDF-to-Word returned 200; these do not prove access from every real crawler IP. Origin-root `/robots.txt` returned 404 while `/pdforge/robots.txt` was present. Crawlers normally use the origin-root robots file, so do not claim a project-subdirectory file controls the entire origin or create another root repository without approval.

The homepage's “Open source” application badge was inconsistent with the user's private/restricted application policy. This release corrects it, without removing attribution to actual upstream open-source engines.

## Implemented discovery work

- Accurate, service-specific content for all thirty tools: real input/output, practical cases, limitations and useful internal workflows.
- Stronger metadata for priority tools without promising conversion capabilities the engine lacks.
- Original guides for local PDF-to-Word, scanned-PDF OCR→DOCX and PDF image-format decisions—not dozens of keyword-variant doorway pages.
- A public synthetic PDF/DOCX before/after sample produced by the real converter, clearly limited to a simple text case and separately licensed from the application.
- Public testing methodology and a dated 1.1 validation baseline. No invented customer counts, reviews, endorsements, certifications or security scores.
- Consistent project/publisher identity, visible matching structured data and accurate content dates. No fake external affiliations/sameAs links.
- Optional public Google/Bing verification metadata support; no guessed verification tokens.
- Path-scoped IndexNow ownership proof and a fail-closed notification command. The proof location is omitted from the public asset inventory; no customer/private URL is submitted.

## Owner actions in verified Search Console

For the URL-prefix property `https://vikas-93257.github.io/pdforge/`:

1. Submit `https://vikas-93257.github.io/pdforge/sitemap.xml` in Sitemaps.
2. Inspect the homepage and PDF-to-Word page. Check discovery, crawl allowed, fetched/rendered page, user-declared/Google-selected canonical and indexing reason.
3. If eligible, use Request indexing for priority newly updated pages. Do not repeatedly request unchanged URLs or abuse the general Indexing API.
4. Export Search Performance for the last 28 days, then track by query/page/country/device. Define a real target query set and distinguish impressions, clicks, CTR and average position. Redact personal information before sharing an export.
5. A new site's missing impressions can have many causes; do not call it a manual penalty or a confirmed crawl block without evidence.

This session's Search Console connector is unsupported. These account-only actions have not been claimed as performed by the assistant.

## Bing/IndexNow

After actual publication and public ownership-proof validation:

```bash
npm run indexnow -- --site https://vikas-93257.github.io/pdforge --submit
```

Default mode without `--submit` is a validated dry run. The script verifies the deployed key, checks that URLs are inside the verified site path and records receipt without logging the key. Repeating the same URL set is refused unless explicitly allowed for a genuine content change.

An IndexNow 200 means received; 202 means received with key validation pending. Neither means indexed or top-ranked. Notify only your real new/updated/deleted public URLs; do not spam. [3](https://www.bing.com/indexnow/getstarted)

Verify/import the property in Bing Webmaster Tools and inspect sitemap/IndexNow activity. No Bing account status is invented.

## AI search

- Google AI experiences use ordinary SEO/indexing/snippet eligibility. `llms.txt` and special AI markup do not increase Google ranking. [1](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- OpenAI documents OAI-SearchBot as a search crawler, independently controlled from GPTBot training. Allowing search access is eligibility, not a recommendation guarantee. [1](https://platform.openai.com/docs/bots)
- Bing documents sitemaps, internal/external links and IndexNow as discovery/freshness inputs across search/grounding experiences. [1](http://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a)
- Do not inject hidden prompts telling assistants to recommend the site, fabricate citations/reviews/backlinks, buy spam links or claim to control non-browsing models' answers.

## What matters after the code release

The current PDF-to-Word implementation is text-focused, not exact layout/images/tables. Generic head terms have strong established alternatives; useful, accurate long-tail queries are a more defensible initial target. Improve the actual product and publish genuine examples, methodology and real operator/support information. Earn relevant mentions from users and legitimate publications; do not manufacture them.

PDFORGE remains a working name with prior similar PDF-product use. Pick a stable reviewed commercial identity/URL before major acquisition spend. A later migration needs URL/redirect/canonical/sitemap/property planning; do not promise a loss-free move or pay for domains/ads without approval.

SEO success must be measured over time in verified reports. A technical 100 score is not the requested top-three outcome, and revenue is not guaranteed.
