import fs from "node:fs/promises";
import { indexNowPayload } from "../src/lib/searchSubmission";
const args = process.argv.slice(2),
  at = args.indexOf("--site"),
  submit = args.includes("--submit");
const site = (at >= 0 ? args[at + 1] : process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
if (!site) throw new Error("Provide --site with the real deployed public site URL.");
const config = JSON.parse(await fs.readFile("config/search-discovery.json", "utf8"));
const sitemap = await fetch(site + "/sitemap.xml", { signal: AbortSignal.timeout(25000) });
if (!sitemap.ok) throw new Error("The public sitemap is unavailable.");
const xml = await sitemap.text(),
  urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1].replaceAll("&amp;", "&"));
const payload = indexNowPayload(site, config.indexNow.key, config.indexNow.keyFile, urls);
const response = await fetch(payload.keyLocation, { signal: AbortSignal.timeout(20000) });
if (!response.ok || (await response.text()).trim() !== payload.key)
  throw new Error("The ownership proof is not yet published/matching. Nothing was submitted.");
const fingerprint = (await import("node:crypto"))
  .createHash("sha256")
  .update(JSON.stringify(payload.urlList))
  .digest("hex");
let previous: { fingerprint?: string; site?: string } = {};
try {
  previous = JSON.parse(await fs.readFile("reports/indexnow-submission.json", "utf8"));
} catch {}
if (
  submit &&
  previous.site === site &&
  previous.fingerprint === fingerprint &&
  !args.includes("--allow-repeat")
)
  throw new Error(
    "This exact URL set was already notified. Do not resubmit without a real content change.",
  );
if (!submit) {
  console.log(
    JSON.stringify(
      {
        mode: "DRY RUN",
        site,
        urls: urls.length,
        ownershipProofReachable: true,
        submitted: false,
        note: "Use --submit once after a genuine deployment. Receipt never guarantees indexing/rank.",
      },
      null,
      2,
    ),
  );
} else {
  const sent = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });
  const result = {
    site,
    submittedAt: new Date().toISOString(),
    urls: urls.length,
    status: sent.status,
    accepted: [200, 202].includes(sent.status),
    fingerprint,
    meaning:
      sent.status === 202
        ? "Received; key validation pending. Not an indexing/ranking guarantee."
        : "HTTP receipt only; not an indexing/ranking guarantee.",
  };
  await fs.mkdir("reports", { recursive: true });
  await fs.writeFile("reports/indexnow-submission.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (!result.accepted)
    throw new Error(
      `IndexNow did not accept the notification (HTTP ${sent.status}). Do not claim indexing.`,
    );
}
