"use client";
import { useEffect, useRef, useState } from "react";
import { useReveal } from "../components/useReveal.js";
import ScrollEffects from "../components/ScrollEffects.jsx";
import LanguageSwitch from "../components/LanguageSwitch.jsx";
import SiteNavLinks from "../components/SiteNavLinks.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import ContactIcon from "../components/ContactIcon.jsx";
import FormField from "../components/FormField.jsx";
import PayPanel from "../components/PayPanel.jsx";
import SectionBanner from "../activities/SectionBanner.jsx";
import PartnerMarquee from "./PartnerMarquee.jsx";
import { photoSrcSet } from "../photography.js";
import { phoneLabel } from "../contact-model.js";
import { courseInquiry, courseText } from "../course-model.js";
import { dictionary, formatIDR, localeHref } from "../i18n.js";

const icons = {
  level: "M4 20h4v-6H4zM10 20h4V9h-4zM16 20h4V4h-4z",
  location:
    "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  schedule: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  duration: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  depth: "M12 3v18M7 16l5 5 5-5M5 8h14",
  age: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5",
  why: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01",
  path: "M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM7 17h6a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h6",
  faq: "M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  sea: "M3 9c2 0 2-1.5 4.5-1.5S9.5 9 12 9s2.5-1.5 4.5-1.5S19 9 21 9M3 15c2 0 2-1.5 4.5-1.5S9.5 15 12 15s2.5-1.5 4.5-1.5S19 15 21 15",
  guide:
    "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14c2.2.6 3.5 2.6 3.5 6",
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
      <path d={icons[name]} />
    </svg>
  );
}

