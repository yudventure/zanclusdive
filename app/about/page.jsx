import { cache } from "react";
import AboutPage from "../../src/about/AboutPage.jsx";
import { publicContent } from "../../src/server/store.js";
import { requestLocale, languageAlternates } from "../../src/server/locale.js";
import { localizeContent } from "../../src/content-i18n.js";
import { withAbout, aboutText } from "../../src/about-model.js";
import { withCourses } from "../../src/course-model.js";
import { dictionary, localeHref } from "../../src/i18n.js";
import { developerGate } from "../../src/server/developer-gate.jsx";

export const dynamic = "force-dynamic";
const readContent = cache(publicContent);

async function aboutPage() {
  const locale = await requestLocale();
  // Older saved sites get the default About texts and courses.
  const content = withCourses(
    withAbout(localizeContent(await readContent(), locale)),
  );
  return { content, locale };
}
export async function generateMetadata() {
  const { content, locale } = await aboutPage();
  const a = dictionary(locale).about;
  const description = aboutText(content.about.intro, locale);
  return {
    title: a.metaTitle,
    description,
    alternates: {
      canonical: localeHref(locale, "/about"),
      languages: languageAlternates("/about"),
    },
    openGraph: { title: a.metaTitle, description, images: [] },
  };
}
export default async function Page() {
  const { content, locale } = await aboutPage();
  const { blocked } = await developerGate("about", content, locale);
  if (blocked) return blocked;
  return <AboutPage content={content} locale={locale} />;
}
