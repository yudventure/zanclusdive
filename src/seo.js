// Search engines: the site's own address, the Google Search Console
// verification code, the sitemap entries and the business card Google
// reads from the homepage.
import { legalKeys, legalPaths } from "./legal-model.js";

export const defaultSiteUrl = "https://zanclusdivecenter.com";
// SITE_URL (read at run time) or NEXT_PUBLIC_SITE_URL, else the domain
// the business uses. Only the origin is kept.
export function siteUrl(env = process.env) {
  const raw = (env.SITE_URL || env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (!raw) return defaultSiteUrl;
  try {
    const url = new URL(raw);
    return /^https?:$/.test(url.protocol) ? url.origin : defaultSiteUrl;
  } catch {
    return defaultSiteUrl;
  }
}

export const defaultSeo = { googleVerification: "" };
// Accepts the whole tag Search Console shows,
// <meta name="google-site-verification" content="…" />, or only its code.
export function verificationToken(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  const tag = raw.match(/content\s*=\s*["']([^"']*)["']/i);
  const token = (tag ? tag[1] : raw).trim();
  if (!/^[A-Za-z0-9_-]{10,120}$/.test(token))
    throw new Error(
      "Kode verifikasi Google tidak valid. Di Search Console pilih metode Tag HTML, lalu tempel tag meta atau isi content-nya saja.",
    );
  return token;
}
export function validateSeo(input) {
  return {
    googleVerification: verificationToken(input?.googleVerification ?? ""),
  };
}

// Public pages with an English address and an Indonesian one under /id.
// Activities, courses and services that are switched off are left out.
export function publicPaths(content) {
  const paths = ["/"];
  for (const key of ["diving", "snorkeling", "trip"])
    if (content?.activities?.[key]?.enabled !== false) paths.push("/" + key);
  if (content?.courses?.items?.some((course) => course.enabled))
    paths.push("/course");
  if (content?.service?.items?.some((item) => item.enabled))
    paths.push("/service");
  paths.push("/dive-shop", "/about", ...legalPolicyPaths);
  return paths;
}
// The policy pages change seldom and rank below the activities.
const legalPolicyPaths = legalKeys.map((key) => legalPaths[key]);
const policy = (path) => legalPolicyPaths.includes(path);
const indonesian = (path) => (path === "/" ? "/id" : "/id" + path);
export function sitemapEntries(content, base) {
  return publicPaths(content).flatMap((path) => {
    const languages = {
      en: base + path,
      id: base + indonesian(path),
      "x-default": base + path,
    };
    const shared = {
      changeFrequency:
        path === "/" ? "weekly" : policy(path) ? "yearly" : "monthly",
      priority: path === "/" ? 1 : policy(path) ? 0.3 : 0.8,
      alternates: { languages },
    };
    return [
      { url: languages.en, ...shared },
      { url: languages.id, ...shared },
    ];
  });
}

// schema.org data for the business, from the CMS contact details.
const absolute = (base, url) =>
  !url ? "" : /^https?:\/\//.test(url) ? url : base + url;
export function businessJsonLd(content, base, locale = "en") {
  const contact = content?.contact ?? {};
  const sameAs = ["instagram", "facebook", "tiktok", "youtube"]
    .map((key) => contact[key])
    .filter((url) => typeof url === "string" && url.startsWith("https://"));
  return {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    "@id": base + "/#business",
    name: "Zanclus Dive Center",
    url: base + (locale === "id" ? "/id" : "/"),
    logo: base + "/assets/apple-touch-icon-180.png",
    image: absolute(base, content?.images?.hero || "/assets/hero.webp"),
    description:
      content?.text?.tagline ||
      "Diving, snorkeling and sea trips in Raja Ampat.",
    ...(contact.whatsapp ? { telephone: "+" + contact.whatsapp } : {}),
    ...(contact.email ? { email: contact.email } : {}),
    address: {
      "@type": "PostalAddress",
      ...(contact.location ? { streetAddress: contact.location } : {}),
      addressLocality: "Waisai",
      addressRegion: "Papua Barat Daya",
      addressCountry: "ID",
    },
    areaServed: "Raja Ampat",
    ...(sameAs.length ? { sameAs } : {}),
  };
}
// Safe to put inside a <script> element.
export const jsonLdText = (data) =>
  JSON.stringify(data).replace(/</g, "\\u003c");
