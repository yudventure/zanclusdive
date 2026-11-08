import { requireAdmin, jsonBody } from "../../../../src/server/auth.js";
import { expandVideoLink } from "../../../../src/server/video-links.js";

export const dynamic = "force-dynamic";
// Opens a TikTok or Facebook share link and returns the full video link.
export async function POST(request) {
  const denied = await requireAdmin(request, "website");
  if (denied) return denied;
  let url;
  try {
    ({ url } = await jsonBody(request, 2000));
  } catch {
    return Response.json({ error: "Link tidak valid." }, { status: 400 });
  }
  if (typeof url !== "string" || url.length > 300)
    return Response.json({ error: "Link tidak valid." }, { status: 400 });
  let source = null;
  try {
    source = await expandVideoLink(url);
  } catch {}
  if (!source)
    return Response.json(
      { error: "Link video belum dikenali." },
      { status: 422 },
    );
  if (source.short)
    return Response.json(
      {
        error:
          "Link pendek belum bisa dibuka dari server. Buka link itu di browser, lalu salin alamat lengkap dari kolom alamat.",
      },
      { status: 422 },
    );
  return Response.json({ url: source.link, platform: source.platform });
}
