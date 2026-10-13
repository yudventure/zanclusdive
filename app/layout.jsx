import "./globals.css";
import "./shop.css";
import "./contact.css";
import "./activities.css";
import "./motion.css";
import "./dive-sites.css";
import "./gallery.css";
import "./calendar.css";
import "./activity-page.css";
import "./course.css";
import "./about-service.css";
import "./forms.css";
import "../src/components/peta-raja-ampat/peta-raja-ampat.css";
import "./developer.css";
import { headers } from "next/headers";
import { dictionary, htmlLang } from "../src/i18n.js";
import { requestLocale, languageAlternates } from "../src/server/locale.js";
import { currentAdmin } from "../src/server/auth.js";
import { publicContent } from "../src/server/store.js";
import { DeveloperBar } from "../src/server/developer-gate.jsx";
import ConnectionNotice from "../src/components/ConnectionNotice.jsx";
const siteURL = process.env.NEXT_PUBLIC_SITE_URL;
export async function generateMetadata() {
  const locale = await requestLocale();
  const t = dictionary(locale).meta;
  return {
    ...(siteURL ? { metadataBase: new URL(siteURL) } : {}),
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
      images: siteURL
        ? [
            {
              url: "/assets/hero.webp",
              width: 1672,
              height: 941,
              alt: t.heroAlt,
            },
          ]
        : [],
    },
  };
}
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#062B3B",
};
// Developer mode settings when a signed-in admin views the public website.
async function adminDeveloper() {
  const path = (await headers()).get("x-zanclus-path") || "";
  if (path.startsWith("/admin") || !(await currentAdmin())) return null;
  const developer = (await publicContent()).developer;
  return developer?.enabled ? developer : null;
}
export default async function RootLayout({ children }) {
  const locale = await requestLocale();
  const developer = await adminDeveloper();
  return (
    <html lang={htmlLang[locale]}>
      <body>
        {children}
        {developer && <DeveloperBar developer={developer} />}
        <ConnectionNotice locale={locale} />
      </body>
    </html>
  );
}
