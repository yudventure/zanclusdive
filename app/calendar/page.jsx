import CalendarPage from "../../src/calendar/CalendarPage.jsx";
import { publicContent } from "../../src/server/store.js";
import { requestLocale, languageAlternates } from "../../src/server/locale.js";
import { localizeContent } from "../../src/content-i18n.js";
import { withCalendar } from "../../src/calendar-model.js";
import { dictionary, localeHref } from "../../src/i18n.js";
import { isDemo } from "../../src/cms-mode.js";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const locale = await requestLocale();
  const t = dictionary(locale).calendarPage;
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: {
      canonical: localeHref(locale, "/calendar"),
      languages: languageAlternates("/calendar"),
    },
  };
}
export default async function Page() {
  const locale = await requestLocale();
  const content = withCalendar(localizeContent(await publicContent(), locale));
  return (
    <CalendarPage
      content={content}
      locale={locale}
      demo={isDemo()}
      today={new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Jayapura",
      })}
    />
  );
}
