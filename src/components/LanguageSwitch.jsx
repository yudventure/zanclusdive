import { dictionary, localeHref, localeNames, locales } from "../i18n.js";

// `path` is the page's English (root) path; the Indonesian link adds /id.
export default function LanguageSwitch({ locale, path = "/" }) {
  const t = dictionary(locale).language;
  return (
    <div className="language-switch" role="group" aria-label={t.label}>
      {locales.map((code) => (
        <a
          key={code}
          href={localeHref(code, path)}
          hrefLang={code}
          lang={code}
          aria-current={code === locale ? "true" : undefined}
          aria-label={code === locale ? localeNames[code] : t.switchTo}
          title={localeNames[code]}
        >
          {code.toUpperCase()}
        </a>
      ))}
    </div>
  );
}
