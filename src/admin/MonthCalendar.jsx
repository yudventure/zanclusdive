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
import { rentalCalendar, gearLeft } from "../shop-stock.js";

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

// One rental gear on a day: its units out against its rental stock.
const gearState = (entry) => {
  const left = gearLeft(entry);
  return left === null
    ? "free"
    : left < 0
      ? "over"
      : left === 0
        ? "full"
        : "ok";
};
const gearText = (entry) => {
  const left = gearLeft(entry);
  if (left === null)
    return `${entry.used} disewa, website belum mengikuti stok sewanya`;
  if (left < 0)
    return `${entry.used} disewa dari stok ${entry.stock}, lebih ${-left}`;
  if (left === 0) return `Penuh, ${entry.used} dari ${entry.stock} disewa`;
  return `${entry.used} dari ${entry.stock} disewa, sisa ${left}`;
};

// The reservation calendar as a month grid: reservations, closed dates and
// the agents' events as coloured chips, a day panel for the picked date.
// The Sewa alat view shows the rental gear out on each day against its
// rental stock ("gear", from the warehouse), so the team sees at a glance
// whether a unit can be rented out again.
export default function MonthCalendar({
  month,
  today,
  bookings,
  agents,
  content,
  gear,
  onMove,
  onToday,
  onPick,
  onEdit,
}) {
  const [program, setProgram] = useState("all");
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("bookings");
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
  const rentals =
    view === "gear"
      ? rentalCalendar(bookings, gear ?? [], days[0], days.at(-1))
      : {};
  const byId = new Map(bookings.map((b) => [b.id, b]));
  const pickedGear = picked ? (rentals[picked] ?? []) : [];
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
          <div
            className="admin-month-views"
            role="group"
            aria-label="Tampilan kalender"
          >
            <button
              type="button"
              aria-pressed={view === "bookings"}
              onClick={() => setView("bookings")}
            >
              Reservasi
            </button>
            <button
              type="button"
              aria-pressed={view === "gear"}
              onClick={() => setView("gear")}
            >
              Sewa alat
            </button>
          </div>
          {view === "bookings" && (
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
          )}
        </div>
        {view === "gear" && (
          <p className="admin-subtle admin-month-note">
            {gear
              ? "Alat sewa dari pesanan online, add-on aktivitas, dan reservasi yang dicatat tim, dihitung saat reservasinya dikonfirmasi atau pembayarannya berjalan. Angkanya disewa dari stok sewa."
              : "Memuat stok alat sewa…"}
          </p>
        )}
        <div className="admin-month">
          <div className="admin-month-head" aria-hidden="true">
            {weekdays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="admin-month-days">
            {days.map((date) => {
              const chips =
                view === "gear"
                  ? (rentals[date] ?? []).map((entry) => ({
                      kind: "gear",
                      entry,
                    }))
                  : [
                      ...onDay(date).map((b) => ({ kind: "booking", b })),
                      ...agentsOn(date).map((x) => ({ kind: "agent", ...x })),
                    ];
              const shown = chips.slice(0, 3);
              const extra = chips.length - shown.length;
              const full =
                view === "gear" &&
                (rentals[date] ?? []).some((e) =>
                  ["full", "over"].includes(gearState(e)),
                );
              return (
                <div
                  key={date}
                  data-date={date}
                  className={
                    "admin-month-day" +
                    (date.slice(0, 7) === month ? "" : " is-outside") +
                    (date === today ? " is-today" : "") +
                    (date === picked ? " is-selected" : "") +
                    (full ? " has-full" : "")
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
                    chip.kind === "gear" ? (
                      <button
                        key={chip.entry.key}
                        type="button"
                        className={"calendar-gear is-" + gearState(chip.entry)}
                        title={`${chip.entry.name}. ${gearText(chip.entry)}`}
                        onClick={() => setSelected(date)}
                      >
                        <span>
                          {chip.entry.name}{" "}
                          <b>
                            {chip.entry.follows
                              ? `${chip.entry.used}/${chip.entry.stock}`
                              : chip.entry.used}
                          </b>
                        </span>
                      </button>
                    ) : chip.kind === "booking" ? (
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
        {view === "gear" ? (
          <div className="admin-legend admin-month-legend">
            <span>
              <i className="dot gear-ok" /> Masih ada sisa
            </span>
            <span>
              <i className="dot gear-full" /> Penuh
            </span>
            <span>
              <i className="dot gear-over" /> Melebihi stok sewa
            </span>
            <span>
              <i className="dot gear-free" /> Stok belum diikuti
            </span>
          </div>
        ) : (
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
        )}
      </section>
      {picked && view === "gear" && (
        <GearDay
          date={picked}
          entries={pickedGear}
          gear={gear}
          bookings={byId}
          content={content}
          onPick={onPick}
          onEdit={onEdit}
        />
      )}
      {picked && view === "bookings" && (
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
                {shortDate(b.startDate)}–{shortDate(b.endDate)}
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
                {shortDate(event.start)}–{shortDate(event.end)}
              </small>
              <span className="admin-status agent">Agen</span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

// The rental gear of one day: what is out, against its stock, with the
// bookings that hold it, then every rental gear and what is left of it.
function GearDay({ date, entries, gear, bookings, content, onPick, onEdit }) {
  const out = new Map(entries.map((e) => [e.key, e]));
  const full = entries.filter((e) =>
    ["full", "over"].includes(gearState(e)),
  ).length;
  const counted = (gear ?? []).filter((g) => g.follows);
  return (
    <section className="admin-card admin-day-card admin-gear-day">
      <div className="admin-card-heading">
        <div>
          <h2>{longDate(date)}</h2>
          <p className="admin-subtle">
            {entries.length
              ? `${entries.length} alat disewa` +
                (full ? `, ${full} penuh` : "")
              : "Belum ada alat yang disewa pada tanggal ini."}
          </p>
        </div>
        <button
          type="button"
          className="admin-button secondary"
          onClick={() => onPick(date, "shop")}
        >
          Catat sewa tanggal ini
        </button>
      </div>
      {entries.length > 0 && (
        <ul className="admin-gear-list">
          {entries.map((entry) => (
            <li key={entry.key} className={"is-" + gearState(entry)}>
              <strong>{entry.name}</strong>
              <span>{gearText(entry)}</span>
              <div>
                {entry.bookingIds.map((id) => {
                  const b = bookings.get(id);
                  return b ? (
                    <button
                      key={id}
                      type="button"
                      className="admin-inline"
                      onClick={() => onEdit(b)}
                    >
                      {b.guestName || "Tanpa nama"} ·{" "}
                      {programTitle(content, b.experience)}
                    </button>
                  ) : null;
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
      {counted.length > 0 && (
        <details className="admin-more">
          <summary>Sisa semua alat sewa pada tanggal ini</summary>
          <ul className="admin-gear-left">
            {counted.map((g) => {
              const used = out.get(g.key)?.used ?? 0;
              const left = g.stock - used;
              return (
                <li key={g.key} className={left <= 0 ? "is-full" : ""}>
                  <span>{g.name}</span>
                  <b>{left <= 0 ? "Penuh" : `Sisa ${left} dari ${g.stock}`}</b>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}
