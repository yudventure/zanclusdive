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
import "./forms.css";
import "../src/components/peta-raja-ampat/peta-raja-ampat.css";
import { dictionary, htmlLang } from "../src/i18n.js";
import { requestLocale, languageAlternates } from "../src/server/locale.js";
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
export default async function RootLayout({ children }) {
  return (
    <html lang={htmlLang[await requestLocale()]}>
      <body>{children}</body>
    </html>
  );
}
