import { tiktokPoster } from "../../../../../src/server/video-poster.js";

// The cover of a TikTok video in the video row, from our own server so it
// shows at once. A cover that cannot be had answers 404, and the row
// keeps its plain background.
export const runtime = "nodejs";
export async function GET(_request, { params }) {
  const { platform, id } = await params;
  const cover = platform === "tiktok" ? await tiktokPoster(id) : null;
  if (!cover?.type)
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "public, max-age=600" },
    });
  return new Response(new Uint8Array(cover.data), {
    headers: {
      "Content-Type": cover.type,
      "Content-Length": String(cover.data.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=604800, stale-while-revalidate=2592000",
    },
  });
}
