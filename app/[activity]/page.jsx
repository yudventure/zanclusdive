import { cache } from "react";
import { notFound } from "next/navigation";
import ActivityDetail from "../../src/activities/ActivityDetail.jsx";
import { activityKeys } from "../../src/activity-model.js";
import { publicContent, listBookings } from "../../src/server/store.js";
import { bookingDates, slotCalendar } from "../../src/booking-model.js";
import { requestLocale, languageAlternates } from "../../src/server/locale.js";
import { localizeContent } from "../../src/content-i18n.js";
import { dictionary, localeHref } from "../../src/i18n.js";
import { withCalendar } from "../../src/calendar-model.js";
import { developerGate } from "../../src/server/developer-gate.jsx";
import { paymentsReady } from "../../src/server/payments.js";
import { midtransProduction } from "../../src/server/midtrans.js";

export const dynamic = "force-dynamic";
const readContent = cache(publicContent);

async function activityPage(params) {
  const { activity: key } = await params;
  if (!activityKeys.includes(key)) notFound();
  const locale = await requestLocale();
  const content = withCalendar(localizeContent(await readContent(), locale));
  if (!content.activities[key].enabled) notFound();
  return { key, content, locale };
}
export async function generateMetadata({ params }) {
  const { key, content, locale } = await activityPage(params);
  const activity = content.activities[key];
  const label = dictionary(locale).activityLabels[key];
  return {
    title: `${label} — ${activity.title} | Zanclus Dive Center`,
    description: activity.summary,
    alternates: {
      canonical: localeHref(locale, `/${key}`),
      languages: languageAlternates(`/${key}`),
    },
    openGraph: {
      title: `${label} | Zanclus Dive Center`,
      description: activity.summary,
      ...(process.env.NEXT_PUBLIC_SITE_URL
        ? {
            url: localeHref(locale, `/${key}`),
            images: [{ url: activity.image, alt: activity.imageAlt }],
          }
        : { images: [] }),
    },
  };
}
export default async function Page({ params }) {
  const { key, content, locale } = await activityPage(params);
  const { blocked } = await developerGate(key, content, locale);
  if (blocked) return blocked;
  // Daily places and closed days for the calendar beside the page; without
  // the bookings (database down) the calendar shows every day open.
  const window = bookingDates();
  const bookings = await listBookings().catch(() => []);
  return (
    <ActivityDetail
      activityKey={key}
      content={content}
      locale={locale}
      slots={slotCalendar(content, bookings, key, window)}
      lastDate={window.last}
      payments={{
        ready: paymentsReady(content),
        sandbox: !midtransProduction(),
      }}
      today={window.today}
    />
  );
}
