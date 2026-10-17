import { cache } from "react";
import { notFound } from "next/navigation";
import ServicePage from "../../src/service/ServicePage.jsx";
import { publicContent } from "../../src/server/store.js";
import { requestLocale, languageAlternates } from "../../src/server/locale.js";
import { localizeContent } from "../../src/content-i18n.js";
import { withService } from "../../src/service-model.js";
import { dictionary, localeHref } from "../../src/i18n.js";
import { developerGate } from "../../src/server/developer-gate.jsx";
import { paymentOptions } from "../../src/server/payments.js";

export const dynamic = "force-dynamic";
const readContent = cache(publicContent);

async function servicePage() {
  const locale = await requestLocale();
  const content = withService(localizeContent(await readContent(), locale));
  if (!content.service.items.some((item) => item.enabled)) notFound();
  return { content, locale };
}
export async function generateMetadata() {
  const { locale } = await servicePage();
  const s = dictionary(locale).service;
  return {
    title: s.metaTitle,
    description: s.summary,
    alternates: {
      canonical: localeHref(locale, "/service"),
      languages: languageAlternates("/service"),
    },
    openGraph: { title: s.metaTitle, description: s.summary, images: [] },
  };
}
export default async function Page() {
  const { content, locale } = await servicePage();
  const { locks, blocked } = await developerGate("service", content, locale);
  if (blocked) return blocked;
  return (
    <ServicePage
      content={content}
      locale={locale}
      locks={locks}
      payments={paymentOptions(content)}
    />
  );
}
