import "./globals.css";
import "./shop.css";
import "./contact.css";
import "./activities.css";
import "./motion.css";
import "./dive-sites.css";
import "./gallery.css";
import "./calendar.css";
import "./activity-page.css";
import "./pay.css";
import "./course.css";
import "./about-service.css";
import "./forms.css";
import "./event-banner.css";
import "../src/components/peta-raja-ampat/peta-raja-ampat.css";
import "./developer.css";
import "./legal.css";
import { headers } from "next/headers";
import { dictionary, htmlLang } from "../src/i18n.js";
import { requestLocale, languageAlternates } from "../src/server/locale.js";
import { currentAdmin } from "../src/server/auth.js";
import { publicContent } from "../src/server/store.js";
import {
  DeveloperBar,
  VisitorPreviewBar,
} from "../src/server/developer-gate.jsx";
import { visitorHeader } from "../src/developer.js";
import ConnectionNotice from "../src/components/ConnectionNotice.jsx";
import { siteUrl } from "../src/seo.js";
// The Google Search Console code from the CMS (SEO & Search Console), or
// GOOGLE_SITE_VERIFICATION in the hosting panel.
async function googleVerification() {
  try {
    return (
      (await publicContent()).seo?.googleVerification ||
      process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
      ""
    );
  } catch {
    return process.env.GOOGLE_SITE_VERIFICATION?.trim() || "";
  }
}
export async function generateMetadata() {
  const locale = await requestLocale();
  const t = dictionary(locale).meta;
  const google = await googleVerification();
  return {
    // Canonical, hreflang and share images as full https addresses.
    metadataBase: new URL(siteUrl()),
    ...(google ? { verification: { google } } : {}),
    title: t.title,
    description: t.description,
    alternates: {
      canonical: locale === "id" ? "/id" : "/",
      languages: languageAlternates("/"),
    },
    icons: {
      icon: [
        { url: "/assets/favicon.svg", type: "image/svg+xml" },
        { url: "/assets/favicon.ico" },
      ],
      apple: "/assets/apple-touch-icon-180.png",
    },
    openGraph: {
      title: "Zanclus Dive Center",
      description: t.ogDescription,
      locale: t.ogLocale,
      alternateLocale: locale === "id" ? "en_US" : "id_ID",
      type: "website",
      images: [
        {
          url: "/assets/hero.webp",
          width: 1672,
          height: 941,
          alt: t.heroAlt,
        },
      ],
    },
  };
}
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#062B3B",
};
// What a signed-in admin sees on the public website: the developer mode
// bar, or the bar of a visitor preview.
async function adminView() {
  const all = await headers();
  const path = all.get("x-zanclus-path") || "/";
  if (path.startsWith("/admin") || !(await currentAdmin())) return null;
  if (all.get(visitorHeader) === "1") return { preview: true, path };
  const developer = (await publicContent()).developer;
  return developer?.enabled ? { developer, path } : null;
}
export default async function RootLayout({ children }) {
  const locale = await requestLocale();
  const view = await adminView();
  return (
    <html lang={htmlLang[locale]}>
      <body>
        {children}
        {view?.preview ? (
          <VisitorPreviewBar path={view.path} />
        ) : (
          view && <DeveloperBar developer={view.developer} path={view.path} />
        )}
        <ConnectionNotice locale={locale} />
      </body>
    </html>
  );
}
