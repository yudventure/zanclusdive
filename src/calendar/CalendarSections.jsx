"use client";
import SectionBanner from "../activities/SectionBanner.jsx";
import { dictionary, localeHref } from "../i18n.js";
import { calendarText } from "../calendar-model.js";

// Small line icons for the ocean care plans, in list order.
const ecoIcons = [
  "M4 18h16M6 18l2-9h8l2 9M9 9V6h6v3",
  "M12 20v-7m0 0c-3 0-5-2-5-5 3 0 5 2 5 5Zm0 0c3 0 5-2 5-5-3 0-5 2-5 5Z",
  "M12 21V9m0 0C9 9 7 7 7 4c3 0 5 2 5 5Zm0 4c3 0 5-2 5-5-3 0-5 2-5 5ZM6 21h12",
  "M4 7l8-4 8 4-8 4-8-4Zm4 2v5c0 1.5 2 3 4 3s4-1.5 4-3V9",
  "M9 3h6v3l2 3v12H7V9l2-3V3Zm-2 9h10",
];

// Popular spots and ocean care plans, shown on the diving page. The dates,
// places and best months are in the calendar beside the page.
export default function CalendarSections({
  calendar,
  whatsapp,
  locale = "en",
}) {
  const t = dictionary(locale).calendarPage;
  const href = (path) => localeHref(locale, path);
  const helpURL = `https://wa.me/${whatsapp}?text=${encodeURIComponent(t.ecoMessage)}`;
  return (
    <>
      <section className="calendar-section" id="spots" data-reveal>
        <SectionBanner
          kind="spots"
          eyebrow={t.spotsEyebrow}
          title={t.spotsTitle}
          intro={t.spotsIntro}
        />
        <ul className="spot-grid">
          {calendar.spots.map((s, i) => (
            <li key={i}>
              <span className="spot-number" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{s.name}</h3>
              {calendarText(s.best, locale) && (
                <p className="spot-best">
                  <small>{t.bestTime}</small>
                  {calendarText(s.best, locale)}
                </p>
              )}
              <p>{calendarText(s.note, locale)}</p>
            </li>
          ))}
        </ul>
        <a className="calendar-link" href={href("/#dive-sites")}>
          {t.onMap} <span aria-hidden="true">↗</span>
        </a>
      </section>

      <section
        className="calendar-section eco-section"
        id="ocean-care"
        data-reveal
      >
        <SectionBanner
          kind="eco"
          eyebrow={t.ecoEyebrow}
          title={t.ecoTitle}
          intro={t.ecoIntro}
        />
        <ul className="eco-grid">
          {calendar.eco.map((e, i) => (
            <li key={i}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d={ecoIcons[i % ecoIcons.length]}
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h3>{calendarText(e.title, locale)}</h3>
              {calendarText(e.when, locale) && (
                <p className="eco-when">{calendarText(e.when, locale)}</p>
              )}
              <p>{calendarText(e.description, locale)}</p>
            </li>
          ))}
        </ul>
        <a
          className="button dark"
          href={helpURL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.ecoJoin} <span aria-hidden="true">↗</span>
        </a>
      </section>
    </>
  );
}
