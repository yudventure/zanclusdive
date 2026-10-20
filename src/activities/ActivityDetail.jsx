"use client";
import { useEffect, useState, useRef } from "react";
import ScrollEffects from "../components/ScrollEffects.jsx";
import { photoSrcSet } from "../photography.js";
import { activityInquiry } from "../activity-model.js";
import { addOnItems, priceText } from "../price-list.js";
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
import { payableItems, quantityLimit } from "../payment-model.js";
import CartIcon from "../components/CartIcon.jsx";
import SlotCalendar, { SlotMonth, slotState } from "./SlotCalendar.jsx";
import FareChoice from "../components/FareChoice.jsx";
import {
  usePayMethod,
  payButtonText,
  PayMethodChoice,
  PayNotes,
} from "../components/PayMethods.jsx";
import {
  fareChoices,
  fareFor,
  fareMarkup,
  fareSettings,
} from "../fare-model.js";

// Per-person packages count one unit for each participant.
const perPerson = (unit) => /orang|person|pax|peserta/i.test(unit || "");
const unitName = (unit) => (unit || "").replace(/^\/\s*/, "");
// "2 days", "3 people" in English; Indonesian units stay as they are.
const unitCount = (unit, count, locale) => {
  const name = unitName(unit);
  if (locale !== "en" || count === 1 || !name) return name;
  if (name === "person") return "people";
  return name.endsWith("s") ? name : name + "s";
};

