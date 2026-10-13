import { cache } from "react";
import { notFound } from "next/navigation";
import CoursePage from "../../src/course/CoursePage.jsx";
import { publicContent } from "../../src/server/store.js";
import { requestLocale, languageAlternates } from "../../src/server/locale.js";
import { localizeContent } from "../../src/content-i18n.js";
import { withCourses } from "../../src/course-model.js";
import { dictionary, localeHref } from "../../src/i18n.js";
import { developerGate } from "../../src/server/developer-gate.jsx";

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
  return <CoursePage content={content} locale={locale} />;
}
