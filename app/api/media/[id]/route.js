import { getMedia } from "../../../../src/server/store.js";
export async function GET(request, { params }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id))
    return new Response("Not found", { status: 404 });
  try {
    const media = await getMedia(id);
    if (!media) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(media.data), {
      headers: {
        "Content-Type": media.mime,
        "Content-Length": String(media.data.length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Media unavailable", { status: 503 });
  }
}
