import DiveShop from "../../src/shop/DiveShop.jsx";
import { publicContent } from "../../src/server/store.js";
import { requestLocale, languageAlternates } from "../../src/server/locale.js";
import { localizeContent } from "../../src/content-i18n.js";
import { dictionary } from "../../src/i18n.js";
import { developerGate } from "../../src/server/developer-gate.jsx";
import { paymentOptions } from "../../src/server/payments.js";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const locale = await requestLocale();
  const t = dictionary(locale).meta;
  return {
    title: t.shopTitle,
    description: t.shopDescription,
    alternates: {
      canonical: locale === "id" ? "/id/dive-shop" : "/dive-shop",
      languages: languageAlternates("/dive-shop"),
    },
  };
}
export default async function ShopPage({ searchParams }) {
  const query = await searchParams;
  const locale = await requestLocale();
  const content = localizeContent(await publicContent(), locale);
  const { locks, blocked } = await developerGate("dive-shop", content, locale);
  if (blocked) return blocked;
  return (
    <DiveShop
      locks={locks}
      payments={paymentOptions(content)}
      shop={content.shop}
      contact={content.contact}
      images={content.images}
      activities={content.activities}
      tagline={content.text.tagline}
      locale={locale}
      initialMode={query.mode === "rental" ? "rental" : "sale"}
      today={new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Jayapura",
      })}
    />
  );
}
