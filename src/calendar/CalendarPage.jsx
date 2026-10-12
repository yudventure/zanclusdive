"use client";
import { useEffect, useRef, useState } from "react";
import ScrollEffects from "../components/ScrollEffects.jsx";
import LanguageSwitch from "../components/LanguageSwitch.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import ContactIcon from "../components/ContactIcon.jsx";
import { photoSrcSet } from "../photography.js";
import { activityKeys } from "../activity-model.js";
import { dictionary, intlLocale, localeHref } from "../i18n.js";
import { calendarText, eventsInMonth, monthGrid } from "../calendar-model.js";

const heroImage = "/assets/photos/diving-cover.webp";
const utc = (y, m, d = 1) => new Date(Date.UTC(y, m, d, 12));
const iso = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// Small line icons for the ocean care plans, in list order.
const ecoIcons = [
  "M4 18h16M6 18l2-9h8l2 9M9 9V6h6v3",
  "M12 20v-7m0 0c-3 0-5-2-5-5 3 0 5 2 5 5Zm0 0c3 0 5-2 5-5-3 0-5 2-5 5Z",
  "M12 21V9m0 0C9 9 7 7 7 4c3 0 5 2 5 5Zm0 4c3 0 5-2 5-5-3 0-5 2-5 5ZM6 21h12",
  "M4 7l8-4 8 4-8 4-8-4Zm4 2v5c0 1.5 2 3 4 3s4-1.5 4-3V9",
  "M9 3h6v3l2 3v12H7V9l2-3V3Zm-2 9h10",
];

