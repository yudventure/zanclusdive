"use client";
import { useEffect, useRef, useState } from "react";
import FormField from "../components/FormField.jsx";
import PayPanel from "../components/PayPanel.jsx";
import ContactIcon from "../components/ContactIcon.jsx";
import { photoSrcSet } from "../photography.js";
import { phoneLabel } from "../contact-model.js";
import {
  courseChoices,
  courseInquiry,
  courseProfile,
  courseText,
} from "../course-model.js";
import { dictionary, formatIDR, intlLocale } from "../i18n.js";

function Select({ id, label, value, onChange, options, required }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="form-required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <select
        id={id}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([key, text]) => (
          <option key={key} value={key} disabled={required && key === ""}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

// The sign-up window of a course: the course with its dates and
// participants, the main participant, experience and health, gear and
// pick-up. A summary follows: pay in full with Midtrans, or send it on
// WhatsApp first. Dates use the daily diving places.
export default function CourseCheckout({
  courses,
  selected,
  onSelect,
  contact,
  payments,
  slots,
  today,
  lastDate,
  locale,
}) {
  const c = dictionary(locale).course;
  const a = dictionary(locale).activity;
  const p = dictionary(locale).payment;
  const sl = dictionary(locale).slots;
  const ready = Boolean(payments?.ready);
  const course = courses.find((x) => x.id === selected) || courses[0];
  const [step, setStep] = useState("form");
  const [details, setDetails] = useState({
    date: "",
    participants: 1,
    name: "",
    birthDate: "",
    nationality: "",
    whatsapp: "",
    email: "",
    certification: c.certOptions[0],
    dives: "0",
    swim: "",
    health: "",
    wetsuit: "",
    fins: "",
    stay: "",
    language: locale === "en" ? "en" : "id",
    notes: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const top = useRef(null);
  const summaryRef = useRef(null);
  // A new course starts again at the form.
  useEffect(() => setStep("form"), [selected]);
  useEffect(() => {
    if (step !== "summary") return;
    top.current?.closest("dialog")?.scrollTo?.({ top: 0 });
    summaryRef.current?.focus({ preventScroll: true });
  }, [step]);

  const participants = Number(details.participants) || 0;
  const total = course.price * Math.max(1, participants);
  const capacity = slots?.capacity ?? 0;
  const closed = (key) =>
    (slots?.closed ?? []).some(([from, to]) => key >= from && key <= to);
  const placesLeft =
    capacity && details.date
      ? Math.max(0, capacity - (slots?.used?.[details.date] ?? 0))
      : null;
  function change(key, value) {
    setDetails((current) => ({ ...current, [key]: value }));
    setError("");
  }
  function toSummary(event) {
    event.preventDefault();
    try {
      const text = courseInquiry(course, details, today, locale);
      // The daily places, checked again on the server.
      if (closed(details.date)) throw new Error(sl.closedDate);
      if (placesLeft !== null && participants > placesLeft)
        throw new Error(placesLeft ? sl.tooFew(placesLeft) : sl.fullDate);
      setMessage(text);
      setError("");
      setStep("summary");
    } catch (err) {
      setError(err.message);
    }
  }
  const longDate = (key) =>
    new Date(key + "T12:00:00Z").toLocaleDateString(intlLocale[locale], {
      timeZone: "UTC",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const steps = p.steps[ready ? "pay" : "ask"];
  const current = step === "form" ? 0 : 1;
  const breakdown = `${formatIDR(course.price, locale)} × ${p.people(Math.max(1, participants))}`;
  let summary = [];
  if (step === "summary")
    try {
      summary = [
        [c.course, courseText(course.name, locale)],
        [c.dateLabel, longDate(details.date)],
        [p.participants, p.people(participants)],
        [p.name, details.name.trim()],
        ["WhatsApp", details.whatsapp.trim()],
        ["Email", details.email.trim()],
        [c.certification, details.certification],
        ...courseProfile(course, details, locale),
        ...(details.notes.trim() ? [[p.notes, details.notes.trim()]] : []),
      ];
    } catch {}

  return (
    <div className="course-checkout-body" id="inquiry" ref={top}>
      <p className="eyebrow">{c.checkoutKicker}</p>
      <h2 id="inquiry-title">
        {c.checkoutTitle(courseText(course.name, locale))}
      </h2>
      <ol className="plan-steps" aria-label={p.steps.label}>
        {steps.map((name, index) => (
          <li
            key={name}
            className={
              index < current ? "done" : index === current ? "current" : ""
            }
            aria-current={index === current ? "step" : undefined}
          >
            <span aria-hidden="true">{index < current ? "✓" : index + 1}</span>
            {name}
          </li>
        ))}
      </ol>
      {step === "form" ? (
        <form
          className="activity-form course-form"
          onSubmit={toSummary}
          noValidate
        >
          <p className="course-checkout-intro">{c.checkoutIntro}</p>
          <div className="course-pick">
            {course.image && (
              <img
                src={course.image}
                srcSet={photoSrcSet(course.image)}
                sizes="96px"
                alt=""
                width="96"
                height="72"
              />
            )}
            <div>
              <small>{courseText(course.level, locale)}</small>
              <strong>{courseText(course.name, locale)}</strong>
              <span>
                {formatIDR(course.price, locale)} {c.perPerson}
                {courseText(course.duration, locale) &&
                  ` · ${courseText(course.duration, locale)}`}
              </span>
            </div>
          </div>
          {courses.length > 1 && (
            <Select
              id="course-select"
              label={c.course}
              value={course.id}
              onChange={onSelect}
              options={courses.map((x) => [x.id, courseText(x.name, locale)])}
            />
          )}
          <p className="form-required-note">
            <span aria-hidden="true">*</span> {a.requiredNote}
          </p>

          <fieldset className="course-group">
            <legend>{c.groups.schedule}</legend>
            <div className="form-row">
              <FormField
                id="course-date"
                label={c.dateLabel}
                icon="calendar"
                required
              >
                <input
                  id="course-date"
                  type="date"
                  min={today}
                  max={lastDate}
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
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={details.participants}
                  onChange={(e) => change("participants", e.target.value)}
                />
              </FormField>
            </div>
            {details.date && (capacity > 0 || closed(details.date)) && (
              <p
                className={
                  "slot-note" +
                  (closed(details.date) || placesLeft === 0 ? " is-full" : "")
                }
              >
                {closed(details.date)
                  ? sl.closedDate
                  : placesLeft
                    ? sl.leftFor(placesLeft)
                    : sl.fullDate}
              </p>
            )}
          </fieldset>

          <fieldset className="course-group">
            <legend>{c.groups.person}</legend>
            <FormField id="course-name" label={a.name} icon="user" required>
              <input
                id="course-name"
                autoComplete="name"
                maxLength={80}
                required
                value={details.name}
                onChange={(e) => change("name", e.target.value)}
                placeholder={a.namePlaceholder}
              />
            </FormField>
            <div className="form-row">
              <FormField
                id="course-birth"
                label={c.birthDate}
                icon="calendar"
                required
              >
                <input
                  id="course-birth"
                  type="date"
                  autoComplete="bday"
                  max={today}
                  required
                  value={details.birthDate}
                  onChange={(e) => change("birthDate", e.target.value)}
                />
              </FormField>
              <FormField
                id="course-nationality"
                label={c.nationality}
                icon="flag"
                optional={a.optional}
              >
                <input
                  id="course-nationality"
                  autoComplete="country-name"
                  maxLength={60}
                  value={details.nationality}
                  onChange={(e) => change("nationality", e.target.value)}
                  placeholder={c.nationalityPlaceholder}
                />
              </FormField>
            </div>
            <FormField
              id="course-whatsapp"
              label={a.whatsapp}
              icon="whatsapp"
              required
            >
              <input
                id="course-whatsapp"
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
            <FormField id="course-email" label={a.email} icon="email" required>
              <input
                id="course-email"
                type="email"
                autoComplete="email"
                maxLength={200}
                required
                value={details.email}
                onChange={(e) => change("email", e.target.value)}
                placeholder={a.emailPlaceholder}
              />
            </FormField>
            <p className="course-hint">{c.emailHint}</p>
          </fieldset>

          <fieldset className="course-group">
            <legend>{c.groups.experience}</legend>
            <div className="form-row">
              <Select
                id="course-certification"
                label={c.certification}
                value={details.certification}
                onChange={(value) => change("certification", value)}
                options={c.certOptions.map((x) => [x, x])}
              />
              <Select
                id="course-dives"
                label={c.dives}
                value={details.dives}
                onChange={(value) => change("dives", value)}
                options={courseChoices.dives.map((x) => [x, c.diveOptions[x]])}
              />
            </div>
            <Select
              id="course-swim"
              label={c.swim}
              required
              value={details.swim}
              onChange={(value) => change("swim", value)}
              options={[
                ["", c.choosePlaceholder],
                ...courseChoices.swim.map((x) => [x, c.swimOptions[x]]),
              ]}
            />
            <fieldset className="course-choice">
              <legend>
                {c.health}
                <span className="form-required" aria-hidden="true">
                  *
                </span>
              </legend>
              {courseChoices.health.map((x) => (
                <label key={x}>
                  <input
                    type="radio"
                    name="course-health"
                    value={x}
                    checked={details.health === x}
                    onChange={() => change("health", x)}
                  />
                  {c.healthOptions[x]}
                </label>
              ))}
              <p className="course-hint">{c.healthNote}</p>
            </fieldset>
          </fieldset>

          <fieldset className="course-group">
            <legend>{c.groups.gear}</legend>
            <div className="form-row">
              <Select
                id="course-wetsuit"
                label={c.wetsuit}
                value={details.wetsuit}
                onChange={(value) => change("wetsuit", value)}
                options={courseChoices.wetsuit.map((x) => [
                  x,
                  x || c.wetsuitUnknown,
                ])}
              />
              <FormField id="course-fins" label={c.fins} optional={a.optional}>
                <input
                  id="course-fins"
                  type="number"
                  inputMode="numeric"
                  min="30"
                  max="50"
                  value={details.fins}
                  onChange={(e) => change("fins", e.target.value)}
                  placeholder="42"
                />
              </FormField>
            </div>
            <div className="form-row">
              <FormField
                id="course-stay"
                label={c.stay}
                icon="home"
                optional={a.optional}
              >
                <input
                  id="course-stay"
                  maxLength={120}
                  value={details.stay}
                  onChange={(e) => change("stay", e.target.value)}
                  placeholder={c.stayPlaceholder}
                />
              </FormField>
              <Select
                id="course-language"
                label={c.language}
                value={details.language}
                onChange={(value) => change("language", value)}
                options={courseChoices.language.map((x) => [
                  x,
                  c.languageOptions[x],
                ])}
              />
            </div>
            <FormField
              id="course-notes"
              label={a.notes}
              icon="note"
              optional={a.optional}
            >
              <textarea
                id="course-notes"
                rows="3"
                maxLength={1000}
                value={details.notes}
                onChange={(e) => change("notes", e.target.value)}
                placeholder={a.notesPlaceholder}
              />
            </FormField>
          </fieldset>

          <p className="pay-total">
            <span>
              {ready ? p.total : p.estimate}
              <span className="plan-breakdown">{breakdown}</span>
            </span>
            <strong>{formatIDR(total, locale)}</strong>
          </p>
          {error && (
            <p className="activity-error" role="alert">
              {error}
            </p>
          )}
          <button className="button dark plan-next" type="submit">
            {ready ? p.toSummary : p.toSummaryAsk}{" "}
            <span aria-hidden="true">→</span>
          </button>
        </form>
      ) : (
        <section
          className="plan-summary"
          aria-labelledby="plan-summary-title"
          ref={summaryRef}
          tabIndex={-1}
        >
          <h3 id="plan-summary-title">{ready ? p.summaryPay : p.summaryAsk}</h3>
          <dl className="plan-summary-list">
            {summary.map(([term, value]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {ready ? (
            <PayPanel
              order={{
                kind: "course",
                course: course.id,
                ...details,
                participants,
              }}
              total={total}
              breakdown={breakdown}
              message={message}
              whatsapp={contact.whatsapp}
              sandbox={payments.sandbox}
              locale={locale}
              submitText={c.payFull(formatIDR(total, locale))}
              unsureText={c.askFirst}
            />
          ) : (
            <div className="activity-message" role="status">
              <p className="pay-total plan-summary-total">
                <span>
                  {p.estimate}
                  <span className="plan-breakdown">{breakdown}</span>
                </span>
                <strong>{formatIDR(total, locale)}</strong>
              </p>
              <a
                className="button lime"
                href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {a.continueWhatsApp} <span aria-hidden="true">↗</span>
              </a>
              <details className="plan-message">
                <summary>{p.viewMessage}</summary>
                <p className="activity-message-preview">{message}</p>
              </details>
            </div>
          )}
          <div className="plan-summary-actions">
            <button
              type="button"
              className="plan-back"
              onClick={() => setStep("form")}
            >
              {p.edit}
            </button>
          </div>
        </section>
      )}
      <a
        className="activity-inquiry-contact"
        href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(c.message.greeting(courseText(course.name, locale)))}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ContactIcon name="whatsapp" /> {a.askFirst}{" "}
        {phoneLabel(contact.whatsapp)} <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
