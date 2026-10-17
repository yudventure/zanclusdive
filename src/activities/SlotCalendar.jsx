"use client";
import { useEffect, useState } from "react";
import { dictionary, intlLocale } from "../i18n.js";
import { calendarText, monthGrid } from "../calendar-model.js";

const utc = (y, m, d = 1) => new Date(Date.UTC(y, m, d, 12));
const iso = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
// Five places or fewer is "almost full".
const lowAt = 5;

// What a day is for booking: open | low | full | closed | past, and the
// places still free on it.
export function slotState(slots, today, lastDate) {
  const capacity = slots?.capacity ?? 0;
  const closed = (key) =>
    (slots?.closed ?? []).some(([from, to]) => key >= from && key <= to);
  const left = (key) => Math.max(0, capacity - (slots?.used?.[key] ?? 0));
  function state(key) {
    if (key < today || key > lastDate) return "past";
    if (closed(key)) return "closed";
    if (!capacity) return "open";
    const n = left(key);
    return n === 0 ? "full" : n <= lowAt ? "low" : "open";
  }
  return { capacity, left, state };
}

// A month of days with the places left on each, used beside the page and
// in the checkout window. Full, closed and past days can't be picked.
export function SlotMonth({
  slots,
  events = [],
  today,
  lastDate,
  date,
  onSelect,
  onMonth,
  monthTag: MonthTag = "h3",
  locale,
}) {
  const t = dictionary(locale).slots;
  const c = dictionary(locale).calendarPage;
  const [year, month] = (date || today).split("-").map(Number);
  const [view, setView] = useState({ year, month: month - 1 });
  // A date picked elsewhere (beside the page or in the checkout) brings
  // its month into view.
  useEffect(() => {
    if (!date) return;
    const [y, m] = date.split("-").map(Number);
    setView((v) =>
      v.year === y && v.month === m - 1 ? v : { year: y, month: m - 1 },
    );
  }, [date]);
  useEffect(() => onMonth?.(view.month), [view.month, onMonth]);
  const { capacity, left, state } = slotState(slots, today, lastDate);
  const fmt = (value, options) =>
    value.toLocaleDateString(intlLocale[locale], {
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
  const first = today.slice(0, 7);
  const lastMonth = lastDate.slice(0, 7);
  const viewKey = iso(view.year, view.month, 1).slice(0, 7);
  function move(delta) {
    const d = utc(view.year, view.month + delta);
    setView({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  }
  const eventsOn = (key) => events.filter((e) => e.date === key);
  return (
    <>
      <div className="slot-month-bar">
        <button
          type="button"
          aria-label={c.previous}
          disabled={viewKey <= first}
          onClick={() => move(-1)}
        >
          ←
        </button>
        <MonthTag className="slot-month-name" aria-live="polite">
          {monthName}
        </MonthTag>
        <button
          type="button"
          aria-label={c.next}
          disabled={viewKey >= lastMonth}
          onClick={() => move(1)}
        >
          →
        </button>
      </div>
      <div className="slot-grid">
        {c.weekdays.map((w) => (
          <span className="slot-weekday" key={w}>
            {w}
          </span>
        ))}
        {monthGrid(view.year, view.month).map((d, i) => {
          if (!d) return <span key={"b" + i} aria-hidden="true" />;
          const key = iso(view.year, view.month, d);
          const kind = state(key);
          const usable = kind === "open" || kind === "low";
          const status =
            kind === "closed"
              ? t.closed
              : kind === "full"
                ? t.full
                : kind === "past"
                  ? ""
                  : t.dayState(left(key), capacity);
          return (
            <button
              type="button"
              key={key}
              data-date={key}
              className={[
                "slot-day",
                "is-" + kind,
                key === today ? "is-today" : "",
                key === date ? "is-selected" : "",
                eventsOn(key).length ? "has-events" : "",
              ].join(" ")}
              aria-pressed={key === date}
              aria-label={
                status ? `${longDate(key)}, ${status}` : longDate(key)
              }
              disabled={!usable}
              onClick={() => onSelect(key === date ? "" : key)}
            >
              <span className="slot-day-number">{d}</span>
              {kind !== "past" && (
                <small aria-hidden="true">
                  {kind === "closed"
                    ? t.closed
                    : kind === "full"
                      ? t.full
                      : capacity
                        ? left(key)
                        : ""}
                </small>
              )}
            </button>
          );
        })}
      </div>
      <ul className="slot-legend">
        {(capacity
          ? ["open", "low", "full", "closed"]
          : ["open", "closed"]
        ).map((kind) => (
          <li key={kind}>
            <i className={"is-" + kind} aria-hidden="true" />
            {t.legend[kind]}
          </li>
        ))}
      </ul>
    </>
  );
}

// The calendar beside an activity page: each day shows the places still
// free (when the activity has a daily limit), closed days and scheduled
// activities. The chosen day is the date used at checkout. Below it, the
// best months to dive.
export default function SlotCalendar({
  slots,
  events = [],
  seasons = [],
  today,
  lastDate,
  date,
  onSelect,
  canCheckout,
  onCheckout,
  label,
  locale,
}) {
  const t = dictionary(locale).slots;
  const c = dictionary(locale).calendarPage;
  const [shown, setShown] = useState(Number((date || today).slice(5, 7)) - 1);
  const { capacity, left, state } = slotState(slots, today, lastDate);
  const fmt = (value, options) =>
    value.toLocaleDateString(intlLocale[locale], {
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
  const eventsOn = (key) => events.filter((e) => e.date === key);
  const picked = date ? state(date) : null;
  return (
    <aside
      className="slot-calendar"
      id="calendar"
      aria-labelledby="slot-calendar-title"
    >
      <p className="eyebrow">{t.eyebrow}</p>
      <h2 id="slot-calendar-title">{t.title(label)}</h2>
      <p className="slot-intro">
        {capacity ? t.introCapacity(capacity, label) : t.intro}
      </p>
      <SlotMonth
        slots={slots}
        events={events}
        today={today}
        lastDate={lastDate}
        date={date}
        onSelect={onSelect}
        onMonth={setShown}
        locale={locale}
      />
      {date && (
        <div className="slot-picked" role="status">
          <strong>{longDate(date)}</strong>
          <span>
            {picked === "full"
              ? t.pickedFull
              : picked === "closed"
                ? t.pickedClosed
                : t.dayState(left(date), capacity)}
          </span>
          {eventsOn(date).length > 0 && (
            <ul className="slot-events" aria-label={t.events}>
              {eventsOn(date).map((e, i) => (
                <li key={i}>
                  <i className={"type-" + e.type} aria-hidden="true" />
                  {calendarText(e.title, locale)}
                  {e.place && <small> · {e.place}</small>}
                </li>
              ))}
            </ul>
          )}
          {canCheckout ? (
            <button type="button" className="button dark" onClick={onCheckout}>
              {t.checkoutDate} <span aria-hidden="true">↗</span>
            </button>
          ) : (
            <a className="slot-link" href="#prices">
              {t.pickPackages}
            </a>
          )}
        </div>
      )}
      {seasons.length === 12 && (
        <section
          className="slot-seasons"
          id="seasons"
          aria-labelledby="slot-seasons-title"
        >
          <h3 id="slot-seasons-title">{t.seasonsTitle}</h3>
          <p>{t.seasonsIntro}</p>
          <ol>
            {seasons.map((s, i) => (
              <li
                key={i}
                className={
                  "season-" + s.rating + (i === shown ? " is-current" : "")
                }
                title={calendarText(s.note, locale)}
              >
                <strong>{fmt(utc(2026, i), { month: "short" })}</strong>
                <span>{c.ratings[s.rating]}</span>
              </li>
            ))}
          </ol>
          {calendarText(seasons[shown]?.note, locale) && (
            <p className="slot-season-note">
              <strong>{fmt(utc(2026, shown), { month: "long" })}</strong>
              {calendarText(seasons[shown].note, locale)}
            </p>
          )}
        </section>
      )}
    </aside>
  );
}