function Inquiry({
  activityKey,
  activity,
  contact,
  packages,
  offers,
  cart,
  changeCart,
  participants,
  changeParticipants,
  date,
  changeDate,
  slots,
  events,
  calendarToday,
  lastDate,
  payments,
  fares,
  locale,
}) {
  const t = dictionary(locale).activity;
  const p = dictionary(locale).payment;
  const f = dictionary(locale).fare;
  const label = dictionary(locale).activityLabels[activityKey];
  // Packages are chosen like a cart, from the price list or here; they are
  // paid online when Midtrans is switched on, otherwise they give the
  // estimate in the WhatsApp message.
  const ready = Boolean(payments?.ready) && packages.length > 0;
  const [step, setStep] = useState("form");
  const [intent, setIntent] = useState(ready ? "pay" : "ask");
  const [paying, setPaying] = useState(false);
  const [method, setMethod, methods] = usePayMethod(payments);
  // Standard, Comfort or Flexi; the increase applies to the packages.
  const [fare, setFare] = useState("standard");
  const [today, setToday] = useState("");
  const [fields, setFields] = useState({
    name: "",
    whatsapp: "",
    email: "",
    notes: "",
  });
  const details = { ...fields, date, participants };
  const sl = dictionary(locale).slots;
  // Places still free on the chosen date, or null without a daily limit.
  const capacity = slots?.capacity ?? 0;
  const closedOn = (key) =>
    (slots?.closed ?? []).some(([from, to]) => key >= from && key <= to);
  const placesLeft =
    capacity && date
      ? Math.max(0, capacity - (slots?.used?.[date] ?? 0))
      : null;
  const dayKind = date
    ? slotState(slots, calendarToday, lastDate).state(date)
    : null;
  const [error, setError] = useState("");
  const panelRef = useRef(null);
  const stepsRef = useRef(null);
  const summaryRef = useRef(null);
  useEffect(() => setToday(new Date().toLocaleDateString("en-CA")), []);
  // The summary opens at the top of the checkout window.
  useEffect(() => {
    const summary = summaryRef.current;
    if (step !== "summary" || !summary) return;
    panelRef.current?.closest("dialog")?.scrollTo?.({ top: 0 });
    summary.focus({ preventScroll: true });
  }, [step]);

  const lines = cart
    .map((line) => ({
      ...line,
      item: offers.find((item) => item.key === line.key),
    }))
    .filter((line) => line.item);
  const mainLines = lines.filter((line) => !line.item.addOn);
  const addOnLines = lines.filter((line) => line.item.addOn);
  const subtotal = lines.reduce(
    (sum, line) => sum + line.item.price * line.quantity,
    0,
  );
  const packagesTotal = mainLines.reduce(
    (sum, line) => sum + line.item.price * line.quantity,
    0,
  );
  const offered = fareChoices(fares).length > 1 && packagesTotal > 0;
  const fareChoice = fareFor(fares, offered ? fare : "standard");
  const markup = fareMarkup(packagesTotal, fareChoice.percent);
  const total = subtotal + markup;
  const fareName = f.names[fareChoice.tier];
  const unitOf = (line) =>
    unitCount(priceText(line.item.unit, locale), line.quantity, locale);
  const lineText = (line) =>
    `${priceText(line.item.name, locale)} × ${line.quantity}${unitOf(line) ? " " + unitOf(line) : ""}`;
  const order = lines.length
    ? {
        lines: [...mainLines, ...addOnLines].map((line) => ({
          item:
            priceText(line.item.name, locale) +
            (line.item.addOn ? ` (${p.addOnTag})` : ""),
          quantity: line.quantity,
          unit: unitOf(line),
        })),
        total,
        ...(offered ? { fare: f.message(fareName, fareChoice.percent) } : {}),
      }
    : null;
  const chosen = (item) => cart.some((line) => line.key === item.key);
  const unchosen = offers.filter((item) => !item.addOn && !chosen(item));
  const unchosenAddOns = offers.filter((item) => item.addOn && !chosen(item));

  function change(key, value) {
    if (key === "participants") changeParticipants(value);
    else if (key === "date") changeDate(value);
    else setFields((current) => ({ ...current, [key]: value }));
    setError("");
  }
  // The WhatsApp message; it throws with the reason when a field is wrong.
  const build = () =>
    activityInquiry(
      activityKey,
      activity,
      details,
      today,
      false,
      locale,
      order,
    );
  function check() {
    try {
      return build();
    } catch (err) {
      setError(err.message);
      return null;
    }
  }
  function toSummary(nextIntent) {
    if (!check()) return;
    if (nextIntent === "pay" && !mainLines.length) {
      setError(lines.length ? p.needMain : p.pickPackage);
      return;
    }
    if (nextIntent === "pay" && Number(details.participants) > quantityLimit) {
      setError(p.tooMany(quantityLimit));
      return;
    }
    // The daily places, checked again on the server.
    if (nextIntent === "pay" && closedOn(date)) {
      setError(sl.closedDate);
      return;
    }
    if (
      nextIntent === "pay" &&
      placesLeft !== null &&
      Number(details.participants) > placesLeft
    ) {
      setError(placesLeft ? sl.tooFew(placesLeft) : sl.fullDate);
      return;
    }
    setIntent(nextIntent);
    setError("");
    setStep("summary");
  }
  async function pay() {
    if (!mainLines.length || !check()) return;
    setError("");
    setPaying(true);
    try {
      const response = await fetch(`/api/payments?locale=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity: activityKey,
          lines: lines.map((line) => ({
            ...(line.item.addOn
              ? { addOn: line.item.id }
              : { item: line.item.index }),
            itemName: priceText(line.item.name, "id"),
            quantity: line.quantity,
          })),
          fare: fareChoice.tier,
          ...details,
          method,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.redirectUrl)
        throw new Error(result.error || p.failed);
      window.location.assign(result.redirectUrl);
    } catch (err) {
      setError(err.message || p.failed);
      setPaying(false);
    }
  }
  let message = "";
  if (step === "summary" && intent === "ask")
    try {
      message = build();
    } catch {}
  const dateText = details.date
    ? new Date(details.date + "T12:00:00").toLocaleDateString(
        locale === "id" ? "id-ID" : "en-GB",
        { weekday: "long", day: "numeric", month: "long", year: "numeric" },
      )
    : "";
  const steps = p.steps[ready ? "pay" : "ask"];
  const current = step === "form" ? 0 : 1;
  const breakdown = markup ? (
    <span className="plan-breakdown">
      {f.line(fareName, fareChoice.percent)} {formatIDR(markup, locale)}
    </span>
  ) : (
    lines.length === 1 && (
      <span className="plan-breakdown">
        {formatIDR(lines[0].item.price, locale)} ×{" "}
        {lineText(lines[0]).split(" × ")[1]}
      </span>
    )
  );

  return (
    <div className="activity-checkout-body" id="inquiry" ref={panelRef}>
      <p className="eyebrow">{sl.checkoutKicker}</p>
      <h2 id="inquiry-title">{sl.checkoutTitle}</h2>
      <ol className="plan-steps" aria-label={p.steps.label} ref={stepsRef}>
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
        <>
          <form
            className="activity-form"
            onSubmit={(event) => {
              event.preventDefault();
              toSummary(ready ? "pay" : "ask");
            }}
            noValidate
          >
            {packages.length > 0 ? (
              <fieldset className="plan-package">
                <legend>{p.cartTitle}</legend>
                {lines.length ? (
                  <ul className="plan-cart">
                    {[...mainLines, ...addOnLines].map((line) => {
                      const name = priceText(line.item.name, locale);
                      return (
                        <li
                          key={line.key}
                          className={line.item.addOn ? "is-addon" : undefined}
                        >
                          <span>
                            {line.item.addOn && (
                              <em className="plan-addon-tag">{p.addOnTag}</em>
                            )}
                            <strong>{name}</strong>
                            <small>
                              {formatIDR(line.item.price, locale)}{" "}
                              {priceText(line.item.unit, locale)}
                            </small>
                          </span>
                          <span className="shop-item-stepper">
                            <button
                              type="button"
                              aria-label={
                                line.quantity > 1
                                  ? p.less(name)
                                  : p.remove(name)
                              }
                              onClick={() => changeCart(line.key, -1)}
                            >
                              −
                            </button>
                            <span aria-live="polite">{line.quantity}</span>
                            <button
                              type="button"
                              aria-label={p.more(name)}
                              disabled={line.quantity >= quantityLimit}
                              onClick={() => changeCart(line.key, 1)}
                            >
                              +
                            </button>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="plan-cart-empty">{p.cartEmpty}</p>
                )}
                {unchosen.length > 0 && (
                  <select
                    className="plan-add"
                    aria-label={p.addPackage}
                    value=""
                    onChange={(e) => {
                      if (e.target.value === "") return;
                      changeCart(e.target.value, 1);
                      setError("");
                    }}
                  >
                    <option value="">{p.addPackage}</option>
                    {unchosen.map((item) => (
                      <option key={item.key} value={item.key}>
                        {priceText(item.name, locale)} ·{" "}
                        {formatIDR(item.price, locale)}{" "}
                        {priceText(item.unit, locale)}
                      </option>
                    ))}
                  </select>
                )}
                {unchosenAddOns.length > 0 && (
                  <div className="plan-addons">
                    <p>{p.addOnsPick}</p>
                    <ul>
                      {unchosenAddOns.map((item) => {
                        const name = priceText(item.name, locale);
                        return (
                          <li key={item.key}>
                            <button
                              type="button"
                              aria-label={p.addOnLabel(name)}
                              onClick={() => {
                                changeCart(item.key, 1);
                                setError("");
                              }}
                            >
                              <span aria-hidden="true">+</span>
                              <strong>{name}</strong>
                              <small>
                                {formatIDR(item.price, locale)}{" "}
                                {priceText(item.unit, locale)}
                              </small>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {offered && (
                  <FareChoice
                    fares={fares}
                    base={packagesTotal}
                    value={fareChoice.tier}
                    onChange={setFare}
                    locale={locale}
                  />
                )}
                <p className="pay-total">
                  <span>
                    {ready ? p.total : p.estimate}
                    {breakdown}
                  </span>
                  <strong>{formatIDR(total, locale)}</strong>
                </p>
              </fieldset>
            ) : (
              <div className="activity-price">
                <small>
                  {activity.price === null ? p.priceQuote : p.priceFrom}
                </small>
                <strong>
                  {activity.price === null
                    ? p.quoteValue
                    : `${formatIDR(activity.price, locale)} ${p.perPersonUnit}`}
                </strong>
                <p>{t.priceNote}</p>
              </div>
            )}
            {/* The date is picked from the days and the places left on
                each, the same as the calendar beside the page. */}
            <fieldset className="plan-dates" id="inquiry-date">
              <legend>
                {sl.checkoutDates}{" "}
                <span className="form-required" aria-hidden="true">
                  *
                </span>
              </legend>
              <p className="plan-dates-intro">
                {capacity ? sl.checkoutDatesIntro(capacity) : sl.intro}
              </p>
              <SlotMonth
                slots={slots}
                events={events}
                today={calendarToday}
                lastDate={lastDate}
                date={date}
                onSelect={(key) => change("date", key)}
                monthTag="strong"
                locale={locale}
              />
              <p
                className={
                  "slot-note" +
                  (dayKind === "closed" || dayKind === "full" ? " is-full" : "")
                }
                aria-live="polite"
              >
                {!date
                  ? sl.pickDate
                  : dayKind === "closed" || closedOn(date)
                    ? sl.closedDate
                    : placesLeft === null
                      ? sl.pickedOn(dateText)
                      : placesLeft
                        ? sl.pickedLeft(dateText, placesLeft, capacity)
                        : sl.fullDate}
              </p>
            </fieldset>
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
            <button className="button dark plan-next" type="submit">
              {ready ? p.toSummary : p.toSummaryAsk}{" "}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="activity-form-note">{ready ? p.payNote : t.formNote}</p>
        </>
      ) : (
        <section
          className="plan-summary"
          aria-labelledby="plan-summary-title"
          ref={summaryRef}
          tabIndex={-1}
        >
          <h3 id="plan-summary-title">
            {intent === "pay" ? p.summaryPay : p.summaryAsk}
          </h3>
          <dl className="plan-summary-list">
            {[
              [p.activity, label],
              ...(mainLines.length
                ? [[p.package, mainLines.map(lineText).join("\n")]]
                : []),
              ...(addOnLines.length
                ? [[p.addOnsLabel, addOnLines.map(lineText).join("\n")]]
                : []),
              ...(offered
                ? [
                    [
                      f.label,
                      `${f.line(fareName, fareChoice.percent)}\n${f.rules[fareChoice.tier](fareSettings(fares))}`,
                    ],
                  ]
                : []),
              [p.date, dateText],
              [p.participants, p.people(Number(details.participants))],
              [p.name, details.name.trim()],
              ["WhatsApp", details.whatsapp.trim()],
              ...(details.email.trim()
                ? [["Email", details.email.trim()]]
                : []),
              ...(details.notes.trim()
                ? [[p.notes, details.notes.trim()]]
                : []),
            ].map(([term, value]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {lines.length > 0 && (
            <p className="pay-total plan-summary-total">
              <span>
                {intent === "pay" ? p.total : p.estimate}
                {breakdown}
              </span>
              <strong>{formatIDR(total, locale)}</strong>
            </p>
          )}
          {error && (
            <p className="activity-error" role="alert">
              {error}
            </p>
          )}
          {intent === "pay" ? (
            <>
              <PayMethodChoice
                p={p}
                methods={methods}
                method={method}
                onChange={setMethod}
                disabled={paying}
              />
              <button
                className="button dark pay-submit"
                type="button"
                disabled={paying}
                onClick={pay}
              >
                {payButtonText(p, method, { total, locale, payments, paying })}{" "}
                <span aria-hidden="true">↗</span>
              </button>
              <PayNotes
                p={p}
                method={method}
                payments={payments}
                total={total}
              />
            </>
          ) : (
            message && (
              <div className="activity-message" role="status">
                <a
                  className="button lime"
                  href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.continueWhatsApp} <span aria-hidden="true">↗</span>
                </a>
                <p className="plan-ask-note">{p.askNote}</p>
                <details className="plan-message">
                  <summary>{p.viewMessage}</summary>
                  <p className="activity-message-preview">{message}</p>
                </details>
              </div>
            )
          )}
          <div className="plan-summary-actions">
            <button
              type="button"
              className="plan-back"
              disabled={paying}
              onClick={() => {
                setStep("form");
                setError("");
              }}
            >
              {p.edit}
            </button>
            {ready && (
              <button
                type="button"
                className="pay-unsure"
                disabled={paying}
                onClick={() => {
                  setError("");
                  if (intent === "pay") setIntent("ask");
                  else toSummary("pay");
                }}
              >
                {intent === "pay" ? p.sendSummary : p.payInstead}
              </button>
            )}
          </div>
        </section>
      )}
      <a
        className="activity-inquiry-contact"
        href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(t.askMessage(label))}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ContactIcon name="whatsapp" /> {t.askFirst}{" "}
        {phoneLabel(contact.whatsapp)} <span aria-hidden="true">↗</span>
      </a>
    </div>
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
  payments,
  slots,
  lastDate,
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
  // Packages go into a cart, like the Dive Shop: from the price cards or the
  // plan panel. Per-person packages start at, and follow, the number of
  // participants unless their quantity was changed by hand.
  const p = dict.payment;
  const packages = payableItems(content.priceList, activityKey);
  // Add-ons are Dive Shop rental gear (rented for the activity's day) and
  // items of the other price lists, offered beside the main packages.
  const addOns = addOnItems(
    content.priceList,
    activityKey,
    content.shop?.products ?? [],
  );
  const offers = [
    ...packages.map((item) => ({ ...item, key: "p" + item.index })),
    ...addOns.map((item) => ({ ...item, key: "a:" + item.id, addOn: true })),
  ];
  const offerOf = (key) => offers.find((item) => item.key === key);
  const sourceOf = (group) =>
    dict.shop.teaser.groups[group]?.[0] ?? labels[group] ?? p.extrasSource;
  const ready = Boolean(payments?.ready) && packages.length > 0;
  const [cart, setCart] = useState([]);
  const [participants, setParticipants] = useState(1);
  // The date chosen in the calendar beside the page, used at checkout.
  const [date, setDate] = useState("");
  const checkoutRef = useRef(null);
  const people = (value) =>
    Math.min(quantityLimit, Math.max(1, Math.round(Number(value)) || 1));
  const byPerson = (key) => perPerson(offerOf(key)?.unit?.id);
  function changeCart(key, delta) {
    // More people on a per-person package means more participants.
    const line = cart.find((entry) => entry.key === key);
    if (
      line &&
      byPerson(key) &&
      !offerOf(key)?.addOn &&
      line.quantity + delta > people(participants)
    )
      setParticipants(Math.min(quantityLimit, line.quantity + delta));
    setCart((current) => {
      const line = current.find((entry) => entry.key === key);
      const quantity = line
        ? line.quantity + delta
        : delta > 0
          ? byPerson(key)
            ? people(participants)
            : 1
          : 0;
      if (quantity <= 0) return current.filter((entry) => entry !== line);
      const next = { key, quantity: Math.min(quantityLimit, quantity) };
      return line
        ? current.map((entry) => (entry === line ? next : entry))
        : [...current, next];
    });
  }
  function changeParticipants(value) {
    const before = people(participants);
    setParticipants(value);
    setCart((current) =>
      current.map((line) =>
        byPerson(line.key) && line.quantity === before
          ? { ...line, quantity: people(value) }
          : line,
      ),
    );
  }
  const cartTotal = cart.reduce(
    (sum, line) => sum + (offerOf(line.key)?.price ?? 0) * line.quantity,
    0,
  );
  const addOnCount = cart.filter((line) => offerOf(line.key)?.addOn).length;
  // A stepper on a price or add-on card, or its add button.
  const cardCart = (key, name) => {
    const count = cart.find((line) => line.key === key)?.quantity ?? 0;
    return count ? (
      <span className="shop-item-stepper">
        <button
          type="button"
          aria-label={count > 1 ? p.less(name) : p.remove(name)}
          onClick={() => changeCart(key, -1)}
        >
          −
        </button>
        <span aria-live="polite">{count}</span>
        <button
          type="button"
          aria-label={p.more(name)}
          disabled={count >= quantityLimit}
          onClick={() => changeCart(key, 1)}
        >
          +
        </button>
      </span>
    ) : (
      <button
        type="button"
        className="shop-item-add"
        aria-label={p.addLabel(name)}
        onClick={() => changeCart(key, 1)}
      >
        <CartIcon /> {p.addToCart}
      </button>
    );
  };
  // Checkout opens over the page, on the first field still to fill.
  function checkout() {
    checkoutRef.current?.showModal();
    // Without a date, the guest picks one from the places left per day.
    const empty = date
      ? [...document.querySelectorAll("#inquiry input[required]")].find(
          (input) => !input.value,
        )
      : document.querySelector("#inquiry-date .slot-day:not([disabled])");
    empty?.focus();
  }
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
                ["calendar", dict.calendarPage.jump[0]],
                ...(calendar
                  ? [
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
                      {prices.map((item, index) => {
                        const name = priceText(item.name, locale);
                        const payable = packages.some(
                          (entry) => entry.index === index,
                        );
                        return (
                          <li key={index}>
                            <span>
                              <strong>{name}</strong>
                              {priceText(item.info, locale) && (
                                <small>{priceText(item.info, locale)}</small>
                              )}
                            </span>
                            <div className="activity-price-foot">
                              <b>
                                {formatIDR(item.price, locale)}
                                {priceText(item.unit, locale) && (
                                  <small>{priceText(item.unit, locale)}</small>
                                )}
                              </b>
                              {payable && cardCart("p" + index, name)}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {addOns.length > 0 && (
                      <div
                        className="activity-addons"
                        id="add-ons"
                        aria-labelledby="add-ons-title"
                      >
                        <h3 id="add-ons-title">
                          {p.addOnsTitle(labels[activityKey])}
                        </h3>
                        <p>{p.addOnsIntro}</p>
                        <ul className="activity-addon-list">
                          {addOns.map((item) => {
                            const name = priceText(item.name, locale);
                            const info = priceText(item.info, locale);
                            return (
                              <li key={item.id}>
                                <span>
                                  <em>{sourceOf(item.group)}</em>
                                  <strong>{name}</strong>
                                  {info && <small>{info}</small>}
                                </span>
                                <div className="activity-price-foot">
                                  <b>
                                    {formatIDR(item.price, locale)}
                                    {priceText(item.unit, locale) && (
                                      <small>
                                        {priceText(item.unit, locale)}
                                      </small>
                                    )}
                                  </b>
                                  {cardCart("a:" + item.id, name)}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
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
                {/* The cart follows the guest down the page once it has a
                    package, like the Dive Shop. Without priced packages the
                    bar opens the plan form for WhatsApp. */}
                {(cart.length > 0 || !packages.length) && (
                  <div className="shop-cart-bar activity-cart-bar">
                    <span className="shop-cart-icon">
                      <CartIcon />
                    </span>
                    <p>
                      {packages.length ? (
                        <>
                          <strong>
                            {p.cartBar(cart.length - addOnCount, addOnCount)}
                          </strong>
                          <small>
                            {`${ready ? p.total : p.estimate} ${formatIDR(cartTotal, locale)}`}
                          </small>
                        </>
                      ) : (
                        <strong>{dict.slots.planBar}</strong>
                      )}
                    </p>
                    <button
                      type="button"
                      className="button dark"
                      onClick={checkout}
                    >
                      {packages.length ? p.checkout : dict.slots.planOpen}{" "}
                      <span aria-hidden="true">↗</span>
                    </button>
                  </div>
                )}
              </div>
              <SlotCalendar
                slots={slots}
                events={calendar?.events ?? []}
                seasons={calendar?.seasons ?? []}
                today={today}
                lastDate={lastDate}
                date={date}
                onSelect={setDate}
                canCheckout={cart.length > 0 || !packages.length}
                onCheckout={checkout}
                label={labels[activityKey]}
                locale={locale}
              />
            </div>
            <dialog
              ref={checkoutRef}
              className="modal activity-checkout"
              aria-labelledby="inquiry-title"
            >
              <button
                type="button"
                className="close-modal"
                aria-label={dict.slots.close}
                onClick={() => checkoutRef.current?.close()}
              >
                ×
              </button>
              <Inquiry
                activityKey={activityKey}
                activity={activity}
                contact={content.contact}
                packages={packages}
                offers={offers}
                cart={cart}
                changeCart={changeCart}
                participants={participants}
                changeParticipants={changeParticipants}
                date={date}
                changeDate={setDate}
                slots={slots}
                events={calendar?.events ?? []}
                calendarToday={today}
                lastDate={lastDate}
                payments={payments}
                fares={content.fares}
                locale={locale}
              />
            </dialog>
            {calendar && (
              <CalendarSections
                calendar={calendar}
                whatsapp={content.contact.whatsapp}
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
