"use client";
import { useRef, useState } from "react";
import { calendarText, eventDates } from "../calendar-model.js";
import { dictionary, formatIDR, localeHref } from "../i18n.js";
import { photoSrcSet } from "../photography.js";
import FormField from "./FormField.jsx";

const newRequestId = () =>
  globalThis.crypto?.randomUUID?.() ??
  "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (c ^ ((Math.random() * 16) >> (c / 4))).toString(16),
  );

// The sign-up form for an event: the guest's details, the group size and,
// for an event without dates, the start they would like. It is saved as a
// reservation request; the team confirms on WhatsApp.
function EventSignup({
  banner,
  title,
  dates,
  price,
  whatsapp,
  locale,
  dialog,
}) {
  const t = dictionary(locale).home.eventBanner;
  const f = t.form;
  const min = banner.minPeople || 1;
  const [fields, setFields] = useState({
    name: "",
    phone: "",
    email: "",
    people: String(min),
    date: "",
    notes: "",
  });
  const [requestId, setRequestId] = useState(newRequestId);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const people = Math.max(0, Math.round(Number(fields.people)) || 0);
  const set = (key) => (e) => {
    setFields((current) => ({ ...current, [key]: e.target.value }));
    setError("");
  };
  async function submit(event) {
    event.preventDefault();
    if (people < min) {
      setError(f.tooFew(min));
      return;
    }
    if (!banner.startDate && !fields.date) {
      setError(f.needDate);
      return;
    }
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/events?locale=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          event: banner.title.id,
          name: fields.name.trim(),
          phone: fields.phone.trim(),
          email: fields.email.trim(),
          people,
          date: fields.date,
          notes: fields.notes.trim(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || f.failed);
      setDone(result);
    } catch (err) {
      setError(err.message || f.failed);
    } finally {
      setSending(false);
    }
  }
  function again() {
    setDone(null);
    setRequestId(newRequestId());
  }
  const today = new Date().toLocaleDateString("en-CA");
  return (
    <dialog
      ref={dialog}
      className="modal activity-checkout event-signup"
      aria-labelledby="event-signup-title"
      onClose={() => done && again()}
    >
      <button
        type="button"
        className="close-modal"
        aria-label={f.close}
        onClick={() => dialog.current?.close()}
      >
        ×
      </button>
      <p className="eyebrow">{f.kicker}</p>
      <h2 id="event-signup-title">{f.title(title)}</h2>
      <div className="event-signup-offer">
        {banner.background && (
          <img src={banner.background} alt="" loading="lazy" />
        )}
        <dl>
          <div>
            <dt>{f.dates}</dt>
            <dd>
              {dates ||
                (done ? eventDates(done.date, done.endDate, locale) : "") ||
                f.datesOpen}
            </dd>
          </div>
          {price && (
            <div>
              <dt>{f.pricePer}</dt>
              <dd>
                <strong>{price}</strong>
                {calendarText(banner.note, locale) && (
                  <small>{calendarText(banner.note, locale)}</small>
                )}
              </dd>
            </div>
          )}
          {min > 1 && (
            <div>
              <dt>{f.group}</dt>
              <dd>{t.minPeople(min)}</dd>
            </div>
          )}
        </dl>
      </div>
      {done ? (
        <div className="event-signup-done" role="status">
          <h3>{f.doneTitle}</h3>
          <p>{f.doneText(done.reference)}</p>
          <a
            className="button lime"
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
              f.message(title, done.reference, done.participants),
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {f.confirm} <span aria-hidden="true">↗</span>
          </a>
        </div>
      ) : (
        <form className="activity-form" onSubmit={submit} noValidate>
          <p className="form-required-note">
            <span aria-hidden="true">*</span> {f.required}
          </p>
          <FormField id="event-name" label={f.name} icon="user" required>
            <input
              id="event-name"
              autoComplete="name"
              maxLength={80}
              required
              value={fields.name}
              onChange={set("name")}
            />
          </FormField>
          <FormField
            id="event-phone"
            label={f.whatsapp}
            icon="whatsapp"
            required
          >
            <input
              id="event-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={30}
              required
              placeholder="+62 812 3456 7890"
              value={fields.phone}
              onChange={set("phone")}
            />
          </FormField>
          <FormField
            id="event-email"
            label="Email"
            icon="email"
            optional={f.optional}
          >
            <input
              id="event-email"
              type="email"
              autoComplete="email"
              maxLength={200}
              value={fields.email}
              onChange={set("email")}
            />
          </FormField>
          <div className="form-row">
            <FormField
              id="event-people"
              label={f.people}
              icon="people"
              required
            >
              <input
                id="event-people"
                type="number"
                min={min}
                max="30"
                required
                value={fields.people}
                onChange={set("people")}
              />
            </FormField>
            {!banner.startDate && (
              <FormField
                id="event-date"
                label={f.pickDate}
                icon="calendar"
                required
              >
                <input
                  id="event-date"
                  type="date"
                  min={today}
                  required
                  value={fields.date}
                  onChange={set("date")}
                />
              </FormField>
            )}
          </div>
          <FormField
            id="event-notes"
            label={f.notes}
            icon="note"
            optional={f.optional}
          >
            <textarea
              id="event-notes"
              rows="3"
              maxLength={1000}
              placeholder={f.notesPlaceholder}
              value={fields.notes}
              onChange={set("notes")}
            />
          </FormField>
          {banner.amount > 0 && people >= 1 && (
            <p className="pay-total">
              <span>
                {f.total}
                <span className="plan-breakdown">
                  {price} × {people}
                </span>
              </span>
              <strong>{formatIDR(banner.amount * people, locale)}</strong>
            </p>
          )}
          {error && (
            <p className="activity-error" role="alert">
              {error}
            </p>
          )}
          <button className="button dark" type="submit" disabled={sending}>
            {sending ? f.sending : f.submit} <span aria-hidden="true">→</span>
          </button>
          <p className="activity-form-note">{f.note}</p>
        </form>
      )}
    </dialog>
  );
}

