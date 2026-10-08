import "./globals.css";
import "./shop.css";
import "./contact.css";
import "./activities.css";
import "./motion.css";
const siteURL = process.env.NEXT_PUBLIC_SITE_URL;
export const metadata = {
  ...(siteURL ? { metadataBase: new URL(siteURL) } : {}),
  title: "Zanclus Dive Center — Jelajahi laut. Temukan cerita.",
  description:
    "Jelajahi kehidupan bawah laut bersama Zanclus Dive Center. Temukan pengalaman diving dan susun rencana penyelamanmu.",
  icons: {
    icon: [
      { url: "/assets/favicon.svg", type: "image/svg+xml" },
      { url: "/assets/favicon.ico" },
    ],
    apple: "/assets/apple-touch-icon-180.png",
  },
  openGraph: {
    title: "Zanclus Dive Center",
    description: "Jelajahi laut. Temukan cerita.",
    locale: "id_ID",
    type: "website",
    images: siteURL
      ? [
          {
            url: "/assets/hero.webp",
            width: 1672,
            height: 941,
            alt: "Konsep petualangan bawah laut Zanclus",
          },
        ]
      : [],
  },
};
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#062B3B",
};
export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
