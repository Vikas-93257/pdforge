import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
process.env.NEXT_TELEMETRY_DISABLED = "1";
await import("./assets.mjs");
await import("./licenses.mjs");
const require = createRequire(import.meta.url),
  result = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
    stdio: "inherit",
    env: process.env,
  });
if (result.status !== 0) process.exit(result.status || 1);
await import("./postbuild.mjs");
