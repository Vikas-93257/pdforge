import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createGzip } from "node:zlib";
const args = process.argv.slice(2),
  port = Number(process.env.PORT || args[args.indexOf("--port") + 1] || 3000),
  root = path.resolve(process.env.STATIC_DIR || "out");
if (!fs.existsSync(path.join(root, "index.html")))
  throw new Error("Build the site first: npm run build");
const info = JSON.parse(fs.readFileSync(path.join(root, "build-info.json"), "utf8")),
  base = info.basePath || "";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".wasm": "application/wasm",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".bcmap": "application/octet-stream",
  ".gz": "application/gzip",
};
const server = http.createServer((req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (!["GET", "HEAD"].includes(req.method || "")) {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end("Static site: uploads are not accepted.");
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url || "/", "http://static.invalid").pathname);
  } catch {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }
  if (pathname.includes("\0") || pathname.includes("\\")) {
    res.writeHead(400);
    res.end("Bad path");
    return;
  }
  if (base && pathname === base) {
    res.writeHead(308, { Location: `${base}/` });
    res.end();
    return;
  }
  if (base && !pathname.startsWith(base + "/")) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  if (base) pathname = pathname.slice(base.length);
  let file = path.resolve(root, "." + pathname);
  if (!file.startsWith(root + path.sep) && file !== root) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  let status = 200;
  try {
    if (fs.statSync(file).isDirectory()) {
      if (!pathname.endsWith("/")) {
        res.writeHead(308, { Location: `${base}${pathname}/` });
        res.end();
        return;
      }
      file = path.join(file, "index.html");
    }
    if (!fs.statSync(file).isFile()) throw new Error("Not a file");
  } catch {
    file = path.join(root, "404.html");
    status = 404;
  }
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = path.extname(file),
    type = mime[ext] || "application/octet-stream";
  res.statusCode = status;
  res.setHeader("Content-Type", type);
  res.setHeader(
    "Cache-Control",
    file.includes(`${path.sep}_next${path.sep}static${path.sep}`)
      ? "public, max-age=31536000, immutable"
      : "public, max-age=0, must-revalidate",
  );
  const gzip =
    /\bgzip\b/.test(req.headers["accept-encoding"] || "") &&
    /\.(html|js|mjs|css|json|xml|txt|svg|wasm|ttf)$/.test(file) &&
    fs.statSync(file).size > 1024;
  if (gzip) {
    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Vary", "Accept-Encoding");
  } else res.setHeader("Content-Length", fs.statSync(file).size);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  const stream = fs.createReadStream(file);
  stream.on("error", () => res.destroy());
  if (gzip) stream.pipe(createGzip({ level: 6 })).pipe(res);
  else stream.pipe(res);
});
server.listen(port, "0.0.0.0", () =>
  console.log(`PDFORGE static site ready on 0.0.0.0:${port}${base}/`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
