// Hero video: the owner pastes a YouTube link in the CMS.
const hosts = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
];

// Returns the 11-character video ID, or null for anything that is not a
// YouTube watch/short/embed/live link.
export function youtubeId(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !hosts.includes(url.hostname)) return null;
  const id =
    url.hostname === "youtu.be"
      ? url.pathname.slice(1)
      : url.pathname === "/watch"
        ? url.searchParams.get("v")
        : url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
  return /^[\w-]{11}$/.test(id || "") ? id : null;
}

// Privacy-enhanced player; autoplay starts once the visitor opens it.
export const youtubeEmbed = (id) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
