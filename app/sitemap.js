import { publicContent } from "../src/server/store.js";
import { defaultContent } from "../src/cms-model.js";
import { siteUrl, sitemapEntries } from "../src/seo.js";

// /sitemap.xml for Google Search Console: every public page in English
// and Indonesian, with hreflang alternates. Read on each request so pages
// switched off in the CMS drop out.
export const dynamic = "force-dynamic";
export default async function sitemap() {
  let content;
  try {
    content = await publicContent();
  } catch {
    content = defaultContent;
  }
  return sitemapEntries(content, siteUrl());
}
