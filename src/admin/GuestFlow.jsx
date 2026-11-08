"use client";
import { useState } from "react";
import { statuses, sources, programTitle } from "../cms-model.js";
import { guestFlow, whatsappNumber } from "../calendar-day.js";

const tabs = [
  ["past", "Sudah datang"],
  ["today", "Hari ini"],
  ["next", "Akan datang"],
];
const empty = {
  past: "Belum ada tamu yang datang dalam 7 hari terakhir.",
  today: "Belum ada tamu hari ini.",
  next: "Belum ada tamu yang akan datang dalam 7 hari ke depan.",
};
const dayName = (date) =>
  new Date(date + "T12:00:00").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
const shortDate = (date) =>
  new Date(date + "T12:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
const nearby = (date, today) => {
  const gap = Math.round((Date.parse(date) - Date.parse(today)) / 864e5);
  return gap === 0
    ? "Hari ini"
    : gap === -1
      ? "Kemarin"
      : gap === 1
        ? "Besok"
        : "";
};

// Beside the calendar, under the day's agenda: the guests who came in the
// last seven days, who is out today, and who arrives in the next seven, by
// the day they arrive. It follows the activity picked above the calendar.
export default function GuestFlow({
  today,
  bookings,
  agents,
  content,
  program,
  onEdit,
}) {
  const [tab, setTab] = useState("today");
  const flow = guestFlow(today, bookings, { agents, program });
  const shown = flow[tab];
  const row = (entry) => {
    if (!entry.booking) {
      const { agent, event } = entry;
      return (
        <li
          key={agent.id + event.uid}
          className="admin-day-person is-static is-agent"
        >
          <strong className="admin-day-name">{agent.name}</strong>
          <span className="admin-status agent">Agen</span>
          <span className="admin-day-detail">
            <i className="admin-flow-kind" aria-hidden="true" />
            {event.summary}
            {event.end !== event.start &&
              `, ${shortDate(event.start)} sampai ${shortDate(event.end)}`}
          </span>
        </li>
      );
    }
    const { booking: b, day, days } = entry;
    const wa = whatsappNumber(b.phone);
    const detail = [
      programTitle(content, b.experience),
      `${b.participants} orang`,
      days > 1 &&
        (tab === "today"
          ? `hari ${day} dari ${days}`
          : `${shortDate(b.startDate)} sampai ${shortDate(b.endDate)}`),
      sources[b.source],
      b.payment?.status === "paid" && "lunas",
    ].filter(Boolean);
    return (
      <li
        key={b.id}
        className={"admin-day-person is-" + b.experience}
        onClick={(event) => {
          if (!event.target.closest("a, button")) onEdit(b);
        }}
      >
        <button
          type="button"
          className="admin-day-name"
          onClick={() => onEdit(b)}
        >
          {b.guestName || "Tanpa nama"}
        </button>
        <span className={"admin-status " + b.status}>{statuses[b.status]}</span>
        <span className="admin-day-detail">
          <i className="admin-flow-kind" aria-hidden="true" />
          {detail.join(" · ")}
        </span>
        {wa && (
          <a
            className="admin-day-wa"
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp ${b.guestName}`}
          >
            WhatsApp
          </a>
        )}
      </li>
    );
  };
  return (
    <section
      className="admin-card admin-guest-flow"
      aria-labelledby="flow-title"
    >
      <p className="admin-day-eyebrow">Tamu</p>
      <h2 id="flow-title">Sudah dan akan datang</h2>
      <p className="admin-subtle">
        7 hari sebelum dan sesudah hari ini, menurut hari kedatangan.
        {program !== "all" && ` Hanya ${programTitle(content, program)}.`}
      </p>
      <div
        className="admin-month-views admin-flow-tabs"
        role="group"
        aria-label="Waktu kedatangan"
      >
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
            <b>{flow[key].count}</b>
          </button>
        ))}
      </div>
      {shown.count > 0 ? (
        <>
          <p className="admin-flow-total">
            {shown.count} reservasi, {shown.people} orang
          </p>
          {shown.groups.map((group) => (
            <div key={group.date} className="admin-flow-day">
              <h3>
                {dayName(group.date)}
                <small>
                  {[
                    nearby(group.date, today),
                    group.people > 0 && `${group.people} orang`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </h3>
              <ul>{group.entries.map(row)}</ul>
            </div>
          ))}
        </>
      ) : (
        <p className="admin-day-none">{empty[tab]}</p>
      )}
    </section>
  );
}
