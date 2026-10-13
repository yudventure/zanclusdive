"use client";
import { useEffect, useRef, useState } from "react";
import { useReveal } from "../components/useReveal.js";
import ScrollEffects from "../components/ScrollEffects.jsx";
import PageHeader from "../components/PageHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import ContactIcon from "../components/ContactIcon.jsx";
import FormField from "../components/FormField.jsx";
import SectionBanner from "../activities/SectionBanner.jsx";
import { photoSrcSet } from "../photography.js";
import { phoneLabel } from "../contact-model.js";
import { serviceInquiry, serviceText } from "../service-model.js";
import { dictionary, formatIDR, localeHref } from "../i18n.js";
import { LockedBadge } from "../components/Locked.jsx";
import { noLocks, itemLocked } from "../developer.js";

const icons = {
  gear: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  time: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  location:
    "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  process: "M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4",
  faq: "M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  regulator:
    "M8 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM11 8c5 1 5 7 9 7M15 15h6v6h-6z",
  octopus:
    "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.5 7.5C14 9 12 17 18 17M15 14h6v6h-6z",
  bcd: "M7 3h10l2 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8zM9 3v5h6V3M9 13h6",
  tank: "M9 7h6a2 2 0 0 1 2 2v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9a2 2 0 0 1 2-2zM10 7V4h4v3M9 2h6",
  computer:
    "M8 6h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM9 6V2h6v4M9 18v4h6v-4M9 12h3l1-2",
  repair:
    "M14.5 6.5a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3l9-9a4 4 0 0 0-2-2zM18 4l2 2",
};
function Icon({ name, size = 18 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={icons[name] ?? icons.repair} />
    </svg>
  );
}

function Request({ items, chosen, onToggle, contact, locale }) {
  const s = dictionary(locale).service;
  const a = dictionary(locale).activity;
  const [today, setToday] = useState("");
  const [details, setDetails] = useState({
    name: "",
    whatsapp: "",
    email: "",
    date: "",
    notes: "",
  });
  const [message, setMessage] = useState("");
  const messageRef = useReveal(message);
  const [error, setError] = useState("");
  useEffect(() => setToday(new Date().toLocaleDateString("en-CA")), []);
  useEffect(() => setMessage(""), [chosen]);
  const picked = items.filter((item) => chosen.includes(item.id));
  const estimate = picked.reduce((sum, item) => sum + item.price, 0);
  function change(key, value) {
    setDetails((current) => ({ ...current, [key]: value }));
    setMessage("");
    setError("");
  }
  function prepare(event) {
    event.preventDefault();
    try {
      setMessage(serviceInquiry(picked, details, today, locale));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <aside
      className="activity-inquiry service-request"
      id="inquiry"
      aria-labelledby="inquiry-title"
    >
      <p className="eyebrow">{s.planKicker}</p>
      <h2 id="inquiry-title">{s.planTitle}</h2>
      <div className="activity-price" aria-live="polite">
        <small>{picked.length ? s.estimate : s.nothingChosen}</small>
        <strong>{picked.length ? formatIDR(estimate, locale) : "–"}</strong>
        <p>{s.note}</p>
      </div>
      <form className="activity-form" onSubmit={prepare} noValidate>
        <p className="form-required-note">
          <span aria-hidden="true">*</span> {a.requiredNote}
        </p>
        <fieldset className="service-choices">
          <legend>
            {s.services} <span aria-hidden="true">*</span>
          </legend>
          {items.map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                name="services"
                value={item.id}
                checked={chosen.includes(item.id)}
                onChange={() => onToggle(item.id)}
              />
              <span>{serviceText(item.name, locale)}</span>
            </label>
          ))}
        </fieldset>
        <FormField id="service-name" label={a.name} icon="user" required>
          <input
            id="service-name"
            name="name"
            autoComplete="name"
            maxLength={120}
            required
            value={details.name}
            onChange={(e) => change("name", e.target.value)}
            placeholder={a.namePlaceholder}
          />
        </FormField>
        <FormField
          id="service-whatsapp"
          label={a.whatsapp}
          icon="whatsapp"
          required
        >
          <input
            id="service-whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={30}
            required
            value={details.whatsapp}
            onChange={(e) => change("whatsapp", e.target.value)}
            placeholder={a.whatsappPlaceholder}
          />
        </FormField>
        <FormField
          id="service-email"
          label={a.email}
          icon="email"
          optional={a.optional}
        >
          <input
            id="service-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={200}
            value={details.email}
            onChange={(e) => change("email", e.target.value)}
            placeholder={a.emailPlaceholder}
          />
        </FormField>
        <FormField
          id="service-date"
          label={s.dateLabel}
          icon="calendar"
          required
        >
          <input
            id="service-date"
            name="date"
            type="date"
            min={today || undefined}
            required
            value={details.date}
            onChange={(e) => change("date", e.target.value)}
          />
        </FormField>
        <FormField
          id="service-notes"
          label={s.notesLabel}
          icon="note"
          optional={a.optional}
        >
          <textarea
            id="service-notes"
            name="notes"
            rows="3"
            maxLength={1000}
            value={details.notes}
            onChange={(e) => change("notes", e.target.value)}
            placeholder={s.notesPlaceholder}
          />
        </FormField>
        {error && (
          <p className="activity-error" role="alert">
            {error}
          </p>
        )}
        <button className="button dark" type="submit">
          {a.prepare} <span aria-hidden="true">↗</span>
        </button>
      </form>
      {message && (
        <div className="activity-message" role="status" ref={messageRef}>
          <h3>{a.ready}</h3>
          <p className="activity-message-preview">{message}</p>
          <a
            className="button lime"
            href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {a.continueWhatsApp} <span aria-hidden="true">↗</span>
          </a>
        </div>
      )}
      <p className="activity-form-note">{s.formNote}</p>
      <a
        className="activity-inquiry-contact"
        href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(s.askMessage)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ContactIcon name="whatsapp" /> {a.askFirst}{" "}
        {phoneLabel(contact.whatsapp)} <span aria-hidden="true">↗</span>
      </a>
    </aside>
  );
}

