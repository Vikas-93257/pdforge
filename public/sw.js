/* PDFORGE offline cache. Static-site safe: same-origin GET only, versioned cache. */
const VERSION = "pdforge-cache-1.2.0";
const SHELL = ["./", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  // Versioned engine assets (OCR, PDF, fonts) always go direct to network: they are
  // large, content-hashed upstream, and must stay visible to page-level handlers.
  if (new URL(req.url).pathname.includes("/engines/")) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: false }).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((cache) => cache.put(req, copy));
            }
            return res;
          })
          .catch(() =>
            req.mode === "navigate"
              ? caches.match("./").then((home) => {
                  if (!home) throw new Error("offline");
                  return home;
                })
              : Promise.reject(new Error("offline")),
          ),
    ),
  );
});
