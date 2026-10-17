import { publicContent } from "../../src/server/store.js";
import { statusDocument } from "../../src/status-pages.js";
import { retryAfter } from "../../src/developer.js";

// The maintenance page with a 503 status, so search engines come back
// later instead of dropping the pages. proxy.js shows it in place of a
// locked page and says, in request headers, the language, the path asked
// and whether the whole site or one page is locked. Opened directly, it
// takes ?lang=id and ?page=1 for a preview.
export const dynamic = "force-dynamic";
export async function GET(request) {
  const url = new URL(request.url);
  const asked = request.headers.get("x-zanclus-path");
  const lock = request.headers.get("x-zanclus-lock");
  const locale =
    (lock
      ? request.headers.get("x-zanclus-locale")
      : url.searchParams.get("lang")) === "id"
      ? "id"
      : "en";
  const path = lock && asked ? asked : "/";
  const content = await publicContent();
  const developer = content.developer ?? {};
  const switchPath =
    locale === "id"
      ? path.replace(/^\/id(?=\/|$)/, "") || "/"
      : path === "/"
        ? "/id"
        : "/id" + path;
  return new Response(
    statusDocument({
      kind:
        (lock ?? (url.searchParams.get("page") ? "page" : "site")) === "page"
          ? "page"
          : "maintenance",
      locale,
      whatsapp: content.contact?.whatsapp,
      message: developer.message?.[locale] || developer.message?.id || "",
      until: developer.until || "",
      switchHref: switchPath.startsWith("/") ? switchPath : "/",
    }),
    {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "retry-after": String(retryAfter(developer.until)),
        "x-robots-tag": "noindex",
        "x-zanclus-maintenance": "1",
      },
    },
  );
}
