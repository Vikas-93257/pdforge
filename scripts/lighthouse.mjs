import fs from "node:fs";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { chromium } from "@playwright/test";
const base = (process.env.TEST_BASE_URL || "http://localhost:3000").replace(/\/$/, ""),
  routes = [
    ["home", "/"],
    ["merge", "/tools/merge/"],
    ["ocr", "/tools/ocr/"],
    ["privacy", "/privacy/"],
  ];
fs.mkdirSync("reports/lighthouse", { recursive: true });
const summaries = [];
for (const [name, route] of routes) {
  const chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: [
      "--headless",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-background-networking",
    ],
  });
  try {
    const result = await lighthouse(base + route, {
      port: chrome.port,
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      output: ["json", "html"],
      logLevel: "error",
    });
    if (!result) throw new Error("No Lighthouse report returned");
    fs.writeFileSync(`reports/lighthouse/${name}.json`, result.report[0]);
    fs.writeFileSync(`reports/lighthouse/${name}.html`, result.report[1]);
    const scores = Object.fromEntries(
        Object.entries(result.lhr.categories).map(([id, value]) => [
          id,
          Math.round(value.score * 100),
        ]),
      ),
      failed = Object.entries(result.lhr.audits)
        .filter(
          ([, a]) =>
            a.score !== null &&
            a.score < 1 &&
            a.scoreDisplayMode !== "informative" &&
            a.scoreDisplayMode !== "manual",
        )
        .map(([id, a]) => ({ id, title: a.title, score: a.score, displayValue: a.displayValue }));
    const summary = {
      page: name,
      url: base + route,
      fetchedAt: result.lhr.fetchTime,
      lighthouseVersion: result.lhr.lighthouseVersion,
      scores,
      failedAudits: failed,
    };
    summaries.push(summary);
    console.log(name, scores);
  } finally {
    await chrome.kill();
  }
}
fs.writeFileSync(
  "reports/lighthouse-summary.json",
  JSON.stringify(
    {
      environment:
        "Local production static export; Lighthouse mobile defaults. Not a ranking or field-performance guarantee.",
      results: summaries,
    },
    null,
    2,
  ),
);
if (summaries.some((s) => s.scores.seo < 100 || s.scores.accessibility < 100)) process.exitCode = 1;
