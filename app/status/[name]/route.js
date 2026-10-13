import { publicContent } from "../../../src/server/store.js";
import { statusDocument } from "../../../src/status-pages.js";

const standalone = ["404", "403", "500", "502", "503", "504", "offline"];

// Standalone status pages, e.g. /status/504.html?lang=id: for the service
// worker (offline and gateway errors) and for hosting error pages.
export const dynamic = "force-dynamic";
export async function GET(request, { params }) {
  const { name } = await params;
  const kind = name.replace(/\.html$/, "");
  if (!standalone.includes(kind))
    return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const locale = url.searchParams.get("lang") === "id" ? "id" : "en";
  const content = await publicContent();
  return new Response(
    statusDocument({
      kind,
      locale,
      whatsapp: content.contact?.whatsapp,
      switchHref: `/status/${kind}.html?lang=${locale === "id" ? "en" : "id"}`,
    }),
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
        "x-robots-tag": "noindex",
      },
    },
  );
}
