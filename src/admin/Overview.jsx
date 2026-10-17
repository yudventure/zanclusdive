"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { statuses, programTitle } from "../cms-model.js";
import { AdminIcon } from "./icons.jsx";

const zone = "Asia/Jayapura";
const money = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
const day = (value, options) =>
  new Date(value + "T12:00:00").toLocaleDateString("id-ID", options);

// Adds days to a YYYY-MM-DD date without touching the local time zone.
export function addDays(date, count) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + count);
  return d.toISOString().slice(0, 10);
}

export function greeting(hour) {
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

// "yud.kurniawan@…" becomes "Yud"; shared inboxes greet the whole team.
export function displayName(email = "") {
  const local = email
    .split("@")[0]
    .split(/[._+-]/)[0]
    .toLowerCase();
  if (!local || ["operator", "admin", "owner", "demo", "info"].includes(local))
    return "tim Zanclus";
  return local[0].toUpperCase() + local.slice(1);
}

// Guests at sea per day for a range starting today. Closed and cancelled
// records are not guests; closed days are flagged so the chart can mark them.
export function dailySchedule(bookings, start, length) {
  return Array.from({ length }, (_, i) => {
    const date = addDays(start, i);
    const items = bookings.filter(
      (b) =>
        b.status !== "cancelled" && date >= b.startDate && date <= b.endDate,
    );
    const guests = items.filter((b) => b.status !== "closed");
    return {
      date,
      items,
      bookings: guests.length,
      guests: guests.reduce((n, b) => n + Number(b.participants || 0), 0),
      closed: items.some((b) => b.status === "closed"),
    };
  });
}

function useClock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

// The plot keeps 30px under the baseline for the day labels.
const gridLine = (share) => `calc(30px + (100% - 30px) * ${share})`;

function niceMax(value) {
  if (value <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / step) * step;
}

function ScheduleChart({ bookings, content, today }) {
  const [range, setRange] = useState(7);
  const days = useMemo(
    () => dailySchedule(bookings, today, range),
    [bookings, today, range],
  );
  const [selected, setSelected] = useState(today);
  const active = days.find((d) => d.date === selected) || days[0];
  const max = niceMax(Math.max(...days.map((d) => d.guests), 1));
  const ticks = [max, max / 2, 0];
  const total = days.reduce((n, d) => n + d.guests, 0);
  const busiest = days.reduce((a, b) => (b.guests > a.guests ? b : a));
  return (
    <section className="admin-card admin-insight" aria-labelledby="jadwal">
      <div className="admin-insight-head">
        <div>
          <p className="admin-eyebrow">JADWAL KE LAUT</p>
          <h2 id="jadwal">Tamu per hari</h2>
          <p className="admin-subtle">
            Peserta dari reservasi yang tercatat, mulai hari ini.
          </p>
        </div>
        <span className="admin-live">
          <i aria-hidden="true" />
          {total} peserta · {range} hari
        </span>
      </div>
      <div className="admin-insight-body">
        <div className="admin-chart-card">
          <div className="admin-chart-top">
            <div>
              <strong>Peserta per hari</strong>
              <small>
                {day(days[0].date, { day: "numeric", month: "short" })} sampai{" "}
                {day(days.at(-1).date, { day: "numeric", month: "short" })}
              </small>
            </div>
            <div className="admin-segment" role="group" aria-label="Rentang">
              {[7, 30].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={range === n}
                  onClick={() => setRange(n)}
                >
                  {n} hari
                </button>
              ))}
            </div>
          </div>
          <div className={"admin-chart" + (range > 7 ? " dense" : "")}>
            <div className="admin-chart-axis" aria-hidden="true">
              {ticks.map((t) => (
                <span key={t} style={{ bottom: gridLine(t / max) }}>
                  {t}
                </span>
              ))}
            </div>
            <div className="admin-chart-plot">
              {ticks.map((t) => (
                <i
                  key={t}
                  className="admin-chart-grid"
                  style={{ bottom: gridLine(t / max) }}
                />
              ))}
              {days.map((d, i) => {
                const label = `${day(d.date, { weekday: "short", day: "numeric", month: "short" })} · ${d.guests} peserta${d.closed ? " · tanggal ditutup" : ""}`;
                const showValue =
                  d.date === active.date ||
                  (d.guests > 0 && d.date === busiest.date);
                return (
                  <button
                    key={d.date}
                    type="button"
                    className={
                      "admin-bar" +
                      (d.date === active.date ? " active" : "") +
                      (d.closed ? " closed" : "")
                    }
                    aria-label={label}
                    aria-pressed={d.date === active.date}
                    onClick={() => setSelected(d.date)}
                  >
                    <span className="admin-bar-tip" role="presentation">
                      {label}
                    </span>
                    <span
                      className="admin-bar-fill"
                      style={{
                        height: d.guests
                          ? `max(6px, ${(d.guests / max) * 100}%)`
                          : d.closed
                            ? "100%"
                            : 0,
                      }}
                    >
                      {showValue && d.guests > 0 && <b>{d.guests}</b>}
                    </span>
                    <small>
                      {range === 7
                        ? day(d.date, { weekday: "short" })
                        : i % 5 === 0
                          ? day(d.date, { day: "numeric" })
                          : ""}
                      {range === 7 && (
                        <em>{day(d.date, { day: "numeric" })}</em>
                      )}
                    </small>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <aside className="admin-day-card">
          <strong>Rincian hari</strong>
          <select
            aria-label="Pilih tanggal"
            value={active.date}
            onChange={(e) => setSelected(e.target.value)}
          >
            {days.map((d) => (
              <option key={d.date} value={d.date}>
                {day(d.date, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </option>
            ))}
          </select>
          <span>Peserta di laut</span>
          <b>{active.guests}</b>
          <small>
            {active.bookings} reservasi
            {active.closed ? " · tanggal ditutup" : ""}
          </small>
          <ul>
            {active.items.map((b) => (
              <li key={b.id}>
                <span>
                  {b.guestName || "Penutupan tanggal"}
                  <small>
                    {programTitle(content, b.experience)}
                    {b.payment?.status === "paid" && " · Lunas"}
                  </small>
                </span>
                <em className={"admin-status " + b.status}>
                  {statuses[b.status]}
                </em>
              </li>
            ))}
          </ul>
          {!active.items.length && (
            <p>Belum ada jadwal. Hari yang bagus untuk persiapan alat.</p>
          )}
        </aside>
      </div>
    </section>
  );
}

export default function Overview({
  bookings,
  content,
  customers,
  pending,
  today,
  email,
  table,
}) {
  const now = useClock();
  const hour = Number(
    (now || new Date(today + "T12:00:00")).toLocaleString("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: zone,
    }),
  );
  const month = today.slice(0, 7);
  const monthName = day(today, { month: "long", year: "numeric" });
  const inMonth = bookings.filter(
    (b) =>
      b.startDate.slice(0, 7) === month &&
      !["closed", "cancelled"].includes(b.status),
  );
  const confirmed = inMonth.filter((b) => b.status === "confirmed");
  const events = (content.calendar?.events || [])
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const experiences = Object.values(content.experiences);
  const todayGuests = dailySchedule(bookings, today, 1)[0];
  const cards = [
    {
      label: `Reservasi masuk · ${monthName}`,
      value: inMonth.length,
      note: `${inMonth.reduce((n, b) => n + Number(b.participants || 0), 0)} peserta tercatat`,
    },
    {
      label: "Menunggu konfirmasi",
      value: pending.length,
      note: pending.length ? "Balas lewat WhatsApp" : "Semua sudah dijawab",
      href: "/admin/reservations",
      tone: pending.length ? "warn" : "ok",
    },
    {
      label: `Nilai terkonfirmasi · ${monthName}`,
      value: money(confirmed.reduce((n, b) => n + Number(b.amount || 0), 0)),
      note: "Catatan, bukan pembayaran diterima",
      small: true,
    },
    {
      label: "Tamu tercatat",
      value: customers.length,
      note: `${customers.filter((c) => c.count > 1).length} tamu datang lagi`,
      href: "/admin/customers",
    },
    {
      label: "Kegiatan mendatang",
      value: events.length,
      note: events[0]
        ? `${events[0].title.id} · ${day(events[0].date, { day: "numeric", month: "short" })}`
        : "Tambahkan di Kalender kegiatan",
      href: "/admin/events",
    },
    {
      label: "Pengalaman aktif",
      value: `${experiences.filter((e) => e.enabled).length}/${experiences.length}`,
      note: "Tampil di kuis dan formulir",
      href: "/admin/experiences",
    },
  ];
  return (
    <>
      <section className="admin-hero">
        <div>
          <p>PEMILIK · RUANG KERJA ZANCLUS</p>
          <h1>
            {greeting(hour)}, {displayName(email)}.
          </h1>
          <span>
            {pending.length
              ? `${pending.length} reservasi menunggu konfirmasi kamu.`
              : "Tidak ada reservasi yang menunggu konfirmasi saat ini."}{" "}
            {todayGuests.guests
              ? `${todayGuests.guests} tamu ke laut hari ini.`
              : ""}
          </span>
        </div>
        <div className="admin-hero-clock" aria-live="off">
          <strong suppressHydrationWarning>
            {now
              ? now
                  .toLocaleTimeString("id-ID", {
                    timeZone: zone,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hourCycle: "h23",
                  })
                  .replaceAll(":", ".")
              : "--.--.--"}
          </strong>
          <small>
            {day(today, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · WIT
          </small>
        </div>
      </section>
      <div className="admin-stat-grid admin-kpi-grid">
        {cards.map((c) => {
          const body = (
            <>
              <span>{c.label}</span>
              <strong className={c.small ? "currency" : ""}>{c.value}</strong>
              <small className={c.tone || ""}>{c.note}</small>
            </>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="admin-stat">
              {body}
              <AdminIcon name="arrow" className="admin-stat-go" />
            </Link>
          ) : (
            <div key={c.label} className="admin-stat">
              {body}
            </div>
          );
        })}
      </div>
      <ScheduleChart bookings={bookings} content={content} today={today} />
      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <p className="admin-eyebrow">CATATAN TERBARU</p>
            <h2>Reservasi terbaru</h2>
          </div>
          <Link href="/admin/calendar" className="admin-button secondary">
            Buka kalender ↗
          </Link>
        </div>
        {table}
      </section>
      <div className="admin-shortcuts">
        {[
          [
            "calendar",
            "/admin/calendar",
            "Tambah reservasi",
            "Catat hasil obrolan WhatsApp",
          ],
          [
            "website",
            "/admin/website",
            "Ubah teks website",
            "Judul, deskripsi, ajakan",
          ],
          ["media", "/admin/media", "Foto & galeri", "Unggah foto penyelaman"],
          [
            "events",
            "/admin/events",
            "Kalender kegiatan",
            "Trip, kelas, peduli lingkungan",
          ],
        ].map(([icon, href, title, note]) => (
          <Link key={href} href={href} className="admin-shortcut">
            <span>
              <AdminIcon name={icon} />
            </span>
            <strong>{title}</strong>
            <small>{note}</small>
          </Link>
        ))}
      </div>
    </>
  );
}
