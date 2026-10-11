"use client";
import { useEffect, useState, useRef } from "react";
import ScrollEffects from "../components/ScrollEffects.jsx";
import { photoSrcSet } from "../photography.js";
import { activityInquiry, activityKeys } from "../activity-model.js";
import { dictionary, formatIDR, localeHref } from "../i18n.js";
import LanguageSwitch from "../components/LanguageSwitch.jsx";
import ActivityCards from "./ActivityCards.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import ContactIcon from "../components/ContactIcon.jsx";
import { phoneLabel } from "../contact-model.js";

function Inquiry({ activityKey, activity, contact, demo, locale }) {
  const t = dictionary(locale).activity;
  const label = dictionary(locale).activityLabels[activityKey];
  const [today, setToday] = useState("");
  const [details, setDetails] = useState({
    name: "",
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
        activityInquiry(activityKey, activity, details, today, demo, locale),
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
        <small>
          {activity.price === null
            ? t.priceLabel
            : demo
              ? t.demoPrice
              : t.fromPrice}
        </small>
        <strong>
          {activity.price === null
            ? dictionary(locale).common.requestQuote
            : formatIDR(activity.price, locale)}
        </strong>
        <p>{t.priceNote}</p>
      </div>
      <form className="activity-form" onSubmit={prepare}>
        <label htmlFor="inquiry-name">{t.name}</label>
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
        <div className="activity-form-row">
          <div>
            <label htmlFor="inquiry-date">{t.date}</label>
            <input
              id="inquiry-date"
              name="date"
              type="date"
              min={today || undefined}
              required
              value={details.date}
              onChange={(e) => change("date", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="inquiry-participants">{t.participants}</label>
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
          </div>
        </div>
        <label htmlFor="inquiry-notes">
          {t.notes} <span>{t.optional}</span>
        </label>
        <textarea
          id="inquiry-notes"
          name="notes"
          rows="3"
          maxLength={1000}
          value={details.notes}
          onChange={(e) => change("notes", e.target.value)}
          placeholder={t.notesPlaceholder}
        />
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

export default function ActivityDetail({
  activityKey,
  content,
  demo,
  locale = "en",
}) {
  const dict = dictionary(locale);
  const t = dict.activity;
  const labels = dict.activityLabels;
  const href = (path) => localeHref(locale, path);
  const motionRoot = useRef(null);
  const activity = content.activities[activityKey];
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 12);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  const helpURL = `https://wa.me/${content.contact.whatsapp}?text=${encodeURIComponent(t.helpMessage(labels[activityKey]))}`;
  return (
    <div className="activity-page" ref={motionRoot}>
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
          <a href={href("/")}>{dict.common.home}</a>
          {activityKeys
            .filter((key) => content.activities[key].enabled)
            .map((key) => (
              <a
                href={href(`/${key}`)}
                key={key}
                className={key === activityKey ? "active" : ""}
                aria-current={key === activityKey ? "page" : undefined}
                onClick={() => setMenu(false)}
              >
                {labels[key]}
              </a>
            ))}
          <a href={href("/dive-shop")}>Dive Shop</a>
          <a href={href("/#contact")}>{dict.common.contact}</a>
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
              ZANCLUS EXPERIENCES / {labels[activityKey].toUpperCase()}
            </p>
            <h1 id="activity-title">{activity.title}</h1>
            <p className="activity-hero-summary">{activity.summary}</p>
            <div className="activity-hero-actions">
              <a className="button primary" href="#inquiry">
                {t.planActivity} <span aria-hidden="true">↗</span>
              </a>
              <a className="activity-text-link" href="#overview">
                {t.exploreDetails} <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="activity-hero-bottom">
              <span>{demo ? t.demoHero : t.tagline}</span>
              <span>{activity.imageAlt}</span>
            </div>
          </div>
        </section>
        <div className="activity-body">
          <div className="activity-container">
            <div className="activity-jump-links" aria-label={t.sections}>
              <a href="#overview">{t.about}</a>
              <a href="#itinerary">{t.itinerary}</a>
              <a href="#preparation">{t.preparation}</a>
              <a href="#faq">{t.faq}</a>
            </div>
            {demo && (
              <p className="activity-demo-note activity-demo-banner">
                {t.demoBanner}
              </p>
            )}
            <div className="activity-layout">
              <div className="activity-details">
                <section
                  className="activity-overview"
                  id="overview"
                  data-reveal
                >
                  <p className="eyebrow">A LITTLE CLOSER TO THE OCEAN</p>
                  <h2>{t.overviewTitle}</h2>
                  <p className="activity-description">{activity.description}</p>
                  <dl className="activity-facts">
                    <div>
                      <dt>{t.audience}</dt>
                      <dd>{activity.audience}</dd>
                    </div>
                    <div>
                      <dt>{t.duration}</dt>
                      <dd>{activity.duration}</dd>
                    </div>
                    <div>
                      <dt>{t.meetingPoint}</dt>
                      <dd>{activity.meetingPoint}</dd>
                    </div>
                  </dl>
                  <div className="activity-highlights">
                    {activity.highlights.map((item, index) => (
                      <div key={index}>
                        <span aria-hidden="true">↗</span>
                        <p>{item}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="activity-content-section" id="itinerary">
                  <p className="eyebrow">ONE STEP AT A TIME</p>
                  <h2>{demo ? t.demoItinerary : t.itineraryTitle}</h2>
                  <p className="activity-section-intro">{t.itineraryIntro}</p>
                  <ol className="activity-timeline">
                    {activity.itinerary.map((step, index) => (
                      <li key={index} data-reveal>
                        <span
                          className="activity-step-number"
                          aria-hidden="true"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <h3>{step.title}</h3>
                          <p>{step.description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
                <section
                  className="activity-content-section"
                  id="preparation"
                  data-reveal
                >
                  <p className="eyebrow">COME PREPARED, ENJOY MORE</p>
                  <h2>{t.preparationTitle}</h2>
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
                <section
                  className="activity-content-section"
                  id="faq"
                  data-reveal
                >
                  <p className="eyebrow">GOOD TO KNOW</p>
                  <h2>{t.faqTitle}</h2>
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
                demo={demo}
                locale={locale}
              />
            </div>
          </div>
        </div>
        <ActivityCards
          activities={content.activities}
          exclude={activityKey}
          demo={demo}
          locale={locale}
        />
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