export default function CalendarPage({ content, locale = "en", demo, today }) {
  const dict = dictionary(locale);
  const t = dict.calendarPage;
  const labels = dict.activityLabels;
  const href = (path) => localeHref(locale, path);
  const calendar = content.calendar;
  const whatsapp = content.contact.whatsapp;
  const motionRoot = useRef(null);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [year, month] = today.split("-").map(Number);
  const [view, setView] = useState({ year, month: month - 1 });
  const [day, setDay] = useState(null);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 12);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  const fmt = (date, options) =>
    date.toLocaleDateString(intlLocale[locale], {
      timeZone: "UTC",
      ...options,
    });
  const longDate = (key) =>
    fmt(new Date(key + "T12:00:00Z"), {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const monthName = fmt(utc(view.year, view.month), {
    month: "long",
    year: "numeric",
  });
  const monthEvents = eventsInMonth(calendar.events, view.year, view.month);
  const shown = day ? monthEvents.filter((e) => e.date === day) : monthEvents;
  const byDay = new Map();
  for (const e of monthEvents)
    byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  function move(delta) {
    const d = utc(view.year, view.month + delta);
    setView({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
    setDay(null);
  }
  const wa = (text) =>
    `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
  const helpURL = wa(t.ecoMessage);
  const jumps = ["calendar", "seasons", "spots", "ocean-care"];
  return (
    <div className="activity-page calendar-page" ref={motionRoot}>
      <ScrollEffects rootRef={motionRoot} />
      <a className="skip-link" href="#calendar">
        {t.skip}
      </a>
      <header className={"site-header" + (scrolled ? " is-scrolled" : "")}>
        <a
          className="brand"
          href={href("/")}
          aria-label={dict.common.homeLabel}
        >
          <img
            src="/assets/logo-header-dark.svg"
            width="176"
            height="44"
            alt="Zanclus Dive Center"
          />
        </a>
        <button
          className="menu-toggle"
          aria-label={menu ? dict.common.closeMenu : dict.common.openMenu}
          aria-expanded={menu}
          aria-controls="calendar-navigation"
          onClick={() => setMenu(!menu)}
        >
          <span />
          <span />
        </button>
        <nav
          id="calendar-navigation"
          className={menu ? "open" : ""}
          aria-label={dict.common.mainNav}
        >
          <a href={href("/")}>{dict.common.home}</a>
          {activityKeys
            .filter((key) => content.activities[key].enabled)
            .map((key) => (
              <a href={href(`/${key}`)} key={key}>
                {labels[key]}
              </a>
            ))}
          <a href={href("/#dive-shop")}>Dive Shop</a>
          <a
            href={href("/calendar")}
            className="active"
            aria-current="page"
            onClick={() => setMenu(false)}
          >
            {t.nav}
          </a>
          <a href={href("/#contact")}>{dict.common.contact}</a>
        </nav>
        <div className="header-actions">
          <LanguageSwitch locale={locale} path="/calendar" />
          <a
            className="button quick-service"
            href={helpURL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={dict.common.quickChat}
          >
            <ContactIcon name="whatsapp" />
            <span className="quick-label">
              <span className="quick-prefix">Chat </span>WhatsApp
            </span>
          </a>
        </div>
      </header>
      <main id="activity-main">
        <section
          className="activity-hero calendar-hero"
          aria-labelledby="calendar-title"
          data-parallax
        >
          <img
            className="activity-hero-photo"
            src={heroImage}
            srcSet={photoSrcSet(heroImage)}
            sizes="100vw"
            alt=""
            width="1672"
            height="941"
            fetchPriority="high"
          />
          <div className="activity-container activity-hero-content">
            <div className="activity-breadcrumb">
              <a href={href("/")}>{dict.common.home}</a>
              <span aria-hidden="true">/</span>
              <span>{t.breadcrumb}</span>
            </div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h1 id="calendar-title">{t.title}</h1>
            <p className="activity-hero-summary">{t.summary}</p>
          </div>
        </section>
        <div className="activity-body">
          <div className="activity-container">
            <div className="activity-jump-links" aria-label={t.sections}>
              {jumps.map((id, i) => (
                <a href={`#${id}`} key={id}>
                  {t.jump[i]}
                </a>
              ))}
            </div>
            {demo && (
              <p className="activity-demo-note activity-demo-banner">
                {t.demoNote}
              </p>
            )}

            <section className="calendar-section" id="calendar" data-reveal>
              <div className="calendar-heading">
                <div>
                  <p className="eyebrow">{t.calendarEyebrow}</p>
                  <h2>{t.calendarTitle}</h2>
                </div>
                <p>{t.calendarIntro}</p>
              </div>
              <div className="calendar-layout">
                <div className="calendar-month">
                  <div className="calendar-month-bar">
                    <button
                      type="button"
                      aria-label={t.previous}
                      onClick={() => move(-1)}
                    >
                      ←
                    </button>
                    <h3 aria-live="polite">{monthName}</h3>
                    <button
                      type="button"
                      aria-label={t.next}
                      onClick={() => move(1)}
                    >
                      →
                    </button>
                  </div>
                  <div className="calendar-grid">
                    {t.weekdays.map((w) => (
                      <span className="calendar-weekday" key={w}>
                        {w}
                      </span>
                    ))}
                    {monthGrid(view.year, view.month).map((d, i) => {
                      if (!d) return <span key={"b" + i} aria-hidden="true" />;
                      const key = iso(view.year, view.month, d);
                      const list = byDay.get(key) ?? [];
                      return (
                        <button
                          type="button"
                          key={key}
                          className={[
                            "calendar-day",
                            list.length ? "has-events" : "",
                            key === today ? "is-today" : "",
                            key === day ? "is-selected" : "",
                          ].join(" ")}
                          aria-pressed={key === day}
                          aria-label={t.dayLabel(longDate(key), list.length)}
                          disabled={!list.length}
                          onClick={() => setDay(key === day ? null : key)}
                        >
                          <span>{d}</span>
                          {list.length > 0 && (
                            <span className="calendar-dots" aria-hidden="true">
                              {list.slice(0, 3).map((e, n) => (
                                <i key={n} className={"type-" + e.type} />
                              ))}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <ul className="calendar-legend">
                    {Object.entries(t.types).map(([type, label]) => (
                      <li key={type}>
                        <i className={"type-" + type} aria-hidden="true" />
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="calendar-events">
                  <div className="calendar-events-head">
                    <h3>
                      {day ? t.eventsOn(longDate(day)) : t.eventsIn(monthName)}
                    </h3>
                    {day && (
                      <button type="button" onClick={() => setDay(null)}>
                        {t.showMonth}
                      </button>
                    )}
                  </div>
                  {shown.length ? (
                    <ul>
                      {shown.map((e, i) => {
                        const d = new Date(e.date + "T12:00:00Z");
                        const title = calendarText(e.title, locale);
                        return (
                          <li className="calendar-event" key={e.date + i}>
                            <span
                              className="calendar-event-date"
                              aria-hidden="true"
                            >
                              <strong>{d.getUTCDate()}</strong>
                              {fmt(d, { month: "short" })}
                            </span>
                            <div>
                              <span className={"calendar-chip type-" + e.type}>
                                {t.types[e.type]}
                              </span>
                              <h4>{title}</h4>
                              <p className="calendar-event-meta">
                                {longDate(e.date)}
                                {e.place && ` · ${e.place}`}
                              </p>
                              {calendarText(e.description, locale) && (
                                <p>{calendarText(e.description, locale)}</p>
                              )}
                              <a
                                href={wa(
                                  t.joinMessage(title, longDate(e.date)),
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {t.join} <span aria-hidden="true">↗</span>
                              </a>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="calendar-empty">{t.noEvents}</p>
                  )}
                </div>
              </div>
            </section>

            <section className="calendar-section" id="seasons" data-reveal>
              <div className="calendar-heading">
                <div>
                  <p className="eyebrow">{t.seasonEyebrow}</p>
                  <h2>{t.seasonTitle}</h2>
                </div>
                <p>{t.seasonIntro}</p>
              </div>
              <ol className="season-strip">
                {calendar.seasons.map((s, i) => (
                  <li
                    key={i}
                    className={
                      "season-" +
                      s.rating +
                      (i === view.month ? " is-current" : "")
                    }
                  >
                    <strong>{fmt(utc(2026, i), { month: "short" })}</strong>
                    <span className="season-rating">{t.ratings[s.rating]}</span>
                    <p>{calendarText(s.note, locale)}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="calendar-section" id="spots" data-reveal>
              <div className="calendar-heading">
                <div>
                  <p className="eyebrow">{t.spotsEyebrow}</p>
                  <h2>{t.spotsTitle}</h2>
                </div>
                <p>{t.spotsIntro}</p>
              </div>
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
              <div className="calendar-heading">
                <div>
                  <p className="eyebrow">{t.ecoEyebrow}</p>
                  <h2>{t.ecoTitle}</h2>
                </div>
                <p>{t.ecoIntro}</p>
              </div>
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
          </div>
        </div>
      </main>
      <SiteFooter
        contact={content.contact}
        activities={content.activities}
        tagline={content.text.tagline}
        demo={demo}
        locale={locale}
      />
    </div>
  );
}
