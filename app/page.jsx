import HomePage from "../src/HomePage.jsx";
import { publicContent } from "../src/server/store.js";
import { requestLocale } from "../src/server/locale.js";
import { localizeContent } from "../src/content-i18n.js";
import { developerGate } from "../src/server/developer-gate.jsx";
import { paymentOptions } from "../src/server/payments.js";
import { activeBanners, withCalendar } from "../src/calendar-model.js";
import { bookingDates } from "../src/booking-model.js";
import { siteUrl, businessJsonLd, jsonLdText } from "../src/seo.js";
export const dynamic = "force-dynamic";
export default async function Page() {
  const locale = await requestLocale();
  const content = localizeContent(await publicContent(), locale);
  const { locks, blocked } = await developerGate("home", content, locale);
  if (blocked) return blocked;
  return (
    <>
      {/* The business card Google reads for search results. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdText(businessJsonLd(content, siteUrl(), locale)),
        }}
      />
      <HomePage
        content={content}
        locale={locale}
        locks={locks}
        payments={paymentOptions(content)}
        // Event banners on today's date in WIT.
        banners={activeBanners(
          withCalendar(content).calendar,
          bookingDates().today,
        )}
      />
    </>
  );
}
