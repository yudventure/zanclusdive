import { cache } from "react";
import LegalPage from "../legal/LegalPage.jsx";
import { publicContent } from "./store.js";
import { requestLocale, languageAlternates } from "./locale.js";
import { localizeContent } from "../content-i18n.js";
import { legalPaths, legalText, withLegal } from "../legal-model.js";
import { localeHref } from "../i18n.js";
import { developerGate } from "./developer-gate.jsx";

// The three policy pages share one route: terms, privacy, and reschedule
// and refund. Older saved sites get the default texts.
const readContent = cache(publicContent);

async function legalPage() {
  const locale = await requestLocale();
  const content = withLegal(localizeContent(await readContent(), locale));
  return { content, locale };
}
export async function legalMetadata(kind) {
  const { content, locale } = await legalPage();
  const page = content.legal[kind];
  const title = `${legalText(page.title, locale)} | Zanclus Dive Center`;
  const description = legalText(page.intro, locale).slice(0, 300);
  const path = legalPaths[kind];
  return {
    title,
    description,
    alternates: {
      canonical: localeHref(locale, path),
      languages: languageAlternates(path),
    },
    openGraph: { title, description, images: [] },
  };
}
export async function legalRoute(kind) {
  const { content, locale } = await legalPage();
  const { blocked } = await developerGate(kind, content, locale);
  if (blocked) return blocked;
  return <LegalPage kind={kind} content={content} locale={locale} />;
}
