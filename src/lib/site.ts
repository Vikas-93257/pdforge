export const SITE_NAME = "PDFORGE";
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
export function assetUrl(path: string) {
  return `${BASE_PATH}/${path.replace(/^\//, "")}`;
}
export function absolute(path: string = "/") {
  return `${SITE_URL}/${path.replace(/^\//, "")}`;
}
export function safeJson(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
export const LIMITS = {
  fileBytes: 100 * 1024 * 1024,
  totalBytes: 300 * 1024 * 1024,
  files: 50,
  renderPages: 150,
  ocrPages: 40,
} as const;
export function fmtBytes(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(3, Math.floor(Math.log(n) / Math.log(1024)));
  return `${Number((n / 1024 ** i).toFixed(i ? 1 : 0))} ${units[i]}`;
}
export function safeFilename(name: string) {
  return (
    name
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
      .replace(/^\.+/, "")
      .slice(0, 160) || "document"
  );
}
