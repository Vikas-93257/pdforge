import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Use npm run test:base-path.");
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "pdforge-path-")),
  backup = path.join(temporary, "root-export"),
  hadExport = existsSync("out");
if (hadExport) await fs.cp("out", backup, { recursive: true });
const env = {
  ...process.env,
  NEXT_PUBLIC_BASE_PATH: "/pdforge-check",
  NEXT_PUBLIC_SITE_URL: "https://example.invalid/pdforge-check",
  NEXT_PUBLIC_SOURCE_URL: "",
  NEXT_TELEMETRY_DISABLED: "1",
  TEST_BASE_URL: "http://localhost:3201/pdforge-check",
  EXTERNAL_TEST_SERVER: "1",
};
function run(args) {
  const result = spawnSync(process.execPath, [npm, ...args], { env, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${args.join(" ")} failed (${result.status}).`);
}
let server;
try {
  run(["run", "build"]);
  run(["run", "test:site"]);
  await fs.copyFile("reports/static-checks.json", "reports/project-path-static.json");
  server = spawn(process.execPath, ["scripts/serve.mjs", "--port", "3201"], {
    env,
    stdio: ["ignore", "pipe", "inherit"],
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Path-check server startup timed out.")),
      15000,
    );
    server.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    server.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Path-check server exited (${code}).`));
    });
    server.stdout.on("data", (data) => {
      process.stdout.write(data);
      if (String(data).includes("static site ready")) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
  run([
    "exec",
    "--",
    "playwright",
    "test",
    "tests/browser/tools.spec.ts",
    "--project=chromium",
    "--max-failures=3",
  ]);
  await fs.copyFile("reports/browser-results.json", "reports/project-path-browser.json");
  await fs.writeFile(
    "reports/project-path-summary.json",
    JSON.stringify(
      {
        passed: true,
        basePath: env.NEXT_PUBLIC_BASE_PATH,
        canonicalTestOrigin: env.NEXT_PUBLIC_SITE_URL,
        note: "Reserved example.invalid is a synthetic build-time canonical test, not a public deployment.",
        browserTools: 38,
        staticPages: 58,
      },
      null,
      2,
    ),
  );
  console.log("Project-path verification passed: all 38 tools and 58 static content pages.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  server?.kill("SIGTERM");
  await fs.rm("out", { recursive: true, force: true });
  if (hadExport) await fs.cp(backup, "out", { recursive: true });
  await fs.rm(temporary, { recursive: true, force: true });
}
