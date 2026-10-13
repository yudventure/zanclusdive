import { NextResponse } from "next/server";

// English is served at the root; the Indonesian site lives under /id and is
// rewritten to the same pages with a locale request header.
const indonesianPages =
  /^\/id(\/(diving|snorkeling|trip|course|about|service|dive-shop|calendar))?\/?$/;

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const headers = new Headers(request.headers);
  const match = pathname.match(indonesianPages);
  // The CMS admin is Indonesian-only.
  const admin = pathname === "/admin" || pathname.startsWith("/admin/");
  headers.set("x-zanclus-locale", match || admin ? "id" : "en");
  if (!match) return NextResponse.next({ request: { headers } });
  const url = request.nextUrl.clone();
  url.pathname = match[1] || "/";
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|assets|licenses|favicon).*)"],
};
