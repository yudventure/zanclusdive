"use client";
import { useEffect, useRef, useState } from "react";
import {
  statuses,
  sources,
  programTitle,
  bookingPrograms,
} from "../cms-model.js";
import { paymentStatusLabels } from "../payment-model.js";
import { monthDays } from "../month-grid.js";
import { rentalCalendar, gearLeft } from "../shop-stock.js";
import { dayAgenda, whatsappNumber } from "../calendar-day.js";

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
  onQuickSave,
  onSyncAgents,
}) {
  const [program, setProgram] = useState("all");
  const [syncing, setSyncing] = useState(false);
  // Travel agents and OTAs whose calendars are read into this one.
  const linked = agents.filter((agent) => agent.enabled && agent.importUrl);
  async function syncAgents() {
    setSyncing(true);
    try {
      await onSyncAgents();
    } finally {
      setSyncing(false);
    }
  }
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("bookings");
  // The reservation picked on the grid, lit in the day panel.
  const [focus, setFocus] = useState(null);
  const side = useRef(null);
  // A date picked on the grid opens its panel; on a narrow screen the panel
  // sits under the grid, so it comes into view.
  function pick(date, id = null) {
    setSelected(date);
    setFocus(id);
    if (window.matchMedia("(max-width: 1180px)").matches)
      setTimeout(
        () =>
          side.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        30,
      );
  }
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
  // People out on a day, for the count on its cell.
  const peopleOn = (date) =>
    onDay(date)
      .filter((b) => b.status !== "closed")
      .reduce((sum, b) => sum + (Number(b.participants) || 0), 0);
  return (
    <div className="admin-calendar-layout">
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
          {linked.length > 0 && onSyncAgents && (
            <button
              type="button"
              className="admin-button secondary admin-month-sync"
              disabled={syncing}
              aria-busy={syncing}
              title={`Baca ulang ${linked.length} kalender agen dan OTA sekarang`}
              onClick={syncAgents}
            >
              <span aria-hidden="true">↻</span>
              {syncing ? "Membaca kalender…" : "Perbarui kalender agen & OTA"}
            </button>
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
              const count = view === "bookings" ? peopleOn(date) : 0;
              return (
                <div
                  key={date}
                  data-date={date}
                  className={
                    "admin-month-day" +
                    (date.slice(0, 7) === month ? "" : " is-outside") +
                    (date === today ? " is-today" : "") +
                    (date === picked ? " is-selected" : "") +
                    (full ? " has-full" : "") +
                    (chips.length ? " has-items" : "")
                  }
                  // A tap anywhere on the day opens it; the date button is
                  // the way in by keyboard.
                  onClick={(event) => {
                    if (!event.target.closest("button")) pick(date);
                  }}
                >
                  <div className="admin-month-day-top">
                    <button
                      type="button"
                      className="admin-month-date"
                      aria-label={`Lihat ${longDate(date)}`}
                      aria-pressed={date === picked}
                      onClick={() => pick(date)}
                    >
                      {Number(date.slice(8))}
                    </button>
                    {count > 0 && (
                      <span
                        className="admin-month-people"
                        title={`${count} orang`}
                        aria-label={`${count} orang`}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />
                        </svg>
                        {count}
                      </span>
                    )}
                  </div>
                  {shown.map((chip) =>
                    chip.kind === "gear" ? (
                      <button
                        key={chip.entry.key}
                        type="button"
                        className={"calendar-gear is-" + gearState(chip.entry)}
                        title={`${chip.entry.name}. ${gearText(chip.entry)}`}
                        onClick={() => pick(date)}
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
                        onClick={() => pick(date, chip.b.id)}
                      >
                        <i aria-hidden="true" />
                        <span>
                          {chip.b.status === "closed"
                            ? `Tutup ${programTitle(content, chip.b.experience)}`
                            : chip.b.guestName}
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
                      onClick={() => pick(date)}
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
      <aside
        ref={side}
        className="admin-card admin-day-side"
        aria-label="Agenda tanggal"
      >
        {!picked ? (
          <div className="admin-day-empty">
            <h2>Agenda</h2>
            <p className="admin-subtle">
              Klik tanggal di kalender untuk melihat siapa saja yang diving,
              snorkeling, menyewa alat, atau berkegiatan lain pada hari itu, dan
              untuk mencatat booking baru.
            </p>
          </div>
        ) : view === "gear" ? (
          <GearDay
            date={picked}
            entries={pickedGear}
            gear={gear}
            bookings={byId}
            content={content}
            onPick={onPick}
            onEdit={onEdit}
          />
        ) : (
          <DayAgenda
            key={picked}
            date={picked}
            bookings={bookings}
            agents={agents}
            gear={gear ?? []}
            content={content}
            program={program}
            focus={focus}
            onPick={onPick}
            onEdit={onEdit}
            onQuickSave={onQuickSave}
          />
        )}
      </aside>
    </div>
  );
}

// The day picked: everyone out that day by activity, the rental gear and
// who rents it, the agents' trips and the programs closed, with a short
// form to note a booking on that date.
function DayAgenda({
  date,
  bookings,
  agents,
  gear,
  content,
  program,
  focus,
  onPick,
  onEdit,
  onQuickSave,
}) {
  const day = dayAgenda(date, bookings, { agents, gear });
  const [adding, setAdding] = useState(false);
  const empty = !day.count && !day.agents.length && !day.closed.length;
  // One person on the day: a tap opens the reservation in the full form;
  // the WhatsApp link opens the chat.
  const person = (b, extra) => (
    <li
      key={b.id}
      className={"admin-day-person" + (focus === b.id ? " is-focus" : "")}
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
      <span className="admin-day-detail">{extra}</span>
      {whatsappNumber(b.phone) && (
        <a
          className="admin-day-wa"
          href={`https://wa.me/${whatsappNumber(b.phone)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp ${b.guestName}`}
        >
          WhatsApp
        </a>
      )}
    </li>
  );
  return (
    <div className="admin-day-agenda">
      <div className="admin-day-head">
        <p className="admin-day-eyebrow">Agenda</p>
        <h2>{longDate(date)}</h2>
        <p className="admin-subtle">
          {day.count
            ? `${day.count} reservasi, ${day.people} orang`
            : "Belum ada reservasi pada tanggal ini."}
        </p>
      </div>
      {adding ? (
        <QuickBooking
          date={date}
          content={content}
          program={program}
          onSave={async (payload) => {
            await onQuickSave(payload);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
          onFull={(draft) => {
            setAdding(false);
            onPick(date, draft.experience, draft);
          }}
        />
      ) : (
        <div className="admin-day-actions">
          <button
            type="button"
            className="admin-button admin-day-add"
            onClick={() => setAdding(true)}
          >
            + Catat booking tanggal ini
          </button>
          <button
            type="button"
            className="admin-inline"
            onClick={() =>
              onPick(date, program !== "all" ? program : "diving", {
                status: "closed",
              })
            }
          >
            Tutup tanggal ini
          </button>
        </div>
      )}
      {day.programs.map((group) => (
        <section
          key={group.key}
          className={"admin-day-group is-" + group.key}
          aria-label={programTitle(content, group.key)}
        >
          <h3>
            <i aria-hidden="true" />
            {programTitle(content, group.key)}
            <small>
              {group.entries.length} reservasi, {group.people} orang
            </small>
          </h3>
          <ul>
            {group.entries.map(({ booking: b, day: n, days }) =>
              person(
                b,
                `${b.participants} orang` +
                  (days > 1 ? `, hari ${n} dari ${days}` : "") +
                  `, ${sources[b.source]}` +
                  (b.payment?.status === "paid" ? ", lunas" : ""),
              ),
            )}
          </ul>
        </section>
      ))}
      {day.rentals.length > 0 && (
        <section className="admin-day-group is-gear" aria-label="Sewa alat">
          <h3>
            <i aria-hidden="true" />
            Sewa alat
            <small>{day.rentals.length} penyewa</small>
          </h3>
          <ul>
            {day.rentals.map(({ booking: b, items }) =>
              person(
                b,
                items
                  .map((item) => `${item.name} × ${item.quantity}`)
                  .join(", "),
              ),
            )}
          </ul>
        </section>
      )}
      {day.agents.length > 0 && (
        <section className="admin-day-group is-agent" aria-label="Agen dan OTA">
          <h3>
            <i aria-hidden="true" />
            Agen & OTA
          </h3>
          <ul>
            {day.agents.map(({ agent, event }) => (
              <li
                key={agent.id + event.uid}
                className="admin-day-person is-static"
              >
                <strong className="admin-day-name">{agent.name}</strong>
                <span className="admin-status agent">Agen</span>
                <span className="admin-day-detail">
                  {event.summary}, {shortDate(event.start)}
                  {event.end !== event.start &&
                    ` sampai ${shortDate(event.end)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {day.closed.length > 0 && (
        <section className="admin-day-group is-closed" aria-label="Ditutup">
          <h3>
            <i aria-hidden="true" />
            Ditutup
          </h3>
          <ul>
            {day.closed.map((b) =>
              person(
                b,
                `${programTitle(content, b.experience)} tidak menerima booking`,
              ),
            )}
          </ul>
        </section>
      )}
      {empty && !adding && (
        <p className="admin-day-none">
          Hari ini masih kosong. Catat booking dari WhatsApp atau tamu yang
          datang langsung dengan tombol di atas.
        </p>
      )}
    </div>
  );
}

// A booking noted straight from the day panel: who, what, how many and
// until when. Everything else (email, value, rental gear, billing) is in
// the full form below the calendar.
function QuickBooking({ date, content, program, onSave, onCancel, onFull }) {
  const [form, setForm] = useState({
    guestName: "",
    experience: program !== "all" ? program : "diving",
    participants: 1,
    endDate: date,
    phone: "",
    status: "confirmed",
    source: "whatsapp",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const first = useRef(null);
  useEffect(() => first.current?.focus(), []);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave({
        ...form,
        guestName: form.guestName.trim(),
        participants: Number(form.participants),
        startDate: date,
        amount: 0,
        email: "",
        lang: "id",
      });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <form className="admin-quick-booking" onSubmit={submit}>
      <h3>Catat booking {shortDate(date)}</h3>
      <div className="admin-field">
        <label htmlFor="quick-name">Nama tamu atau grup</label>
        <input
          id="quick-name"
          ref={first}
          required
          maxLength={120}
          value={form.guestName}
          onChange={set("guestName")}
        />
      </div>
      <div className="admin-quick-grid">
        <div className="admin-field">
          <label htmlFor="quick-kind">Kegiatan</label>
          <select
            id="quick-kind"
            value={form.experience}
            onChange={set("experience")}
          >
            {bookingPrograms.map((key) => (
              <option key={key} value={key}>
                {programTitle(content, key)}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="quick-people">Jumlah orang</label>
          <input
            id="quick-people"
            type="number"
            required
            min={1}
            max={100}
            value={form.participants}
            onChange={set("participants")}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="quick-end">Sampai tanggal</label>
          <input
            id="quick-end"
            type="date"
            required
            min={date}
            value={form.endDate}
            onChange={set("endDate")}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="quick-phone">WhatsApp (opsional)</label>
          <input
            id="quick-phone"
            type="tel"
            maxLength={30}
            value={form.phone}
            onChange={set("phone")}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="quick-status">Status</label>
          <select
            id="quick-status"
            value={form.status}
            onChange={set("status")}
          >
            <option value="confirmed">{statuses.confirmed}</option>
            <option value="pending">{statuses.pending}</option>
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="quick-source">Sumber</label>
          <select
            id="quick-source"
            value={form.source}
            onChange={set("source")}
          >
            {Object.entries(sources).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="admin-field">
        <label htmlFor="quick-notes">Catatan (opsional)</label>
        <textarea
          id="quick-notes"
          rows={2}
          maxLength={2000}
          value={form.notes}
          onChange={set("notes")}
        />
      </div>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-quick-actions">
        <button className="admin-button" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan booking"}
        </button>
        <button
          type="button"
          className="admin-button secondary"
          onClick={onCancel}
        >
          Batal
        </button>
        <button
          type="button"
          className="admin-inline"
          onClick={() =>
            onFull({
              ...form,
              guestName: form.guestName.trim(),
              participants: Number(form.participants) || 1,
              startDate: date,
              endDate: form.endDate < date ? date : form.endDate,
            })
          }
        >
          Formulir lengkap
        </button>
      </div>
    </form>
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
    <section className="admin-gear-day">
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