// Small line icons for the banner's facts, picked from their words.
const factIcons = [
  [/hari|malam|day|night/i, "M4 7h16v13H4zM4 11h16M9 4v5M15 4v5"],
  [
    /dive|selam|log/i,
    "M3 10a9 5 0 0 1 18 0v2a4 4 0 0 1-4 4h-1l-2-2h-4l-2 2H7a4 4 0 0 1-4-4z",
  ],
  [
    /orang|people|peserta|pax|group/i,
    "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a5 5 0 0 1 3 6",
  ],
];
const placeIcon =
  "M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z";
function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
const iconFor = (text) =>
  factIcons.find(([rule]) => rule.test(text))?.[1] ??
  "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z";

// One event as a wide photo banner: the owner's photo fills it, its
// subject on the right; on the left the event, its facts, the price per
// person and one button. The whole banner opens the sign-up form (or the
// owner's link), the button being the way in for keyboards.
function Banner({ banner, whatsapp, locale }) {
  const t = dictionary(locale).home.eventBanner;
  const signup = useRef(null);
  const text = (value) => calendarText(value, locale);
  const title = text(banner.title);
  const dates = eventDates(banner.startDate, banner.endDate, locale);
  // Prices are in rupiah, per person.
  const price =
    banner.amount > 0
      ? `${formatIDR(banner.amount, locale)} / ${t.perPerson}`
      : "";
  // The short description reads as where, then facts: "Raja Ampat · 8
  // days 7 nights · 15 logged dives", and the minimum group.
  const [place = "", ...parts] = text(banner.subtitle)
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
  const facts = [
    ...parts,
    ...(banner.minPeople > 1 ? [t.minPeople(banner.minPeople)] : []),
  ];
  // One button: the owner's link, or the sign-up form. A page of the site
  // opens in the visitor's language.
  const link = !banner.link
    ? ""
    : banner.link.startsWith("/") && !/^\/(id|en)(\/|$)/.test(banner.link)
      ? localeHref(locale, banner.link)
      : banner.link;
  const external = link.startsWith("https://");
  const action = useRef(null);
  const register = () => {
    signup.current?.showModal();
    signup.current?.querySelector("input")?.focus();
  };
  return (
    <aside
      className={"event-banner" + (banner.background ? " has-photo" : "")}
      aria-label={`${t.label}: ${title}`}
      onClick={(event) => {
        // A tap anywhere on the banner does what its button does.
        if (event.target.closest("a, button, dialog")) return;
        action.current?.click();
      }}
    >
      {banner.background ? (
        <img
          className="event-banner-bg"
          src={banner.background}
          srcSet={photoSrcSet(banner.background)}
          sizes="(max-width: 1600px) 100vw, 1600px"
          alt=""
          loading="lazy"
        />
      ) : (
        <svg
          className="event-banner-sea"
          viewBox="0 0 600 160"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 118c60-14 110 10 170-2s110-30 170-14 110 26 170 10 60-14 90-10v58H0z"
            fill="#ffffff10"
          />
          <path
            d="M0 136c70-10 120 8 190-2s120-22 190-8 120 18 170 6 40-6 50-4v32H0z"
            fill="#ffffff0d"
          />
          <path
            d="M430 46c22-14 46-16 68-6 10-12 24-16 36-10-10 4-16 12-18 22 14 4 26 12 34 24-20-4-38-2-54 6-14 6-30 6-44-2-8 8-18 12-30 12 6-8 8-16 6-24-4-8 0-16 2-22z"
            fill="#ffffff14"
          />
        </svg>
      )}
      <div className="event-banner-text">
        <p className="event-banner-meta">
          {text(banner.badge) && (
            <span className="event-banner-badge">{text(banner.badge)}</span>
          )}
          <span className="event-banner-dates">{dates || t.anyDate}</span>
        </p>
        <h3>{title}</h3>
        {place && (
          <p className="event-banner-place">
            <Icon d={placeIcon} />
            {place}
          </p>
        )}
        {facts.length > 0 && (
          <ul className="event-banner-facts">
            {facts.map((fact) => (
              <li key={fact}>
                <Icon d={iconFor(fact)} />
                {fact}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="event-banner-offer">
        {price && (
          <p className="event-banner-price">
            <small>{text(banner.note) || t.pricePer}</small>
            <strong>{formatIDR(banner.amount, locale)}</strong>
            <span>/ {t.perPerson}</span>
          </p>
        )}
        <div className="event-banner-actions">
          {link ? (
            <a
              ref={action}
              className="button lime event-banner-cta"
              href={link}
              {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {t.more} <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <button
              ref={action}
              type="button"
              className="button lime event-banner-cta"
              onClick={register}
            >
              {t.register} <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </div>
      {!link && (
        <EventSignup
          banner={banner}
          title={title}
          dates={dates}
          price={price}
          whatsapp={whatsapp}
          locale={locale}
          dialog={signup}
        />
      )}
    </aside>
  );
}

// Event banners above the experience cards; nothing when no event is on.
export default function EventBanners({ banners, whatsapp, locale }) {
  if (!banners?.length) return null;
  return (
    <div className="event-banners" data-reveal>
      {banners.map((banner, index) => (
        <Banner
          key={index}
          banner={banner}
          whatsapp={whatsapp}
          locale={locale}
        />
      ))}
    </div>
  );
}
