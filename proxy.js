import { NextResponse } from "next/server";
import {
  adminCookie,
  knownLocks,
  pageForPath,
  previewCookie,
  previewMinutes,
  visitorHeader,
} from "./src/developer.js";

// English is served at the root; the Indonesian site lives under /id and is
// rewritten to the same pages with a locale request header.
const indonesianPages =
  /^\/id(\/(diving|snorkeling|trip|course|about|service|dive-shop|calendar|terms|privacy|refund))?\/?$/;
// Open even while the whole website is locked.
const openPaths =
  /^\/(admin|status|maintenance|payment|booking|partner|sw\.js|robots\.txt|sitemap\.xml)(\/|$)/;

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const headers = new Headers(request.headers);
  const match = pathname.match(indonesianPages);
  // The CMS admin is Indonesian-only.
  const admin = pathname === "/admin" || pathname.startsWith("/admin/");
  // Unknown /id/... paths (404s) are Indonesian too.
  const indonesian = match || admin || /^\/id(\/|$)/.test(pathname);
  headers.set("x-zanclus-locale", indonesian ? "id" : "en");
  headers.set("x-zanclus-path", pathname);
  // An admin looking at the website as a visitor.
  const preview = request.nextUrl.searchParams.get("pratinjau");
  const visitor =
    preview === "pengunjung" ||
    (preview !== "admin" &&
      request.cookies.get(previewCookie)?.value === "pengunjung");
  headers.delete(visitorHeader);
  if (visitor) headers.set(visitorHeader, "1");
  let response = maintenance(request, headers, pathname, match, visitor);
  if (!response && !match)
    response = NextResponse.next({ request: { headers } });
  if (!response) {
    const url = request.nextUrl.clone();
    url.pathname = match[1] || "/";
    response = NextResponse.rewrite(url, { request: { headers } });
  }
  if (preview === "pengunjung")
    response.cookies.set(previewCookie, "pengunjung", {
      path: "/",
      maxAge: previewMinutes * 60,
      sameSite: "lax",
      httpOnly: true,
    });
  else if (preview === "admin") response.cookies.delete(previewCookie);
  return response;
}

// Developer mode: a locked website or page answers with the maintenance
// page and a 503. Signed-in admins pass, unless they look as a visitor; the
// page checks their session.
function maintenance(request, headers, pathname, match, visitor) {
  const locks = knownLocks();
  if (!locks || (!locks.site && !Object.keys(locks.pages).length)) return null;
  if (!["GET", "HEAD"].includes(request.method)) return null;
  if (openPaths.test(pathname)) return null;
  if (request.cookies.has(adminCookie) && !visitor) return null;
  const page = pageForPath(match ? match[1] || "/" : pathname);
  if (!locks.site && !(page && locks.pages[page])) return null;
  headers.set("x-zanclus-lock", locks.site ? "site" : "page");
  return NextResponse.rewrite(new URL("/maintenance", request.url), {
    request: { headers },
  });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|assets|licenses|favicon).*)"],
};
