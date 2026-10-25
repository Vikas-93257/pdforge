import type { NextConfig } from "next";
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  allowedDevOrigins: ["*.e2b.app"],
  experimental: { optimizePackageImports: ["lucide-react"] },
};
export default config;
