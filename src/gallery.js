// Zanclus dive gallery under "Explore the ocean". Editable in the CMS; each
// photo has an Indonesian and English caption. Vertical (9:16) YouTube
// videos play in a row between the ocean cards and the gallery button.
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
