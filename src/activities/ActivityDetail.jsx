"use client";
import { useEffect, useState, useRef } from "react";
import ScrollEffects from "../components/ScrollEffects.jsx";
import { photoSrcSet } from "../photography.js";
import { activityInquiry } from "../activity-model.js";
import { priceText } from "../price-list.js";
import { dictionary, formatIDR, localeHref } from "../i18n.js";
import LanguageSwitch from "../components/LanguageSwitch.jsx";
import ActivityCards from "./ActivityCards.jsx";
import CalendarSections from "../calendar/CalendarSections.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import ContactIcon from "../components/ContactIcon.jsx";
import { phoneLabel } from "../contact-model.js";
import FormField from "../components/FormField.jsx";
import SectionBanner from "./SectionBanner.jsx";
import SiteNavLinks from "../components/SiteNavLinks.jsx";

function Inquiry({ activityKey, activity, contact, locale }) {
  const t = dictionary(locale).activity;
  const label = dictionary(locale).activityLabels[activityKey];
  const [today, setToday] = useState("");
  const [details, setDetails] = useState({
    name: "",
    whatsapp: "",
    email: "",
    date: "",
    participants: 1,
    notes: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => setToday(new Date().toLocaleDateString("en-CA")), []);
  function change(key, value) {
    setDetails((current) => ({ ...current, [key]: value }));
    setMessage("");
    setError("");
  }
  function prepare(event) {
    event.preventDefault();
    try {
      setMessage(
        activityInquiry(activityKey, activity, details, today, false, locale),
      );
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <aside
      className="activity-inquiry"
      id="inquiry"
      aria-labelledby="inquiry-title"
    >
      <p className="eyebrow">{t.planKicker}</p>
      <h2 id="inquiry-title">{t.planTitle(label)}</h2>
      <div className="activity-price">
        <small>{activity.price === null ? t.priceLabel : t.fromPrice}</small>
        <strong>
          {activity.price === null
            ? dictionary(locale).common.requestQuote
            : formatIDR(activity.price, locale)}
        </strong>
        <p>{t.priceNote}</p>
      </div>
      <form className="activity-form" onSubmit={prepare} noValidate>
        <p className="form-required-note">
          <span aria-hidden="true">*</span> {t.requiredNote}
        </p>
        <FormField id="inquiry-name" label={t.name} icon="user" required>
          <input
            id="inquiry-name"
            name="name"
            autoComplete="name"
            maxLength={120}
            required
            value={details.name}
            onChange={(e) => change("name", e.target.value)}
            placeholder={t.namePlaceholder}
          />
        </FormField>
        <FormField
          id="inquiry-whatsapp"
          label={t.whatsapp}
          icon="whatsapp"
          required
        >
          <input
            id="inquiry-whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            pattern="\+?[0-9 \(\)\.\-]{8,30}"
            autoComplete="tel"
            maxLength={30}
            required
            value={details.whatsapp}
            onChange={(e) => change("whatsapp", e.target.value)}
            placeholder={t.whatsappPlaceholder}
          />
        </FormField>
        <FormField
          id="inquiry-email"
          label={t.email}
          icon="email"
          optional={t.optional}
        >
          <input
            id="inquiry-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={200}
            value={details.email}
            onChange={(e) => change("email", e.target.value)}
            placeholder={t.emailPlaceholder}
          />
        </FormField>
        <div className="form-row">
          <FormField id="inquiry-date" label={t.date} icon="calendar" required>
            <input
              id="inquiry-date"
              name="date"
              type="date"
              min={today || undefined}
              required
              value={details.date}
              onChange={(e) => change("date", e.target.value)}
            />
          </FormField>
          <FormField
            id="inquiry-participants"
            label={t.participants}
            icon="people"
            required
          >
            <input
              id="inquiry-participants"
              name="participants"
              type="number"
              min="1"
              max="100"
              required
              value={details.participants}
              onChange={(e) => change("participants", e.target.value)}
            />
          </FormField>
        </div>
        <FormField
          id="inquiry-notes"
          label={t.notes}
          icon="note"
          optional={t.optional}
        >
          <textarea
            id="inquiry-notes"
            name="notes"
            rows="3"
            maxLength={1000}
            value={details.notes}
            onChange={(e) => change("notes", e.target.value)}
            placeholder={t.notesPlaceholder}
          />
        </FormField>
        {error && (
          <p className="activity-error" role="alert">
            {error}
          </p>
        )}
        <button className="button dark" type="submit">
          {t.prepare} <span aria-hidden="true">↗</span>
        </button>
      </form>
      {message && (
        <div className="activity-message" role="status">
          <h3>{t.ready}</h3>
          <p className="activity-message-preview">{message}</p>
          <a
            className="button lime"
            href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.continueWhatsApp} <span aria-hidden="true">↗</span>
          </a>
        </div>
      )}
      <p className="activity-form-note">{t.formNote}</p>
      <a
        className="activity-inquiry-contact"
        href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(t.askMessage(label))}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ContactIcon name="whatsapp" /> {t.askFirst}{" "}
        {phoneLabel(contact.whatsapp)} <span aria-hidden="true">↗</span>
      </a>
    </aside>
  );
}