function SignUp({ courses, selected, onSelect, contact, payments, locale }) {
  const c = dictionary(locale).course;
  const a = dictionary(locale).activity;
  const p = dictionary(locale).payment;
  const ready = Boolean(payments?.ready);
  const [today, setToday] = useState("");
  const [details, setDetails] = useState({
    name: "",
    whatsapp: "",
    email: "",
    date: "",
    participants: 1,
    certification: c.certOptions[0],
    notes: "",
  });
  const [message, setMessage] = useState("");
  const messageRef = useReveal(message);
  const [error, setError] = useState("");
  useEffect(() => setToday(new Date().toLocaleDateString("en-CA")), []);
  useEffect(() => setMessage(""), [selected]);
  const course = courses.find((x) => x.id === selected) || courses[0];
  function change(key, value) {
    setDetails((current) => ({ ...current, [key]: value }));
    setMessage("");
    setError("");
  }
  function prepare(event) {
    event.preventDefault();
    try {
      setMessage(courseInquiry(course, details, today, locale));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <aside
      className="activity-inquiry course-signup"
      id="inquiry"
      aria-labelledby="inquiry-title"
    >
      <p className="eyebrow">{c.planKicker}</p>
      <h2 id="inquiry-title">{c.planTitle}</h2>
      <div className="activity-price">
        <small>{courseText(course.name, locale)}</small>
        <strong>{formatIDR(course.price, locale)}</strong>
        <p>{c.note}</p>
      </div>
      <form className="activity-form" onSubmit={prepare} noValidate>
        <p className="form-required-note">
          <span aria-hidden="true">*</span> {a.requiredNote}
        </p>
        <div className="form-field">
          <label htmlFor="course-select">{c.course}</label>
          <select
            id="course-select"
            value={course.id}
            onChange={(e) => onSelect(e.target.value)}
          >
            {courses.map((x) => (
              <option key={x.id} value={x.id}>
                {courseText(x.name, locale)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="course-certification">{c.certification}</label>
          <select
            id="course-certification"
            value={details.certification}
            onChange={(e) => change("certification", e.target.value)}
          >
            {c.certOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        <FormField id="course-name" label={a.name} icon="user" required>
          <input
            id="course-name"
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
          id="course-whatsapp"
          label={a.whatsapp}
          icon="whatsapp"
          required
        >
          <input
            id="course-whatsapp"
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
          id="course-email"
          label={a.email}
          icon="email"
          optional={a.optional}
        >
          <input
            id="course-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={200}
            value={details.email}
            onChange={(e) => change("email", e.target.value)}
            placeholder={a.emailPlaceholder}
          />
        </FormField>
        <div className="form-row">
          <FormField
            id="course-date"
            label={c.dateLabel}
            icon="calendar"
            required
          >
            <input
              id="course-date"
              name="date"
              type="date"
              min={today || undefined}
              required
              value={details.date}
              onChange={(e) => change("date", e.target.value)}
            />
          </FormField>
          <FormField
            id="course-participants"
            label={a.participants}
            icon="people"
            required
          >
            <input
              id="course-participants"
              name="participants"
              type="number"
              min="1"
              max="20"
              required
              value={details.participants}
              onChange={(e) => change("participants", e.target.value)}
            />
          </FormField>
        </div>
        <FormField
          id="course-notes"
          label={a.notes}
          icon="note"
          optional={a.optional}
        >
          <textarea
            id="course-notes"
            name="notes"
            rows="3"
            maxLength={1000}
            value={details.notes}
            onChange={(e) => change("notes", e.target.value)}
            placeholder={a.notesPlaceholder}
          />
        </FormField>
        {error && (
          <p className="activity-error" role="alert">
            {error}
          </p>
        )}
        <button className="button dark" type="submit">
          {ready ? p.toPay : a.prepare} <span aria-hidden="true">↗</span>
        </button>
      </form>
      {message && ready && (
        <div className="activity-message" role="status" ref={messageRef}>
          <h3>{p.summaryPay}</h3>
          <PayPanel
            order={{
              kind: "course",
              course: course.id,
              participants: Number(details.participants),
              date: details.date,
              certification: details.certification,
              name: details.name,
              whatsapp: details.whatsapp,
              email: details.email,
              notes: details.notes,
            }}
            total={course.price * Number(details.participants)}
            breakdown={`${formatIDR(course.price, locale)} × ${p.people(Number(details.participants))}`}
            message={message}
            whatsapp={contact.whatsapp}
            sandbox={payments.sandbox}
            locale={locale}
          />
        </div>
      )}
      {message && !ready && (
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
      <p className="activity-form-note">{ready ? p.paidNote : c.formNote}</p>
      <a
        className="activity-inquiry-contact"
        href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(c.message.greeting(courseText(course.name, locale)))}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ContactIcon name="whatsapp" /> {a.askFirst}{" "}
        {phoneLabel(contact.whatsapp)} <span aria-hidden="true">↗</span>
      </a>
    </aside>
  );
}

export default function CoursePage({ content, locale = "en", payments }) {
  const dict = dictionary(locale);
  const c = dict.course;
  const href = (path) => localeHref(locale, path);
  const motionRoot = useRef(null);
  const courses = content.courses.items.filter((x) => x.enabled);
  const [selected, setSelected] = useState(courses[0]?.id);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 12);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  // A link such as /course#open-water preselects that course in the form,
  // also when the visitor is already on the page.
  useEffect(() => {
    const pick = () => {
      const id = window.location.hash.slice(1);
      if (courses.some((x) => x.id === id)) setSelected(id);
    };
    pick();
    window.addEventListener("hashchange", pick);
    return () => window.removeEventListener("hashchange", pick);
  }, []);
  function choose(id) {
    setSelected(id);
    document
      .getElementById("inquiry")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const banner = (kind, [eyebrow, title, intro]) => (
    <SectionBanner
      theme="course"
      kind={kind}
      eyebrow={eyebrow}
      title={title}
      intro={intro}
    />
  );
  const hero = courses[0]?.image || "/assets/photos/gallery-dive.webp";
  return (
    <div
      className="activity-page course-page"
      data-theme="course"
      ref={motionRoot}
    >
      <ScrollEffects rootRef={motionRoot} />
      <a className="skip-link" href="#course-main">
        {dict.activity.skip}
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
          aria-controls="course-navigation"
          onClick={() => setMenu(!menu)}
        >
          <span />
          <span />
        </button>
        <nav
          id="course-navigation"
          className={menu ? "open" : ""}
          aria-label={dict.common.mainNav}
        >
          <SiteNavLinks
            locale={locale}
            page="course"
            activities={content.activities}
            onNavigate={() => setMenu(false)}
          />
        </nav>
        <div className="header-actions">
          <LanguageSwitch locale={locale} path="/course" />
          <a
            className="button quick-service"
            href={`https://wa.me/${content.contact.whatsapp}?text=${encodeURIComponent(c.askMessage)}`}
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
      <main id="course-main">
        <section
          className="activity-hero"
          aria-labelledby="course-title"
          data-parallax
        >
          <img
            className="activity-hero-photo"
            src={hero}
            srcSet={photoSrcSet(hero)}
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
              <span>{c.nav}</span>
            </div>
            <p className="eyebrow">{c.heroKicker}</p>
            <h1 id="course-title">{c.title}</h1>
            <p className="activity-hero-summary">{c.summary}</p>
            <dl className="activity-hero-facts">
              {c.facts.map(([label, value], index) => (
                <div key={label}>
                  <Icon name={["level", "location", "schedule"][index]} />
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
        <PartnerMarquee
          partners={content.courses.partners}
          locale={locale}
          tone="band"
        />
        <div className="activity-body">
          <div className="activity-container">
            <div
              className="activity-jump-links"
              aria-label={dict.activity.sections}
            >
              {["why", "path", "faq"].map((id, index) => (
                <a href={"#" + id} key={id}>
                  <Icon name={id} />
                  {c.sections[index]}
                </a>
              ))}
            </div>
            <div className="activity-layout">
              <div className="activity-details">
                <section className="activity-block" id="why" data-reveal>
                  {banner("why", c.why)}
                  <ul className="course-why">
                    {c.whyItems.map(([title, text], index) => (
                      <li key={title}>
                        <span aria-hidden="true">
                          <Icon name={["sea", "guide", "schedule"][index]} />
                        </span>
                        <strong>{title}</strong>
                        <p>{text}</p>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="activity-block" id="path" data-reveal>
                  {banner("path", c.path)}
                  <ol className="course-path">
                    {courses.map((course, index) => (
                      <li
                        key={course.id}
                        id={course.id}
                        className={
                          "course-item" +
                          (course.id === selected ? " is-selected" : "")
                        }
                      >
                        <div className="course-item-photo">
                          {course.image && (
                            <img
                              src={course.image}
                              srcSet={photoSrcSet(course.image)}
                              sizes="(max-width: 700px) 90vw, 280px"
                              alt=""
                              width="640"
                              height="426"
                              loading="lazy"
                            />
                          )}
                          <span>{c.step(index + 1)}</span>
                        </div>
                        <div className="course-item-body">
                          <p className="course-item-level">
                            {courseText(course.level, locale)}
                          </p>
                          <h3>{courseText(course.name, locale)}</h3>
                          <p className="course-item-summary">
                            {courseText(course.summary, locale)}
                          </p>
                          <dl className="course-item-facts">
                            {[
                              ["duration", c.duration, course.duration],
                              ["depth", c.depth, course.depth],
                              ["age", c.age, course.age],
                            ]
                              .filter(([, , value]) =>
                                courseText(value, locale),
                              )
                              .map(([icon, label, value]) => (
                                <div key={icon}>
                                  <Icon name={icon} size={16} />
                                  <dt>{label}</dt>
                                  <dd>{courseText(value, locale)}</dd>
                                </div>
                              ))}
                          </dl>
                          {course.includes.length > 0 && (
                            <>
                              <p className="course-item-label">{c.includes}</p>
                              <ul className="course-item-includes">
                                {course.includes.map((item, i) => (
                                  <li key={i}>
                                    <span aria-hidden="true">✓</span>
                                    {courseText(item, locale)}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                          {courseText(course.requirements, locale) && (
                            <p className="course-item-requirements">
                              <strong>{c.requirements}</strong>{" "}
                              {courseText(course.requirements, locale)}
                            </p>
                          )}
                          <div className="course-item-foot">
                            <p className="course-item-price">
                              <strong>{formatIDR(course.price, locale)}</strong>
                              <small>{courseText(course.unit, locale)}</small>
                            </p>
                            <button
                              type="button"
                              className="button dark"
                              onClick={() => choose(course.id)}
                            >
                              {c.choose} <span aria-hidden="true">↗</span>
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <p className="activity-price-note">{c.note}</p>
                </section>
                <section className="activity-block" id="faq" data-reveal>
                  {banner("faq", c.faq)}
                  <div className="activity-faqs">
                    {c.faqs.map(([question, answer]) => (
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
              {courses.length > 0 && (
                <SignUp
                  courses={courses}
                  selected={selected}
                  onSelect={setSelected}
                  contact={content.contact}
                  payments={payments}
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
