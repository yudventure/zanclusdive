import { siteUrl } from "../src/seo.js";

// /robots.txt: everything public may be crawled; the admin, its API, the
// private partner pages and payment results may not. Uploaded photos under
// /api/media stay crawlable.
export const dynamic = "force-dynamic";
export default function robots() {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/admin/",
          "/partner/",
          "/payment/",
          "/maintenance",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
