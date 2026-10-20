// Zanclus dive gallery under "Explore the ocean". Editable in the CMS; each
// photo has an Indonesian and English caption. Vertical (9:16) videos from
// YouTube, TikTok, Instagram or Facebook play in a row between the ocean
// cards and the gallery button.
export const galleryLimit = 24;
export const videoLimit = 8;
const photo = (src, id, en) => ({ src, caption: { id, en } });
export const defaultGallery = {
  items: [
    photo(
      "/assets/photos/gallery-dive.webp",
      "Menyelam bersama tim Zanclus",
      "Diving with the Zanclus team",
    ),
    photo(
      "/assets/reef.webp",
      "Penyu di antara terumbu",
      "A turtle among the reefs",
    ),
    photo(
      "/assets/photos/ocean-manta.webp",
      "Manta di laut terbuka",
      "A manta in open water",
    ),
    photo(
      "/assets/photos/fan-coral.webp",
      "Warna karang Raja Ampat",
      "The colours of Raja Ampat coral",
    ),
    photo(
      "/assets/photos/fan-turtle.webp",
      "Bertemu penyu",
      "Meeting a turtle",
    ),
    photo(
      "/assets/photos/fan-freedive.webp",
      "Freediving di air jernih",
      "Freediving in clear water",
    ),
    photo(
      "/assets/photos/diving-cover.webp",
      "Lengkungan batu bawah laut",
      "An underwater rock arch",
    ),
    photo(
      "/assets/photos/snorkeling-cover.webp",
      "Snorkeling dekat pulau",
      "Snorkeling near the islands",
    ),
    photo(
      "/assets/photos/fan-beach.webp",
      "Pulau dan pantai",
      "Islands and beaches",
    ),
    photo(
      "/assets/photos/trip-cover.webp",
      "Perjalanan ke pulau",
      "Heading out to the islands",
    ),
  ],
  videos: [],
};

export const galleryCaption = (item, locale) =>
  (locale === "en" && item.caption.en) || item.caption.id;

// The video ID from a YouTube link: Shorts, watch, youtu.be or embed links,
// or a bare 11-character ID. Anything else gives null.
const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
export function youtubeId(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (videoIdPattern.test(text)) return text;
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : "https://" + text);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  const [, kind, rest] = url.pathname.split("/");
  let id = null;
  if (host === "youtu.be") id = kind;
  else if (host === "youtube.com" || host === "youtube-nocookie.com")
    id =
      kind === "watch"
        ? url.searchParams.get("v")
        : ["shorts", "embed", "live"].includes(kind)
          ? rest
          : null;
  return id && videoIdPattern.test(id) ? id : null;
}

export const videoPlatforms = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
};
const tiktokId = /^\d{15,21}$/;
const facebookId = /^\d{6,25}$/;
const instagramCode = /^[A-Za-z0-9_-]{5,40}$/;

// The picture shown while a video's player loads: the owner's own cover,
// YouTube's thumbnail, or TikTok's cover through our server. Instagram and
// Facebook have none without the owner's cover.
export function videoCover(video, source = videoSource(video?.url)) {
  if (video?.poster) return video.poster;
  if (source?.platform === "youtube")
    return `https://i.ytimg.com/vi/${source.id}/hqdefault.jpg`;
  if (source?.platform === "tiktok" && source.id)
    return `/api/video-poster/tiktok/${source.id}`;
  return "";
}

// What a video link points to: { platform, id, url } where url is the
// address to open the video, or { platform, short: true } for share links
// that have to be opened first to find the video (vt.tiktok.com,
// fb.watch, facebook.com/share/…). Anything else gives null.
export function videoSource(value) {
  const text = typeof value === "string" ? value.trim() : "";
  const youtube = youtubeId(text);
  if (youtube)
    return {
      platform: "youtube",
      id: youtube,
      url: `https://youtu.be/${youtube}`,
    };
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : "https://" + text);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol)) return null;
  const fullHost = url.hostname.toLowerCase();
  const host = fullHost.replace(/^(www|m|web|mobile)\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  if (["vm.tiktok.com", "vt.tiktok.com"].includes(fullHost) && parts[0])
    return { platform: "tiktok", short: true };
  if (host === "tiktok.com") {
    if (parts[0] === "t" && parts[1])
      return { platform: "tiktok", short: true };
    let id = null;
    if (parts[0]?.startsWith("@") && parts[1] === "video") id = parts[2];
    else if (parts[0] === "embed") id = parts[1] === "v2" ? parts[2] : parts[1];
    else if (parts[0] === "player" && parts[1] === "v1") id = parts[2];
    else if (parts[0] === "v") id = parts[1]?.replace(/\.html$/, "");
    if (!tiktokId.test(id ?? "")) return null;
    return {
      platform: "tiktok",
      id,
      url: parts[0].startsWith("@")
        ? `https://www.tiktok.com/${parts[0]}/video/${id}`
        : `https://www.tiktok.com/embed/v2/${id}`,
    };
  }
  if (host === "instagram.com" || host === "instagr.am") {
    // /reel/CODE, /p/CODE, /tv/CODE, or /account/reel/CODE.
    const at = parts.findIndex((part) =>
      ["reel", "reels", "p", "tv"].includes(part),
    );
    const code = at >= 0 && at <= 1 ? parts[at + 1] : null;
    if (!instagramCode.test(code ?? "")) return null;
    const kind = parts[at] === "p" ? "p" : "reel";
    return {
      platform: "instagram",
      id: code,
      url: `https://www.instagram.com/${kind}/${code}/`,
    };
  }
  if (fullHost === "fb.watch" && parts[0])
    return { platform: "facebook", short: true };
  if (host === "facebook.com" || host === "fb.com") {
    if (parts[0] === "share" && parts[1] && parts[2])
      return { platform: "facebook", short: true };
    const v = url.searchParams.get("v");
    let id = null;
    let link = null;
    if (parts[0] === "reel") {
      id = parts[1];
      link = `https://www.facebook.com/reel/${id}`;
    } else if (parts[0] === "watch" || parts[0] === "video.php") {
      id = v;
      link = `https://www.facebook.com/watch/?v=${id}`;
    } else if (parts[1] === "videos") {
      id = [...parts.slice(2)].reverse().find((part) => facebookId.test(part));
      link = `https://www.facebook.com/${parts[0]}/videos/${id}/`;
    }
    if (!facebookId.test(id ?? "")) return null;
    return { platform: "facebook", id, url: link };
  }
  return null;
}
