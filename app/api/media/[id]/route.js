import { getMedia } from "../../../../src/server/store.js";
import { keptCopy, resizedImage } from "../../../../src/server/image-resize.js";
import { mediaWidths } from "../../../../src/photography.js";

const headers = (mime, length) => ({
  "Content-Type": mime,
  "Content-Length": String(length),
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "public, max-age=31536000, immutable",
});
// A photo never changes under its id, so it is kept a year. ?w= asks for a
// smaller WebP copy (480, 828, 1280 or 1920 px wide) for srcset.
export async function GET(request, { params }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id))
    return new Response("Not found", { status: 404 });
  try {
    const asked = Number(new URL(request.url).searchParams.get("w"));
    const width = mediaWidths.find((w) => w >= asked);
    // A copy already made is sent without reading the upload, which in
    // MySQL mode means loading the whole photo from the database.
    const ready = asked > 0 && width ? await keptCopy(id, width) : null;
    if (ready)
      return new Response(new Uint8Array(ready), {
        headers: headers("image/webp", ready.length),
      });
    const media = await getMedia(id);
    if (!media) return new Response("Not found", { status: 404 });
    if (
      asked > 0 &&
      width &&
      ["image/jpeg", "image/png", "image/webp"].includes(media.mime) &&
      media.data.length > 40 * 1024
    ) {
      const small = await resizedImage(id, Buffer.from(media.data), width);
      if (small)
        return new Response(new Uint8Array(small), {
          headers: headers("image/webp", small.length),
        });
    }
    return new Response(new Uint8Array(media.data), {
      headers: headers(media.mime, media.data.length),
    });
  } catch {
    return new Response("Media unavailable", { status: 503 });
  }
}
