import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
process.env.NEXT_TELEMETRY_DISABLED = "1";
for (const [file, args] of [
  [require.resolve("next/dist/bin/next"), ["typegen"]],
  [require.resolve("typescript/bin/tsc"), ["--noEmit"]],
]) {
  const result = spawnSync(process.execPath, [file, ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
