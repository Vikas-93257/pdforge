import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "public/engines/**",
    "node_modules/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "reports/**",
  ]),
]);
