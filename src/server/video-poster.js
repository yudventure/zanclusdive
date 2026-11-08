import "server-only";
import { publicContent } from "./store.js";
import { videoSource } from "../gallery.js";
import { keepImage, keptImage, resizedImage } from "./image-resize.js";

// The cover picture of a TikTok video in the video row, shown at once
// while TikTok's own player loads. It comes from TikTok's oEmbed answer,
// is made smaller once and kept, and is only fetched for videos that are
// in the row. TIKTOK_OEMBED_URL points local tests at a stand-in.
const oembedUrl = () =>
  process.env.TIKTOK_OEMBED_URL || "https://www.tiktok.com/oembed";
const tiktokImageHost =
  /(^|\.)(tiktokcdn(-[a-z]+)?\.com|tiktok\.com|ibyteimg\.com|byteimg\.com)$/;
function allowedImage(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (process.env.TIKTOK_OEMBED_URL)
      return url.origin === new URL(process.env.TIKTOK_OEMBED_URL).origin;
    return url.protocol === "https:" && tiktokImageHost.test(url.hostname);
  } catch {
    return false;
  }
}
const browser =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// JPEG, PNG or WebP from the first bytes of a picture.
export function imageType(data) {
  if (data[0] === 0xff && data[1] === 0xd8) return "image/jpeg";
  if (data[0] === 0x89 && data[1] === 0x50) return "image/png";
  if (data.subarray(0, 4).toString() === "RIFF") return "image/webp";
  return null;
}

// A failed cover is not asked for again for half an hour.
const failedAt = new Map();
const running = new Map();
async function fetchCover(id) {
  // Videos in the video row and on Dive Shop products.
  const content = await publicContent();
  const links = [
    ...(content.gallery?.videos ?? []).map((v) => v.url),
    ...(content.shop?.products ?? []).flatMap((p) => p.videos ?? []),
  ];
  const video = links
    .map((link) => (typeof link === "string" ? videoSource(link) : null))
    .find((s) => s?.platform === "tiktok" && s.id === id);
  if (!video) return null;
  const answer = await fetch(
    `${oembedUrl()}?url=${encodeURIComponent(video.url)}`,
    {
      headers: { "User-Agent": browser, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!answer.ok) throw new Error("oEmbed " + answer.status);
  const { thumbnail_url: picture } = await answer.json();
  if (!picture || !allowedImage(picture)) throw new Error("no cover");
  const image = await fetch(picture, {
    headers: { "User-Agent": browser, Accept: "image/*" },
    signal: AbortSignal.timeout(10000),
  });
  if (!image.ok) throw new Error("cover " + image.status);
  const data = Buffer.from(await image.arrayBuffer());
  if (!data.length || data.length > 5 * 1024 * 1024 || !imageType(data))
    throw new Error("cover is not a picture");
  const small = await resizedImage(`tiktok-${id}`, data, 540, 72);
  const cover = small ?? data;
  await keepImage(`poster-tiktok-${id}`, cover);
  return cover;
}

// The cover as { data, type }, or null when it cannot be had.
export async function tiktokPoster(id) {
  if (!/^\d{8,25}$/.test(id)) return null;
  const kept = await keptImage(`poster-tiktok-${id}`);
  if (kept?.length) return { data: kept, type: imageType(kept) };
  if (Date.now() - (failedAt.get(id) ?? 0) < 30 * 60 * 1000) return null;
  if (!running.has(id))
    running.set(
      id,
      fetchCover(id)
        .catch((error) => {
          failedAt.set(id, Date.now());
          console.error("TikTok cover not fetched:", error?.message);
          return null;
        })
        .finally(() => running.delete(id)),
    );
  const data = await running.get(id);
  return data ? { data, type: imageType(data) } : null;
}
