"use client";
import { useState } from "react";
import {
  statuses,
  sources,
  programTitle,
  bookingPrograms,
} from "../cms-model.js";
import { paymentStatusLabels } from "../payment-model.js";
import { monthDays } from "../month-grid.js";

const weekdays = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const longDate = (date) =>
  new Date(date + "T12:00:00").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
const shortDate = (date) =>
  new Date(date + "T12:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
const chipClass = (b) =>
  "calendar-booking " +
  b.status +
  (b.payment?.status === "paid" ? " paid" : "");
const chipTitle = (b, content) =>
  `${b.guestName || "Ditutup"} · ${programTitle(content, b.experience)} · ${statuses[b.status]} · ${sources[b.source]}${b.payment ? " · Pembayaran: " + paymentStatusLabels[b.payment.status] : ""}`;

// The reservation calendar as a month grid: reservations, closed dates and
// the agents' events as coloured chips, a day panel for the picked date.
export default function MonthCalendar({
  month,
  today,
  bookings,
  agents,
  content,
  onMove,
  onToday,
  onPick,
  onEdit,
}) {
  const [program, setProgram] = useState("all");
  const [selected, setSelected] = useState(null);
  const days = monthDays(month);
  const list = bookings.filter(
    (b) =>
      b.status !== "cancelled" &&
      (program === "all" || b.experience === program),
  );
  const onDay = (date) =>
    list.filter((b) => date >= b.startDate && date <= b.endDate);
  const agentEvents = agents
    .filter((agent) => agent.enabled)
    .flatMap((agent) =>
      (agent.events ?? []).map((event) => ({ agent, event })),
    );
  const agentsOn = (date) =>
    agentEvents.filter(({ event }) => date >= event.start && date <= event.end);
  const monthName = new Date(month + "-01T12:00:00").toLocaleDateString(
    "id-ID",
    { month: "long", year: "numeric" },
  );
  const picked =
    selected && days.includes(selected)
      ? selected
      : today.slice(0, 7) === month
        ? today
        : null;
  const pickedBookings = picked ? onDay(picked) : [];
  const pickedAgents = picked ? agentsOn(picked) : [];
  const guests = pickedBookings
    .filter((b) => b.status !== "closed")
    .reduce((sum, b) => sum + (Number(b.participants) || 0), 0);
  return (
    <>
      <section className="admin-card admin-month-card">
        <div className="admin-month-nav">
          <button
            type="button"
            className="admin-round"
            aria-label="Bulan lalu"
            onClick={() => onMove(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="admin-round"
            aria-label="Bulan berikut"
            onClick={() => onMove(1)}
          >
            ›
          </button>
          <h2>{monthName}</h2>
          <button type="button" className="admin-inline" onClick={onToday}>
            Bulan ini
          </button>
          <select
            aria-label="Filter kegiatan"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
          >
            <option value="all">Semua kegiatan</option>
            {bookingPrograms.map((key) => (
              <option key={key} value={key}>
                {programTitle(content, key)}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-month">
          <div className="admin-month-head" aria-hidden="true">
            {weekdays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="admin-month-days">
            {days.map((date) => {
              const chips = [
                ...onDay(date).map((b) => ({ kind: "booking", b })),
                ...agentsOn(date).map((x) => ({ kind: "agent", ...x })),
              ];
              const shown = chips.slice(0, 3);
              const extra = chips.length - shown.length;
              return (
                <div
                  key={date}
                  data-date={date}
                  className={
                    "admin-month-day" +
                    (date.slice(0, 7) === month ? "" : " is-outside") +
                    (date === today ? " is-today" : "") +
                    (date === picked ? " is-selected" : "")
                  }
                >
                  <button
                    type="button"
                    className="admin-month-date"
                    aria-label={`Lihat ${longDate(date)}`}
                    onClick={() => setSelected(date)}
                  >
                    {Number(date.slice(8))}
                  </button>
                  {shown.map((chip) =>
                    chip.kind === "booking" ? (
                      <button
                        key={chip.b.id}
                        type="button"
                        className={chipClass(chip.b)}
                        title={chipTitle(chip.b, content)}
                        onClick={() => onEdit(chip.b)}
                      >
                        <i aria-hidden="true" />
                        <span>
                          {chip.b.status === "closed"
                            ? "Tutup"
                            : chip.b.guestName}{" "}
                          · {programTitle(content, chip.b.experience)}
                        </span>
                      </button>
                    ) : (
                      <span
                        key={chip.agent.id + chip.event.uid}
                        className="calendar-agent"
                        title={`${chip.agent.name}: ${chip.event.summary}`}
                      >
                        <i aria-hidden="true" />
                        <span>
                          {chip.agent.name} · {chip.event.summary}
                        </span>
                      </span>
                    ),
                  )}
                  {extra > 0 && (
                    <button
                      type="button"
                      className="admin-month-more"
                      onClick={() => setSelected(date)}
                    >
                      +{extra} lainnya
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="admin-legend admin-month-legend">
          <span>
            <i className="dot confirmed" /> Dikonfirmasi
          </span>
          <span>
            <i className="dot pending" /> Belum dikonfirmasi
          </span>
          <span>
            <i className="dot paid" /> Lunas (online)
          </span>
          <span>
            <i className="dot agent" /> Agen & OTA
          </span>
          <span>
            <i className="dot closed" /> Tutup
          </span>
        </div>
      </section>
      {picked && (
        <section className="admin-card admin-day-card">
          <div className="admin-card-heading">
            <div>
              <h2>{longDate(picked)}</h2>
              <p className="admin-subtle">
                {pickedBookings.length
                  ? `${pickedBookings.length} catatan · ${guests} peserta`
                  : "Belum ada reservasi pada tanggal ini."}
              </p>
            </div>
            <button
              type="button"
              className="admin-button secondary"
              onClick={() => onPick(picked)}
            >
              Tambah reservasi tanggal ini
            </button>
          </div>
          {pickedBookings.map((b) => (
            <button
              key={b.id}
              type="button"
              className="admin-booking-summary"
              onClick={() => onEdit(b)}
            >
              <strong>{b.guestName || "Penutupan tanggal"}</strong>
              <span>
                {programTitle(content, b.experience)}
                {b.status !== "closed" && ` · ${b.participants} peserta`} ·{" "}
                {sources[b.source]}
                {b.payment?.status === "paid" && " · Lunas"}
              </span>
              <small>
                {shortDate(b.startDate)} — {shortDate(b.endDate)}
              </small>
              <span className={"admin-status " + b.status}>
                {statuses[b.status]}
              </span>
            </button>
          ))}
          {pickedAgents.map(({ agent, event }) => (
            <div
              key={agent.id + event.uid}
              className="admin-booking-summary is-agent"
            >
              <strong>{agent.name}</strong>
              <span>{event.summary}</span>
              <small>
                {shortDate(event.start)} — {shortDate(event.end)}
              </small>
              <span className="admin-status agent">Agen</span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
