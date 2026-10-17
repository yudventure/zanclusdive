"use client";
import { useState } from "react";
import { dictionary, formatIDR, intlLocale, localeHref } from "../i18n.js";
import { fareSettings, shiftDate } from "../fare-model.js";
import { SlotMonth } from "../activities/SlotCalendar.jsx";

const longDate = (key, locale) =>
  new Date(key + "T12:00:00Z").toLocaleDateString(intlLocale[locale], {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// The guest's own page for a paid booking: what was booked, the fare and
// its last days, and (when the fare allows and the day has not passed) a
// new date or a cancellation for the refund.
export default function ManageBooking({
  initial,
  token,
  locale,
  whatsapp,
  slots,
  lastDate,
  programLabel,
}) {
  const t = dictionary(locale).manage;
  const f = dictionary(locale).fare;
  const [view, setView] = useState(initial);
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirming, setConfirming] = useState(false);
  const money = (n) => formatIDR(n, locale);
  const fare = view.fare;
  const actions = view.actions;
  const range =
    view.endDate && view.endDate !== view.startDate
      ? `${longDate(view.startDate, locale)} ${locale === "en" ? "to" : "sampai"} ${longDate(view.endDate, locale)}`
      : longDate(view.startDate, locale);
  const items =
    (locale === "en" ? view.itemEn : view.item) ||
    view.lines
      .map(
        (line) => `${line.name?.[locale] || line.name?.id} × ${line.quantity}`,
      )
      .join(", ");

  async function send(body, kind) {
    setBusy(kind);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/booking/${view.id}?locale=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, ...body }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.view)
        throw new Error(result.error || t.failed);
      setView(result.view);
      return result.view;
    } catch (err) {
      setError(err.message || t.failed);
      return null;
    } finally {
      setBusy("");
    }
  }
  async function move(event) {
    event.preventDefault();
    if (!date) {
      setError(t.pickDate);
      return;
    }
    const next = await send({ action: "reschedule", date }, "move");
    if (next) {
      setNotice(t.moved(longDate(next.startDate, locale)));
      setDate("");
    }
  }
  async function refund() {
    const next = await send({ action: "refund" }, "refund");
    if (next) setConfirming(false);
  }

  const paid = view.paymentStatus === "paid";
  const cancelled = view.status === "cancelled";
  const past = view.today >= view.startDate;
  const rules = fare ? f.rules[fare.tier](fareSettings(fare)) : "";
  const chat = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(t.chatText(view.reference))}`
    : "";
  return (
    <main className="manage-page">
      <div className="manage-card">
        <a className="manage-logo" href={localeHref(locale, "/")}>
          <img
            src="/assets/logo-header-light.svg"
            alt="Zanclus Dive Center"
            width="176"
            height="44"
          />
        </a>
        <p className="eyebrow">{t.kicker}</p>
        <h1>{t.title}</h1>
        <dl className="manage-details">
          {[
            [t.reference, view.reference],
            [t.program, programLabel],
            [t.items, items],
            [t.date, range],
            ...(["shop", "service"].includes(view.experience)
              ? []
              : [[t.participants, String(view.participants)]]),
            [t.paid, money(view.amount)],
          ].map(([term, value]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {fare && (
          <section className="manage-fare" aria-labelledby="manage-fare">
            <h2 id="manage-fare">
              {t.fare} {f.names[fare.tier]}
              {fare.percent ? <span> +{fare.percent}%</span> : null}
            </h2>
            <p>{rules}</p>
            {!cancelled && (actions.rescheduleUntil || actions.refundUntil) && (
              <ul>
                {actions.rescheduleUntil && (
                  <li>
                    {t.rescheduleUntil(
                      longDate(actions.rescheduleUntil, locale),
                    )}
                  </li>
                )}
                {actions.refundUntil && (
                  <li>
                    {t.refundUntil(
                      longDate(actions.refundUntil, locale),
                      money(actions.refundAmount),
                    )}
                  </li>
                )}
              </ul>
            )}
          </section>
        )}
        {notice && (
          <p className="manage-notice" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="activity-error" role="alert">
            {error}
          </p>
        )}
        {cancelled ? (
          <p className="manage-state" role="status">
            {view.refund?.status === "done"
              ? t.refundDone(
                  money(view.refund.amount),
                  longDate(view.refund.doneAt.slice(0, 10), locale),
                )
              : view.refund
                ? t.refundRequested(money(view.refund.amount))
                : t.cancelled}
          </p>
        ) : !paid ? (
          <p className="manage-state">{t.unpaid}</p>
        ) : past ? (
          <p className="manage-state">{t.past}</p>
        ) : (
          <>
            {fare?.tier === "standard" && (
              <p className="manage-state">{t.standardNote}</p>
            )}
            {actions.canReschedule ? (
              <form className="manage-move" onSubmit={move}>
                <h2>{t.moveTitle}</h2>
                <p>{t.moveIntro}</p>
                <SlotMonth
                  slots={slots}
                  today={shiftDate(view.today, 1)}
                  lastDate={lastDate}
                  date={date}
                  onSelect={(key) => {
                    setDate(key);
                    setError("");
                  }}
                  monthTag="strong"
                  locale={locale}
                />
                {date && (
                  <p className="manage-chosen">
                    {t.chosen(longDate(date, locale))}
                  </p>
                )}
                <button
                  className="button dark"
                  type="submit"
                  disabled={Boolean(busy)}
                >
                  {busy === "move" ? t.moving : t.moveSubmit}
                </button>
              </form>
            ) : (
              actions.rescheduleUntil && (
                <p className="manage-state">
                  {t.closedMove(longDate(actions.rescheduleUntil, locale))}
                </p>
              )
            )}
            {actions.canRefund ? (
              <section
                className="manage-refund"
                aria-labelledby="manage-refund"
              >
                <h2 id="manage-refund">{t.refundTitle}</h2>
                <p>{t.refundIntro(money(actions.refundAmount))}</p>
                {confirming ? (
                  <div className="manage-confirm">
                    <button
                      type="button"
                      className="button manage-cancel"
                      disabled={Boolean(busy)}
                      onClick={refund}
                    >
                      {busy === "refund"
                        ? t.refunding
                        : t.refundConfirm(money(actions.refundAmount))}
                    </button>
                    <button
                      type="button"
                      className="manage-keep"
                      onClick={() => setConfirming(false)}
                    >
                      {t.refundKeep}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="button manage-cancel-ask"
                    onClick={() => setConfirming(true)}
                  >
                    {t.refundAsk}
                  </button>
                )}
              </section>
            ) : (
              actions.refundUntil && (
                <p className="manage-state">
                  {t.closedRefund(longDate(actions.refundUntil, locale))}
                </p>
              )
            )}
          </>
        )}
        {view.reschedules.length > 0 && (
          <section className="manage-history" aria-labelledby="manage-history">
            <h2 id="manage-history">{t.history}</h2>
            <ul>
              {view.reschedules.map((change) => (
                <li key={change.at}>
                  {t.historyLine(
                    longDate(change.from, locale),
                    longDate(change.to, locale),
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="manage-links">
          {chat && (
            <a
              className="button lime"
              href={chat}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.chat} <span aria-hidden="true">↗</span>
            </a>
          )}
          <a className="manage-home" href={localeHref(locale, "/")}>
            {t.home}
          </a>
        </div>
      </div>
    </main>
  );
}
