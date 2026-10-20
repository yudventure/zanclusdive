// Zanclus service worker. It only steps in for page loads: without an
// internet connection it shows the offline page, and when the hosting
// answers 502, 503 or 504 it shows our own page for that error. Everything
// else goes straight to the network, so nothing on the website is cached.
const CACHE = "zanclus-status-v1";
const pages = ["offline", "502", "503", "504"];
const assets = [
  "/assets/logo-header-dark.svg",
  "/assets/favicon.svg",
  "/assets/PlusJakartaSans-400.woff2",
  "/assets/PlusJakartaSans-500.woff2",
  "/assets/PlusJakartaSans-600.woff2",
];
const statusURL = (page, lang) => `/status/${page}.html?lang=${lang}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll([
          ...pages.flatMap((page) =>
            ["en", "id"].map((l) => statusURL(page, l)),
          ),
          ...assets,
        ]),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("zanclus-status-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function cached(page, lang, status) {
  const response = await caches.match(statusURL(page, lang));
  if (!response) return null;
  return new Response(response.body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    const lang = /^\/id(\/|$)/.test(url.pathname) ? "id" : "en";
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          // The developer-mode maintenance page is already ours.
          if (
            [502, 503, 504].includes(response.status) &&
            !response.headers.has("x-zanclus-maintenance")
          )
            return (
              (await cached(response.status, lang, response.status)) || response
            );
          return response;
        })
        .catch(
          async () => (await cached("offline", lang, 503)) || Response.error(),
        ),
    );
    return;
  }
  if (assets.includes(url.pathname))
    event.respondWith(
      fetch(request).catch(
        async () => (await caches.match(url.pathname)) || Response.error(),
      ),
    );
});
