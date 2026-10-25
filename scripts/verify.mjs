import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Run this script with npm run verify.");
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
function run(name) {
  console.log(`\n===== ${name} =====`);
  const result = spawnSync(process.execPath, [npm, "run", name], { stdio: "inherit", env });
  if (result.status !== 0) throw new Error(`${name} failed (exit ${result.status}).`);
}
let server;
try {
  for (const name of ["lint", "typecheck", "test", "build", "test:site"]) run(name);
  const info = JSON.parse(fs.readFileSync("out/build-info.json", "utf8")),
    port = Number(process.env.VERIFY_PORT || 3200);
  env.TEST_BASE_URL = `http://localhost:${port}${info.basePath || ""}`;
  env.EXTERNAL_TEST_SERVER = "1";
  server = spawn(process.execPath, ["scripts/serve.mjs", "--port", String(port)], {
    env,
    stdio: ["ignore", "pipe", "inherit"],
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Static verification server did not start.")),
      15000,
    );
    server.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    server.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Static server exited (${code}).`));
    });
    server.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      if (String(chunk).includes("static site ready")) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
  run(process.env.CROSS_BROWSER === "1" ? "test:cross-browser" : "test:browser");
  run("test:independent");
  run("audit:seo");
  console.log("\n===== Dependency advisory audit =====");
  const audit = spawnSync(process.execPath, [npm, "audit", "--json"], { env, encoding: "utf8" });
  fs.writeFileSync("reports/dependency-audit.json", audit.stdout);
  if (audit.status !== 0)
    throw new Error("Dependency advisories found; see reports/dependency-audit.json.");
  console.log("\nAll verification gates passed. Evidence is in reports/.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  server?.kill("SIGTERM");
}
