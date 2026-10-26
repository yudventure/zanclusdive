import test from "node:test";
import assert from "node:assert/strict";
import {
  siteUrl,
  defaultSiteUrl,
  verificationToken,
  validateSeo,
  publicPaths,
  sitemapEntries,
  businessJsonLd,
  jsonLdText,
} from "../src/seo.js";
import { defaultContent, validateContent } from "../src/cms-model.js";

test("the site address is an origin, with the business domain by default", () => {
  assert.equal(siteUrl({}), defaultSiteUrl);
  assert.equal(
    siteUrl({ NEXT_PUBLIC_SITE_URL: "https://zanclusdive.com/" }),
    "https://zanclusdive.com",
  );
  // SITE_URL, read at run time, wins over the build-time value.
  assert.equal(
    siteUrl({
      SITE_URL: "https://www.zanclusdivecenter.com/id",
      NEXT_PUBLIC_SITE_URL: "https://x.com",
    }),
    "https://www.zanclusdivecenter.com",
  );
  assert.equal(siteUrl({ SITE_URL: "bukan url" }), defaultSiteUrl);
  assert.equal(siteUrl({ SITE_URL: "ftp://zanclus.com" }), defaultSiteUrl);
});

test("the verification code comes from the tag or on its own", () => {
  const code = "aBcD1234_efGH-5678ijklMNOPqrstuvwxYZ01234567";
  assert.equal(verificationToken(code), code);
  assert.equal(
    verificationToken(
      `<meta name="google-site-verification" content="${code}" />`,
    ),
    code,
  );
  assert.equal(
    verificationToken(
      `  <meta content='${code}' name='google-site-verification'>  `,
    ),
    code,
  );
  assert.equal(verificationToken(""), "");
  assert.equal(verificationToken(undefined), "");
  for (const bad of [
    "google1234abcd.html",
    "short",
    '<meta content="a b c">',
    "x".repeat(121),
  ])
    assert.throws(() => verificationToken(bad), { message: /Tag HTML/ });
  assert.deepEqual(validateSeo(undefined), { googleVerification: "" });
});

test("site content keeps the code, and old content without it still saves", () => {
  const code = "aBcD1234_efGH-5678ijklMNOPqrstuvwxYZ01234567";
  const saved = validateContent({
    ...structuredClone(defaultContent),
    seo: {
      googleVerification: `<meta name="google-site-verification" content="${code}" />`,
    },
  });
  assert.equal(saved.seo.googleVerification, code);
  const old = structuredClone(defaultContent);
  delete old.seo;
  assert.deepEqual(validateContent(old).seo, { googleVerification: "" });
});

test("the sitemap lists public pages in both languages with hreflang", () => {
  const base = "https://zanclusdivecenter.com";
  const content = structuredClone(defaultContent);
  assert.deepEqual(publicPaths(content), [
    "/",
    "/diving",
    "/snorkeling",
    "/trip",
    "/course",
    "/service",
    "/dive-shop",
    "/about",
    "/terms",
    "/privacy",
    "/refund",
  ]);
  const entries = sitemapEntries(content, base);
  assert.equal(entries.length, 22);
  // The policy pages change seldom and rank below the activities.
  const terms = entries.find((e) => e.url === base + "/id/terms");
  assert.equal(terms.priority, 0.3);
  assert.equal(terms.changeFrequency, "yearly");
  assert.deepEqual(
    entries.slice(0, 4).map((e) => e.url),
    [base + "/", base + "/id", base + "/diving", base + "/id/diving"],
  );
  assert.deepEqual(entries[3].alternates.languages, {
    en: base + "/diving",
    id: base + "/id/diving",
    "x-default": base + "/diving",
  });
  assert.equal(entries[0].priority, 1);
  // Pages switched off in the CMS drop out.
  content.activities.trip.enabled = false;
  content.courses.items.forEach((course) => (course.enabled = false));
  const paths = publicPaths(content);
  assert.ok(!paths.includes("/trip") && !paths.includes("/course"));
  // Admin, partner and payment pages are never listed.
  assert.ok(entries.every((e) => !/admin|partner|payment|api/.test(e.url)));
});

test("the business card uses the CMS contact details and is safe in a script", () => {
  const base = "https://zanclusdivecenter.com";
  const content = structuredClone(defaultContent);
  content.contact.instagram = "https://www.instagram.com/zanclus";
  content.contact.location = "Jl. Pelabuhan Waisai";
  content.text.tagline = "Jelajahi laut </script><b>";
  const data = businessJsonLd(content, base, "id");
  assert.equal(data["@type"], "SportsActivityLocation");
  assert.equal(data.url, base + "/id");
  assert.equal(data.telephone, "+" + content.contact.whatsapp);
  assert.equal(data.address.streetAddress, "Jl. Pelabuhan Waisai");
  assert.equal(data.address.addressCountry, "ID");
  assert.deepEqual(data.sameAs, ["https://www.instagram.com/zanclus"]);
  assert.match(data.image, /^https:\/\/zanclusdivecenter\.com\/assets\//);
  const text = jsonLdText(data);
  assert.ok(!text.includes("</script>"));
  assert.equal(JSON.parse(text).description, "Jelajahi laut </script><b>");
});
