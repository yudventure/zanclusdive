import { cache } from "react";
import { notFound } from "next/navigation";
import CoursePage from "../../src/course/CoursePage.jsx";
import {
  publicContent,
  listBookings,
  listAgents,
} from "../../src/server/store.js";
import { syncAgents } from "../../src/server/agents.js";
import { agentHolds } from "../../src/agent-calendar.js";
import { bookingDates, slotCalendar } from "../../src/booking-model.js";
import { requestLocale, languageAlternates } from "../../src/server/locale.js";
import { localizeContent } from "../../src/content-i18n.js";
import { withCourses } from "../../src/course-model.js";
import { dictionary, localeHref } from "../../src/i18n.js";
import { developerGate } from "../../src/server/developer-gate.jsx";
import { paymentOptions } from "../../src/server/payments.js";

export const dynamic = "force-dynamic";
const readContent = cache(publicContent);

async function coursePage() {
  const locale = await requestLocale();
  const content = withCourses(localizeContent(await readContent(), locale));
  if (!content.courses.items.some((course) => course.enabled)) notFound();
  return { content, locale };
}
export async function generateMetadata() {
  const { locale } = await coursePage();
  const c = dictionary(locale).course;
  return {
    title: c.metaTitle,
    description: c.summary,
    alternates: {
      canonical: localeHref(locale, "/course"),
      languages: languageAlternates("/course"),
    },
    openGraph: { title: c.metaTitle, description: c.summary, images: [] },
  };
}
export default async function Page() {
  const { content, locale } = await coursePage();
  const { blocked } = await developerGate("course", content, locale);
  if (blocked) return blocked;
  // Courses use the daily diving places and their own closed days; without
  // the bookings (database down) every day shows open.
  const window = bookingDates();
  syncAgents().catch(() => {});
  const [bookings, agents] = await Promise.all([
    listBookings().catch(() => []),
    listAgents().catch(() => []),
  ]);
  const held = [...bookings, ...agentHolds(content, agents)];
  return (
    <CoursePage
      content={content}
      locale={locale}
      payments={paymentOptions(content)}
      slots={{
        ...slotCalendar(content, held, "diving", window),
        closed: slotCalendar(content, held, "course", window).closed,
      }}
      today={window.today}
      lastDate={window.last}
    />
  );
}
