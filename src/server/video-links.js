import { videoSource } from "../gallery.js";

// Share links from the TikTok and Facebook apps (vt.tiktok.com/…,
// fb.watch/…, facebook.com/share/…) only point at a video after a
// redirect. They are opened here, following redirects on these sites only,
// until the address names the video.
const hosts = [
  /^(vm|vt|www|m)\.tiktok\.com$/,
  /^tiktok\.com$/,
  /^fb\.watch$/,
  /^(www\.|m\.|web\.)?facebook\.com$/,
];
const allowed = (url) =>
  url.protocol === "https:" && hosts.some((host) => host.test(url.hostname));

export async function expandVideoLink(value, fetchImpl = fetch) {
  const source = videoSource(value);
  if (!source) return null;
  if (!source.short) return { ...source, link: value.trim() };
  let url = new URL(
    /^https?:\/\//i.test(value.trim())
      ? value.trim()
      : "https://" + value.trim(),
  );
  url.protocol = "https:";
  // A site that cannot be reached leaves the share link as it is.
  try {
    for (let hop = 0; hop < 5 && allowed(url); hop++) {
      const response = await fetchImpl(url, {
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(8000),
      });
      response.body?.cancel?.().catch?.(() => {});
      const location = response.headers.get("location");
      if (response.status < 300 || response.status >= 400 || !location) break;
      url = new URL(location, url);
      const next = videoSource(url.href);
      if (next && !next.short) return { ...next, link: next.url };
    }
  } catch {}
  return { ...source, link: value.trim() };
}