export default function ServicePage({
  content,
  locale = "en",
  locks = noLocks,
}) {
  const dict = dictionary(locale);
  const s = dict.service;
  const href = (path) => localeHref(locale, path);
  const motionRoot = useRef(null);
  const items = content.service.items.filter((x) => x.enabled);
  // Services locked in developer mode stay listed but can't be chosen.
  const locked = (item) => itemLocked(locks, "service", item.id);
  const open = items.filter((item) => !locked(item));
  const [chosen, setChosen] = useState([]);
  const toggle = (id) =>
    setChosen((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  // A link such as /service#regulator ticks that service in the form, also
  // when the visitor is already on the page.
  useEffect(() => {
    const pick = () => {
      const id = window.location.hash.slice(1);
      if (open.some((x) => x.id === id))
        setChosen((current) =>
          current.includes(id) ? current : [...current, id],
        );
    };
    pick();
    window.addEventListener("hashchange", pick);
    return () => window.removeEventListener("hashchange", pick);
  }, []);
  const banner = (kind, [eyebrow, title, intro]) => (
    <SectionBanner
      theme="service"
      kind={kind}
      eyebrow={eyebrow}
      title={title}
      intro={intro}
    />
  );
  const hero = content.service.image;
  return (
    <div
      className="activity-page service-page"
      data-theme="service"
      ref={motionRoot}
    >
      <ScrollEffects rootRef={motionRoot} />
      <a className="skip-link" href="#service-main">
        {dict.activity.skip}
      </a>
      <PageHeader
        locale={locale}
        page="service"
        path="/service"
        activities={content.activities}
        whatsapp={content.contact.whatsapp}
        message={s.askMessage}
      />
      <main id="service-main">
        <section
          className="activity-hero"
          aria-labelledby="service-title"
          data-parallax
        >
          {hero && (
            <img
              className="activity-hero-photo"
              src={hero}
              srcSet={photoSrcSet(hero)}
              sizes="100vw"
              alt=""
              width="1000"
              height="667"
              fetchPriority="high"
            />
          )}
          <div className="activity-container activity-hero-content">
            <div className="activity-breadcrumb">
              <a href={href("/")}>{dict.common.home}</a>
              <span aria-hidden="true">/</span>
              <a href={href("/dive-shop")}>Dive Shop</a>
              <span aria-hidden="true">/</span>
              <span>{s.nav}</span>
            </div>
            <p className="eyebrow">{s.heroKicker}</p>
            <h1 id="service-title">{s.title}</h1>
            <p className="activity-hero-summary">{s.summary}</p>
            <dl className="activity-hero-facts">
              {s.facts.map(([label, value], index) => (
                <div key={label}>
                  <Icon name={["gear", "time", "location"][index]} />
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
        <div className="activity-body">
          <div className="activity-container">
            <div
              className="activity-jump-links"
              aria-label={dict.activity.sections}
            >
              {["list", "process", "faq"].map((id, index) => (
                <a href={"#" + id} key={id}>
                  <Icon name={id} />
                  {s.sections[index]}
                </a>
              ))}
            </div>
            <div className="activity-layout">
              <div className="activity-details">
                <section className="activity-block" id="list" data-reveal>
                  {banner("list", s.list)}
                  <ul className="service-list">
                    {items.map((item) => {
                      const on = chosen.includes(item.id);
                      return (
                        <li
                          key={item.id}
                          id={item.id}
                          className={
                            "service-item" +
                            (on ? " is-selected" : "") +
                            (locked(item) ? " is-locked" : "")
                          }
                        >
                          {locked(item) && <LockedBadge locale={locale} />}
                          <span
                            className="service-item-icon"
                            aria-hidden="true"
                          >
                            <Icon name={item.id} size={26} />
                          </span>
                          <div className="service-item-body">
                            <h3>{serviceText(item.name, locale)}</h3>
                            <p>{serviceText(item.summary, locale)}</p>
                            {serviceText(item.duration, locale) && (
                              <p className="service-item-time">
                                <Icon name="time" size={15} />
                                <span>
                                  {s.duration}:{" "}
                                  {serviceText(item.duration, locale)}
                                </span>
                              </p>
                            )}
                          </div>
                          <div className="service-item-foot">
                            <p className="service-item-price">
                              <small>{s.from}</small>
                              <strong>{formatIDR(item.price, locale)}</strong>
                              {serviceText(item.unit, locale) && (
                                <small>{serviceText(item.unit, locale)}</small>
                              )}
                            </p>
                            <button
                              type="button"
                              className={"button " + (on ? "lime" : "dark")}
                              disabled={locked(item)}
                              aria-pressed={on}
                              onClick={() => toggle(item.id)}
                            >
                              {on ? s.chosen : s.choose}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {chosen.length > 0 && (
                    <a className="button dark service-next" href="#inquiry">
                      {s.next(chosen.length)} <span aria-hidden="true">↓</span>
                    </a>
                  )}
                  <p className="activity-price-note">{s.note}</p>
                  <a
                    className="activity-equipment-link"
                    href={href("/dive-shop")}
                  >
                    <span>
                      {s.shopLink[0]}
                      <strong>{s.shopLink[1]}</strong>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </section>
                <section className="activity-block" id="process" data-reveal>
                  {banner("process", s.process)}
                  <ol className="activity-steps">
                    {s.steps.map(([title, text], index) => (
                      <li key={title}>
                        <span
                          className="activity-step-number"
                          aria-hidden="true"
                        >
                          {index + 1}
                        </span>
                        <h3>{title}</h3>
                        <p>{text}</p>
                      </li>
                    ))}
                  </ol>
                </section>
                <section className="activity-block" id="faq" data-reveal>
                  {banner("faq", s.faq)}
                  <div className="activity-faqs">
                    {s.faqs.map(([question, answer]) => (
                      <details key={question}>
                        <summary>
                          {question}
                          <span aria-hidden="true">+</span>
                        </summary>
                        <p>{answer}</p>
                      </details>
                    ))}
                  </div>
                </section>
              </div>
              {items.length > 0 && (
                <Request
                  items={open}
                  chosen={chosen}
                  onToggle={toggle}
                  contact={content.contact}
                  locale={locale}
                />
              )}
            </div>
          </div>
        </div>
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