// Small line icons for the hero facts and the section menu.
const iconPaths = {
  audience:
    "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14c2.2.6 3.5 2.6 3.5 6",
  duration: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  meeting:
    "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  overview: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01",
  prices: "M3 12V4h8l9 9-8 8zM7.5 8h.01",
  itinerary:
    "M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM7 17h6a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h6",
  preparation: "M5 12.5l4.5 4.5L19 7",
  faq: "M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  seasons:
    "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  "ocean-care":
    "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
};
function LineIcon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}

export default function ActivityDetail({
  activityKey,
  content,
  today,
  locale = "en",
}) {
  const dict = dictionary(locale);
  const t = dict.activity;
  const labels = dict.activityLabels;
  const href = (path) => localeHref(locale, path);
  const motionRoot = useRef(null);
  const activity = content.activities[activityKey];
  // The activity calendar lives on the diving page.
  const calendar = activityKey === "diving" ? content.calendar : null;
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 12);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  const banner = (kind) => {
    const [eyebrow, title, intro] = t.banners[activityKey][kind];
    return (
      <SectionBanner
        theme={activityKey}
        kind={kind}
        eyebrow={eyebrow}
        title={title}
        intro={intro}
      />
    );
  };
  const prices = content.priceList?.[activityKey] || [];
  const helpURL = `https://wa.me/${content.contact.whatsapp}?text=${encodeURIComponent(t.helpMessage(labels[activityKey]))}`;
  return (
    <div className="activity-page" data-theme={activityKey} ref={motionRoot}>
      <ScrollEffects rootRef={motionRoot} />
      <a className="skip-link" href="#activity-main">
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
          aria-controls="activity-navigation"
          onClick={() => setMenu(!menu)}
        >
          <span />
          <span />
        </button>
        <nav
          id="activity-navigation"
          className={menu ? "open" : ""}
          aria-label={dict.common.mainNav}
        >
          <SiteNavLinks
            locale={locale}
            page="activity"
            activityKey={activityKey}
            activities={content.activities}
            onNavigate={() => setMenu(false)}
          />
        </nav>
        <div className="header-actions">
          <LanguageSwitch locale={locale} path={`/${activityKey}`} />
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
          className="activity-hero"
          aria-labelledby="activity-title"
          data-parallax
        >
          <img
            className="activity-hero-photo"
            src={activity.image}
            srcSet={photoSrcSet(activity.image)}
            sizes="100vw"
            alt={activity.imageAlt}
            width="1672"
            height="941"
            fetchPriority="high"
          />
          <div className="activity-container activity-hero-content">
            <div className="activity-breadcrumb">
              <a href={href("/")}>{dict.common.home}</a>
              <span aria-hidden="true">/</span>
              <span>{labels[activityKey]}</span>
            </div>
            <p className="eyebrow">
              {dict.kickers.experiences} · {labels[activityKey].toUpperCase()}
            </p>
            <h1 id="activity-title">{activity.title}</h1>
            <p className="activity-hero-summary">{activity.summary}</p>
            <dl className="activity-hero-facts">
              {[
                ["audience", t.audience, activity.audience],
                ["duration", t.duration, activity.duration],
                ["meeting", t.meetingPoint, activity.meetingPoint],
              ].map(([icon, label, value]) => (
                <div key={icon}>
                  <LineIcon name={icon} />
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
        <div className="activity-body">
          <div className="activity-container">
            <div className="activity-jump-links" aria-label={t.sections}>
              {[
                ["overview", t.about],
                ...(prices.length > 0 ? [["prices", t.pricesNav]] : []),
                ["itinerary", t.itinerary],
                ["preparation", t.preparation],
                ["faq", t.faq],
                ...(calendar
                  ? [
                      ["calendar", dict.calendarPage.jump[0]],
                      ["seasons", dict.calendarPage.jump[1]],
                      ["ocean-care", dict.calendarPage.jump[3]],
                    ]
                  : []),
              ].map(([id, label]) => (
                <a href={"#" + id} key={id}>
                  <LineIcon name={id} />
                  {label}
                </a>
              ))}
            </div>
            <div className="activity-layout">
              <div className="activity-details">
                <section className="activity-block" id="overview" data-reveal>
                  {banner("about")}
                  <p className="activity-description">{activity.description}</p>
                  <ul className="activity-highlights">
                    {activity.highlights.map((item, index) => (
                      <li key={index}>
                        <span aria-hidden="true">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
                {prices.length > 0 && (
                  <section className="activity-block" id="prices" data-reveal>
                    {banner("prices")}
                    <ul className="activity-prices">
                      {prices.map((item, index) => (
                        <li key={index}>
                          <span>
                            <strong>{priceText(item.name, locale)}</strong>
                            {priceText(item.info, locale) && (
                              <small>{priceText(item.info, locale)}</small>
                            )}
                          </span>
                          <b>
                            {formatIDR(item.price, locale)}
                            {priceText(item.unit, locale) && (
                              <small>{priceText(item.unit, locale)}</small>
                            )}
                          </b>
                        </li>
                      ))}
                    </ul>
                    <p className="activity-price-note">{dict.prices.note}</p>
                  </section>
                )}
                <section className="activity-block" id="itinerary" data-reveal>
                  {banner("itinerary")}
                  <ol className="activity-steps">
                    {activity.itinerary.map((step, index) => (
                      <li key={index}>
                        <span
                          className="activity-step-number"
                          aria-hidden="true"
                        >
                          {index + 1}
                        </span>
                        <h3>{step.title}</h3>
                        <p>{step.description}</p>
                      </li>
                    ))}
                  </ol>
                </section>
                <section
                  className="activity-block"
                  id="preparation"
                  data-reveal
                >
                  {banner("prep")}
                  <ul className="activity-preparations">
                    {activity.preparations.map((item, index) => (
                      <li key={index}>
                        <span aria-hidden="true">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a
                    className="activity-equipment-link"
                    href={href("/dive-shop?mode=rental#catalog")}
                  >
                    <span>
                      {t.needGear}
                      <strong>{t.rentalLink}</strong>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </section>
                <section className="activity-block" id="faq" data-reveal>
                  {banner("faq")}
                  <div className="activity-faqs">
                    {activity.faqs.map((item, index) => (
                      <details key={index}>
                        <summary>
                          {item.question}
                          <span aria-hidden="true">+</span>
                        </summary>
                        <p>{item.answer}</p>
                      </details>
                    ))}
                  </div>
                </section>
              </div>
              <Inquiry
                activityKey={activityKey}
                activity={activity}
                contact={content.contact}
                locale={locale}
              />
            </div>
            {calendar && (
              <CalendarSections
                calendar={calendar}
                whatsapp={content.contact.whatsapp}
                today={today}
                locale={locale}
              />
            )}
          </div>
        </div>
        <ActivityCards
          activities={content.activities}
          exclude={activityKey}
          locale={locale}
        />
      </main>
      <SiteFooter
        contact={content.contact}
        activities={content.activities}
        tagline={content.text.tagline}
        locale={locale}
      />
    </div>
  );
}
