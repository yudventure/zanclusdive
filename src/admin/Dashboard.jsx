"use client";
import { cloneElement, useEffect, useId, useState } from "react";
import Link from "next/link";
import ShopEditor from "./ShopEditor.jsx";
import ActivitiesEditor from "./ActivitiesEditor.jsx";
import { socialPlatforms } from "../contact-model.js";
import {
  experienceKeys,
  textFields,
  statuses,
  sources,
  defaultContent,
} from "../cms-model.js";
const sections = {
  overview: "Overview",
  calendar: "Kalender",
  reservations: "Reservasi",
  customers: "Tamu",
  website: "Teks website",
  media: "Foto & media",
  experiences: "Pengalaman & harga",
  contact: "Kontak & sosial media",
  shop: "Dive Shop",
  activities: "Halaman aktivitas",
};
const icons = {
  overview: "▦",
  calendar: "▣",
  reservations: "☷",
  customers: "♙",
  website: "Aa",
  media: "▧",
  experiences: "◈",
  contact: "↗",
  shop: "◇",
  activities: "≋",
};
const money = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
function dateLabel(value) {
  return new Date(value + "T12:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
const blankBooking = (today) => ({
  experience: "beginner",
  status: "pending",
  source: "whatsapp",
  startDate: today,
  endDate: today,
  guestName: "",
  phone: "",
  participants: 1,
  amount: 0,
  notes: "",
});
async function request(url, method = "GET", body) {
  const options = { method, cache: "no-store" };
  if (body instanceof FormData) options.body = body;
  else if (body) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("Server belum dapat merespons.");
  }
  if (response.status === 401) {
    window.location.assign("/admin");
    throw new Error("Sesi berakhir. Silakan login kembali.");
  }
  if (!response.ok) throw new Error(result.error || "Permintaan gagal.");
  return result;
}
function Field({ label, children }) {
  const id = useId();
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
function BookingEditor({
  value,
  setValue,
  onSave,
  onCancel,
  busy,
  editing,
  content,
}) {
  function change(key, v) {
    setValue({
      ...value,
      [key]: v,
      ...(key === "startDate" && v > value.endDate ? { endDate: v } : {}),
    });
  }
  return (
    <section className="admin-card" id="booking-editor">
      <h2>{editing ? "Ubah reservasi" : "Tambah reservasi / tutup tanggal"}</h2>
      <p className="admin-subtle">
        Catat hasil konfirmasi dari WhatsApp atau sumber lain.
      </p>
      <form className="admin-form" onSubmit={onSave}>
        <div className="admin-form-grid">
          <Field label="Pengalaman">
            <select
              value={value.experience}
              onChange={(e) => change("experience", e.target.value)}
            >
              {experienceKeys.map((k) => (
                <option key={k} value={k}>
                  {content.experiences[k].title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={value.status}
              onChange={(e) => change("status", e.target.value)}
            >
              {Object.entries(statuses).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tanggal mulai">
            <input
              type="date"
              required
              value={value.startDate}
              onChange={(e) => change("startDate", e.target.value)}
            />
          </Field>
          <Field label="Tanggal selesai (termasuk hari ini)">
            <input
              type="date"
              required
              min={value.startDate}
              value={value.endDate}
              onChange={(e) => change("endDate", e.target.value)}
            />
          </Field>
          <Field label="Sumber reservasi">
            <select
              value={value.source}
              onChange={(e) => change("source", e.target.value)}
            >
              {Object.entries(sources).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nama tamu">
            <input
              required={value.status !== "closed"}
              maxLength={120}
              value={value.guestName}
              onChange={(e) => change("guestName", e.target.value)}
            />
          </Field>
          <Field label="Telepon / WhatsApp">
            <input
              type="tel"
              maxLength={30}
              value={value.phone}
              onChange={(e) => change("phone", e.target.value)}
            />
          </Field>
          <Field label="Jumlah peserta">
            <input
              type="number"
              required
              min="1"
              max="100"
              value={value.participants}
              onChange={(e) => change("participants", e.target.value)}
            />
          </Field>
          <Field label="Nilai reservasi (Rp)">
            <input
              type="number"
              required
              min="0"
              max="1000000000"
              value={value.amount}
              onChange={(e) => change("amount", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Catatan">
          <textarea
            rows="3"
            maxLength="2000"
            value={value.notes}
            onChange={(e) => change("notes", e.target.value)}
          />
        </Field>
        <div className="admin-actions">
          <button className="admin-button" disabled={busy}>
            {busy
              ? "Menyimpan…"
              : editing
                ? "Simpan perubahan"
                : "Simpan reservasi"}
          </button>
          {editing && (
            <button
              type="button"
              className="admin-button secondary"
              onClick={onCancel}
            >
              Batal edit
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
export default function Dashboard({ section, email, today, demo = false }) {
  const [data, setData] = useState(null),
    [content, setContent] = useState(structuredClone(defaultContent)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [mobileMenu, setMobileMenu] = useState(false),
    [notification, setNotification] = useState(false),
    [ownerMenu, setOwnerMenu] = useState(false),
    [filter, setFilter] = useState(""),
    [statusFilter, setStatusFilter] = useState("all"),
    [month, setMonth] = useState(today.slice(0, 7)),
    [booking, setBooking] = useState(blankBooking(today)),
    [editing, setEditing] = useState(null);
  const pending = data?.bookings.filter((b) => b.status === "pending") || [];
  async function refresh() {
    try {
      const next = await request("/api/admin/state");
      setData(next);
      setContent(next.content);
      setError("");
      return next;
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    setMobileMenu(false);
    setOwnerMenu(false);
    setNotification(false);
    setNotice("");
  }, [section]);
  function mutateContent(group, key, value) {
    setContent((current) => ({
      ...current,
      [group]: { ...current[group], [key]: value },
    }));
    setNotice("");
  }
  async function saveSettings(event) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const result = await request("/api/admin/settings", "PUT", {
        content,
        version: data.version,
      });
      setData((current) => ({ ...current, ...result }));
      setContent(result.content);
      setNotice("Perubahan sudah tersimpan dan tampil di website.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveReservation(event) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await request(
        "/api/admin/bookings" + (editing ? "/" + editing : ""),
        editing ? "PUT" : "POST",
        booking,
      );
      await refresh();
      setBooking(blankBooking(today));
      setEditing(null);
      setNotice("Reservasi tersimpan.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function editReservation(item) {
    setNotice("");
    setBooking({ ...item });
    setEditing(item.id);
    setTimeout(
      () =>
        document
          .getElementById("booking-editor")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  }
  async function removeReservation(item) {
    if (
      !window.confirm(
        `Hapus reservasi ${item.guestName || "penutupan tanggal"}?`,
      )
    )
      return;
    setBusy(true);
    setNotice("");
    try {
      await request("/api/admin/bookings/" + item.id, "DELETE");
      await refresh();
      if (editing === item.id) {
        setEditing(null);
        setBooking(blankBooking(today));
      }
      setNotice("Reservasi dihapus.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await request("/api/admin/media", "POST", new FormData(form));
      await refresh();
      form.reset();
      setNotice("Gambar diunggah. Pilih sebagai gambar website lalu simpan.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await request("/api/admin/logout", "POST", {});
      window.location.assign("/admin");
    } catch (e) {
      setError(e.message);
    }
  }
  function moveMonth(delta) {
    const d = new Date(month + "-01T12:00:00");
    d.setMonth(d.getMonth() + delta);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const monthCount = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();
  const bookings = data?.bookings || [];
  const thisMonth = bookings.filter(
    (b) =>
      b.startDate.slice(0, 7) <= month &&
      b.endDate.slice(0, 7) >= month &&
      b.status !== "cancelled",
  );
  const filtered = bookings.filter(
    (b) =>
      (statusFilter === "all" || b.status === statusFilter) &&
      `${b.guestName} ${b.phone} ${content.experiences[b.experience].title}`
        .toLowerCase()
        .includes(filter.toLowerCase()),
  );
  const customers = Object.values(
    bookings
      .filter((b) => b.status !== "closed")
      .reduce((map, b) => {
        const key = b.phone || b.guestName.toLowerCase();
        map[key] ??= { name: b.guestName, phone: b.phone, count: 0, total: 0 };
        map[key].count++;
        map[key].total += b.status === "confirmed" ? b.amount : 0;
        return map;
      }, {}),
  );
  const bookingTable = (list) => (
    <div className="admin-table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Tamu / sumber</th>
            <th>Pengalaman</th>
            <th>Tanggal</th>
            <th>Status</th>
            <th>Peserta</th>
            <th>Nilai</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {list.map((b) => (
            <tr key={b.id}>
              <td>
                <strong>{b.guestName || "Penutupan tanggal"}</strong>
                <small>
                  {sources[b.source]}
                  {b.phone ? " · " + b.phone : ""}
                </small>
              </td>
              <td>{content.experiences[b.experience].title}</td>
              <td>
                {dateLabel(b.startDate)}
                <small>s/d {dateLabel(b.endDate)}</small>
              </td>
              <td>
                <span className={"admin-status " + b.status}>
                  {statuses[b.status]}
                </span>
              </td>
              <td>{b.participants}</td>
              <td>{money(b.amount)}</td>
              <td>
                <button
                  className="admin-inline"
                  onClick={() => editReservation(b)}
                >
                  Edit
                </button>
                <button
                  className="admin-inline danger"
                  disabled={busy}
                  onClick={() => removeReservation(b)}
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!list.length && (
        <p className="admin-empty">Belum ada reservasi pada pilihan ini.</p>
      )}
    </div>
  );
  const editor = (
    <BookingEditor
      value={booking}
      setValue={setBooking}
      onSave={saveReservation}
      onCancel={() => {
        setEditing(null);
        setBooking(blankBooking(today));
      }}
      busy={busy}
      editing={editing}
      content={content}
    />
  );
  return (
    <div className="admin-root">
      <header className="admin-header">
        <div className="admin-header-inner">
          <a href="/admin" className="admin-logo">
            <img
              src="/assets/logo-header-light.svg"
              alt="Zanclus Dive Center"
              width="176"
              height="44"
            />
            <span>ADMIN</span>
          </a>
          <div className="admin-header-actions">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="admin-button secondary back-site"
            >
              Lihat website ↗
            </a>
            <div className="admin-menu-anchor">
              <button
                className="admin-icon-button"
                aria-label="Notifikasi reservasi"
                aria-expanded={notification}
                onClick={() => {
                  setNotification(!notification);
                  setOwnerMenu(false);
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="19"
                  height="19"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {pending.length > 0 && (
                  <span className="admin-notification-count">
                    {pending.length}
                  </span>
                )}
              </button>
              {notification && (
                <div className="admin-popover">
                  <h3>Perlu konfirmasi</h3>
                  {pending.length ? (
                    pending.slice(0, 5).map((b) => (
                      <Link key={b.id} href="/admin/reservations">
                        {b.guestName} · {dateLabel(b.startDate)}
                      </Link>
                    ))
                  ) : (
                    <p>Tidak ada reservasi menunggu.</p>
                  )}
                </div>
              )}
            </div>
            <div className="admin-menu-anchor">
              <button
                className="admin-owner"
                aria-expanded={ownerMenu}
                onClick={() => {
                  setOwnerMenu(!ownerMenu);
                  setNotification(false);
                }}
              >
                <span>O</span>Owner⌄
              </button>
              {ownerMenu && (
                <div className="admin-popover">
                  <p>{email}</p>
                  <button className="admin-inline" onClick={logout}>
                    Keluar dari admin
                  </button>
                </div>
              )}
            </div>
            <button
              className="admin-icon-button admin-mobile-toggle"
              aria-label="Menu admin"
              aria-expanded={mobileMenu}
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              ☰
            </button>
          </div>
        </div>
      </header>
      {demo && (
        <div className="admin-demo-banner">
          <strong>Mode demo</strong> · Data dan harga contoh. Perubahan disimpan
          pada server demo, terpisah dari MySQL. Data demo dapat hilang saat
          redeploy; gunakan data contoh saja.
        </div>
      )}
      <div className="admin-workspace">
        <aside className={"admin-sidebar " + (mobileMenu ? "open" : "")}>
          <p className="admin-eyebrow">MENU</p>
          <div className="admin-links">
            {["overview", "calendar", "reservations", "customers"].map(
              (key) => (
                <Link
                  key={key}
                  href={"/admin/" + key}
                  aria-current={section === key ? "page" : undefined}
                  className={section === key ? "active" : ""}
                >
                  <span aria-hidden="true">{icons[key]}</span>
                  {sections[key]}
                </Link>
              ),
            )}
          </div>
          <p className="admin-eyebrow sidebar-group">WEBSITE</p>
          <div className="admin-links">
            {[
              "media",
              "website",
              "experiences",
              "activities",
              "shop",
              "contact",
            ].map((key) => (
              <Link
                key={key}
                href={"/admin/" + key}
                aria-current={section === key ? "page" : undefined}
                className={section === key ? "active" : ""}
              >
                <span aria-hidden="true">{icons[key]}</span>
                {sections[key]}
              </Link>
            ))}
          </div>
          <div className="admin-sidebar-note">
            <strong>Zanclus workspace</strong>
            <p>
              Kelola konten dan catatan reservasi. Booking final dikonfirmasi
              bersama tamu.
            </p>
          </div>
        </aside>
        <main className="admin-main">
          <p className="admin-eyebrow">ZANCLUS / OWNER WORKSPACE</p>
          <div className="admin-title-row">
            <h1>{sections[section]}</h1>
            {section === "calendar" && (
              <span>
                {new Date(month + "-01T12:00:00").toLocaleDateString("id-ID", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
          {error && (
            <div className="admin-error" role="alert">
              {error}
              <button className="admin-inline" onClick={refresh}>
                Coba muat ulang
              </button>
            </div>
          )}
          {notice && (
            <div className="admin-success" role="status">
              {notice}
            </div>
          )}
          {!data ? (
            <p className="admin-empty">
              {error
                ? "Periksa konfigurasi MySQL pada hPanel."
                : "Memuat data CMS…"}
            </p>
          ) : (
            <>
              {section === "overview" && (
                <>
                  <div className="admin-stat-grid">
                    <div className="admin-stat">
                      <span>Menunggu konfirmasi</span>
                      <strong>{pending.length}</strong>
                      <Link href="/admin/reservations">Lihat reservasi ↗</Link>
                    </div>
                    <div className="admin-stat">
                      <span>Reservasi dikonfirmasi</span>
                      <strong>
                        {
                          bookings.filter((b) => b.status === "confirmed")
                            .length
                        }
                      </strong>
                      <small>Seluruh catatan</small>
                    </div>
                    <div className="admin-stat">
                      <span>Pengalaman aktif</span>
                      <strong>
                        {
                          Object.values(content.experiences).filter(
                            (e) => e.enabled,
                          ).length
                        }
                      </strong>
                      <Link href="/admin/experiences">Kelola pengalaman ↗</Link>
                    </div>
                    <div className="admin-stat">
                      <span>Nilai terkonfirmasi</span>
                      <strong className="currency">
                        {money(
                          bookings
                            .filter((b) => b.status === "confirmed")
                            .reduce((n, b) => n + b.amount, 0),
                        )}
                      </strong>
                      <small>Nilai catatan, bukan pembayaran diterima</small>
                    </div>
                  </div>
                  <section className="admin-card">
                    <div className="admin-card-heading">
                      <h2>Reservasi terbaru</h2>
                      <Link
                        href="/admin/calendar"
                        className="admin-button secondary"
                      >
                        Buka kalender ↗
                      </Link>
                    </div>
                    {bookingTable(bookings.slice(0, 5))}
                  </section>
                  <div className="admin-two-column">
                    <section className="admin-card">
                      <h2>Website kamu, selalu terbaru.</h2>
                      <p className="admin-subtle">
                        Ubah teks dan gambar tanpa mengedit kode. Perubahan
                        tersimpan di database dan langsung tampil pada kunjungan
                        berikutnya.
                      </p>
                      <Link href="/admin/website" className="admin-button">
                        Kelola teks website ↗
                      </Link>
                    </section>
                    <section className="admin-card">
                      <h2>Catat konfirmasi dari WhatsApp.</h2>
                      <p className="admin-subtle">
                        Pesan WhatsApp tidak otomatis menjadi reservasi.
                        Tambahkan catatan setelah berdiskusi dengan tamu.
                      </p>
                      <Link
                        href="/admin/calendar"
                        className="admin-button secondary"
                      >
                        Tambah reservasi ↗
                      </Link>
                    </section>
                  </div>
                </>
              )}
              {section === "calendar" && (
                <>
                  <div className="admin-toolbar">
                    <button
                      className="admin-button secondary"
                      onClick={() => moveMonth(-1)}
                    >
                      ← Bulan lalu
                    </button>
                    <button
                      className="admin-button secondary"
                      onClick={() => setMonth(today.slice(0, 7))}
                    >
                      Bulan ini
                    </button>
                    <button
                      className="admin-button secondary"
                      onClick={() => moveMonth(1)}
                    >
                      Bulan berikut →
                    </button>
                    <Link
                      href="/admin/reservations"
                      className="admin-button secondary"
                    >
                      Semua reservasi
                    </Link>
                  </div>
                  <div className="admin-calendar-scroll">
                    <table className="admin-calendar">
                      <thead>
                        <tr>
                          <th>Pengalaman</th>
                          {Array.from({ length: monthCount }, (_, i) => {
                            const date =
                              month + "-" + String(i + 1).padStart(2, "0");
                            return (
                              <th
                                key={date}
                                className={date === today ? "today" : ""}
                              >
                                <small>
                                  {new Date(
                                    date + "T12:00:00",
                                  ).toLocaleDateString("id-ID", {
                                    weekday: "short",
                                  })}
                                </small>
                                {i + 1}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {experienceKeys.map((key) => (
                          <tr key={key}>
                            <th>
                              {content.experiences[key].title}
                              <small>
                                {content.experiences[key].enabled
                                  ? "Aktif"
                                  : "Tidak ditampilkan"}
                              </small>
                            </th>
                            {Array.from({ length: monthCount }, (_, i) => {
                              const date =
                                  month + "-" + String(i + 1).padStart(2, "0"),
                                items = thisMonth.filter(
                                  (b) =>
                                    b.experience === key &&
                                    date >= b.startDate &&
                                    date <= b.endDate,
                                );
                              return (
                                <td
                                  key={date}
                                  className={date === today ? "today" : ""}
                                >
                                  {items.length ? (
                                    items.map((b) => (
                                      <button
                                        key={b.id}
                                        className={
                                          "calendar-booking " + b.status
                                        }
                                        title={`${b.guestName || "Ditutup"} · ${statuses[b.status]} · ${sources[b.source]}`}
                                        onClick={() => editReservation(b)}
                                      >
                                        {b.status === "closed"
                                          ? "Ditutup"
                                          : b.guestName}
                                      </button>
                                    ))
                                  ) : (
                                    <button
                                      className="calendar-day"
                                      aria-label={`Tambah reservasi ${content.experiences[key].title}, ${date}`}
                                      onClick={() => {
                                        setEditing(null);
                                        setBooking({
                                          ...blankBooking(date),
                                          experience: key,
                                        });
                                        document
                                          .getElementById("booking-editor")
                                          ?.scrollIntoView({
                                            behavior: "smooth",
                                          });
                                      }}
                                    >
                                      +
                                    </button>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="admin-legend">
                    {Object.entries(statuses).map(([key, label]) => (
                      <span key={key} className={"admin-status " + key}>
                        {label}
                      </span>
                    ))}
                  </div>
                  <div className="admin-two-column calendar-bottom">
                    {editor}
                    <section className="admin-card">
                      <h2>Reservasi bulan ini</h2>
                      <p className="admin-subtle">
                        {thisMonth.length} catatan · tanggal selesai dihitung
                        termasuk hari terakhir.
                      </p>
                      {thisMonth.length ? (
                        thisMonth.map((b) => (
                          <button
                            className="admin-booking-summary"
                            key={b.id}
                            onClick={() => editReservation(b)}
                          >
                            <strong>
                              {b.guestName || "Penutupan tanggal"}
                            </strong>
                            <span>
                              {content.experiences[b.experience].title}
                            </span>
                            <small>
                              {dateLabel(b.startDate)} — {dateLabel(b.endDate)}
                            </small>
                            <span className={"admin-status " + b.status}>
                              {statuses[b.status]}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="admin-empty">
                          Belum ada reservasi bulan ini.
                        </p>
                      )}
                    </section>
                  </div>
                </>
              )}
              {section === "reservations" && (
                <>
                  <div className="admin-toolbar">
                    <input
                      aria-label="Cari reservasi"
                      placeholder="Cari nama, telepon, pengalaman…"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                    <select
                      aria-label="Filter status"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">Semua status</option>
                      {Object.entries(statuses).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <section className="admin-card">
                    {bookingTable(filtered)}
                  </section>
                  {editor}
                </>
              )}
              {section === "customers" && (
                <section className="admin-card">
                  <h2>Daftar tamu</h2>
                  <p className="admin-subtle">
                    Dihimpun dari catatan reservasi, tanpa data tamu contoh.
                  </p>
                  <div className="admin-table-scroll">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Nama</th>
                          <th>Telepon</th>
                          <th>Catatan reservasi</th>
                          <th>Nilai terkonfirmasi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers
                          .filter((c) =>
                            c.name.toLowerCase().includes(filter.toLowerCase()),
                          )
                          .map((c) => (
                            <tr key={c.phone || c.name}>
                              <td>{c.name}</td>
                              <td>{c.phone || "—"}</td>
                              <td>{c.count}</td>
                              <td>{money(c.total)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {!customers.length && (
                      <p className="admin-empty">
                        Daftar tamu akan muncul setelah reservasi ditambahkan.
                      </p>
                    )}
                  </div>
                </section>
              )}
              {section === "website" && (
                <form onSubmit={saveSettings}>
                  <section className="admin-card">
                    <h2>Teks website</h2>
                    <p className="admin-subtle">
                      Teks biasa; HTML atau script tidak dieksekusi.
                    </p>
                    <div className="admin-form-grid">
                      {textFields.map(([key, label]) => (
                        <Field label={label} key={key}>
                          <textarea
                            rows={
                              key.toLowerCase().includes("description") ? 3 : 2
                            }
                            maxLength="2000"
                            required
                            value={content.text[key]}
                            onChange={(e) =>
                              mutateContent("text", key, e.target.value)
                            }
                          />
                        </Field>
                      ))}
                    </div>
                    <button className="admin-button" disabled={busy}>
                      {busy ? "Menyimpan…" : "Simpan & tampilkan di website"}
                    </button>
                  </section>
                </form>
              )}
              {section === "contact" && (
                <form onSubmit={saveSettings}>
                  <section className="admin-card">
                    <h2>Kontak & sosial media</h2>
                    <div className="admin-form-grid">
                      <Field label="Nomor WhatsApp (kode negara, tanpa +)">
                        <input
                          required
                          pattern="[1-9][0-9]{7,14}"
                          value={content.contact.whatsapp}
                          onChange={(e) =>
                            mutateContent("contact", "whatsapp", e.target.value)
                          }
                        />
                      </Field>
                      <Field label="Email kontak">
                        <input
                          type="email"
                          value={content.contact.email}
                          onChange={(e) =>
                            mutateContent("contact", "email", e.target.value)
                          }
                        />
                      </Field>
                      <Field label="Lokasi / alamat">
                        <textarea
                          rows="3"
                          maxLength="500"
                          value={content.contact.location}
                          onChange={(e) =>
                            mutateContent("contact", "location", e.target.value)
                          }
                        />
                      </Field>
                      {Object.entries(socialPlatforms).map(
                        ([key, platform]) => (
                          <Field key={key} label={"Tautan " + platform.label}>
                            <input
                              type="url"
                              placeholder={platform.url + "…"}
                              maxLength={500}
                              value={content.contact[key] ?? ""}
                              onChange={(e) =>
                                mutateContent("contact", key, e.target.value)
                              }
                            />
                          </Field>
                        ),
                      )}
                    </div>
                    <p className="admin-subtle">
                      Nomor WhatsApp CMS menggantikan nomor default website
                      tanpa rebuild. WhatsApp, email, dan sosial media tampil di
                      footer seluruh website. Isi tautan akun resmi dengan
                      HTTPS; kosongkan tautan sosial untuk menyembunyikan
                      ikonnya. Tautan platform pada demo hanya contoh.
                    </p>
                    <button className="admin-button" disabled={busy}>
                      {busy ? "Menyimpan…" : "Simpan kontak"}
                    </button>
                  </section>
                </form>
              )}
              {section === "activities" && (
                <ActivitiesEditor
                  activities={content.activities}
                  update={(key, value) =>
                    mutateContent("activities", key, value)
                  }
                  onSave={saveSettings}
                  busy={busy}
                  media={data.media}
                />
              )}
              {section === "shop" && (
                <ShopEditor
                  shop={content.shop}
                  update={(key, value) => mutateContent("shop", key, value)}
                  onSave={saveSettings}
                  busy={busy}
                  media={data.media}
                />
              )}
              {section === "experiences" && (
                <form onSubmit={saveSettings}>
                  {experienceKeys.map((key) => {
                    const exp = content.experiences[key];
                    function update(field, value) {
                      mutateContent("experiences", key, {
                        ...exp,
                        [field]: value,
                      });
                    }
                    return (
                      <section className="admin-card" key={key}>
                        <div className="admin-card-heading">
                          <h2>{exp.title}</h2>
                          <label className="admin-toggle">
                            <input
                              type="checkbox"
                              checked={exp.enabled}
                              onChange={(e) =>
                                update("enabled", e.target.checked)
                              }
                            />
                            Tampilkan di website
                          </label>
                        </div>
                        <div className="admin-form-grid">
                          <Field label="Nama pengalaman">
                            <input
                              required
                              maxLength="120"
                              value={exp.title}
                              onChange={(e) => update("title", e.target.value)}
                            />
                          </Field>
                          <Field label="Harga mulai (Rp), kosong bila belum ditetapkan">
                            <input
                              type="number"
                              min="0"
                              max="1000000000"
                              value={exp.price ?? ""}
                              onChange={(e) =>
                                update(
                                  "price",
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                                )
                              }
                            />
                          </Field>
                          <Field label="Durasi, opsional">
                            <input
                              maxLength="100"
                              value={exp.duration}
                              onChange={(e) =>
                                update("duration", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Deskripsi kartu">
                            <textarea
                              required
                              maxLength="500"
                              value={exp.cardDescription}
                              onChange={(e) =>
                                update("cardDescription", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Deskripsi detail">
                            <textarea
                              rows="4"
                              required
                              maxLength="2000"
                              value={exp.description}
                              onChange={(e) =>
                                update("description", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Poin pengalaman (satu per baris)">
                            <textarea
                              rows="4"
                              required
                              value={exp.items.join("\n")}
                              onChange={(e) =>
                                update("items", e.target.value.split("\n"))
                              }
                            />
                          </Field>
                        </div>
                      </section>
                    );
                  })}
                  <button className="admin-button" disabled={busy}>
                    {busy ? "Menyimpan…" : "Simpan pengalaman & harga"}
                  </button>
                </form>
              )}
              {section === "media" && (
                <>
                  <form onSubmit={saveSettings}>
                    <section className="admin-card">
                      <h2>Gambar website</h2>
                      <p className="admin-subtle">
                        Pakai URL HTTPS atau pilih gambar yang sudah diunggah.
                      </p>
                      <div className="admin-image-grid">
                        {["hero", "reef", "ocean"].map((key) => (
                          <div key={key}>
                            <img
                              src={content.images[key]}
                              alt={"Preview " + key}
                            />
                            <Field
                              label={
                                {
                                  hero: "Hero & pengalaman pemula",
                                  reef: "Terumbu & jelajah laut",
                                  ocean: "Pengalaman spesial",
                                }[key]
                              }
                            >
                              <input
                                required
                                value={content.images[key]}
                                onChange={(e) =>
                                  mutateContent("images", key, e.target.value)
                                }
                              />
                            </Field>
                            <select
                              aria-label={"Pilih gambar " + key}
                              value=""
                              onChange={(e) =>
                                e.target.value &&
                                mutateContent("images", key, e.target.value)
                              }
                            >
                              <option value="">Pilih dari media…</option>
                              {data.media.map((m) => (
                                <option value={m.url} key={m.id}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                      <button className="admin-button" disabled={busy}>
                        {busy ? "Menyimpan…" : "Simpan gambar website"}
                      </button>
                    </section>
                  </form>
                  <section className="admin-card">
                    <h2>Media library</h2>
                    <form className="admin-upload" onSubmit={upload}>
                      <Field label="Upload PNG, JPEG, atau WebP · maksimal 4 MB">
                        <input
                          type="file"
                          name="file"
                          accept="image/png,image/jpeg,image/webp"
                          required
                        />
                      </Field>
                      <button
                        className="admin-button secondary"
                        disabled={busy}
                      >
                        {busy ? "Mengunggah…" : "Unggah gambar ↑"}
                      </button>
                    </form>
                    <p className="admin-subtle">
                      Gambar disimpan dalam database agar tetap tersedia setelah
                      redeploy. Upload bukan otomatis publikasi gambar pada
                      halaman.
                    </p>
                    <div className="admin-media-grid">
                      {data.media.map((m) => (
                        <article key={m.id}>
                          <img src={m.url} alt={m.name} />
                          <strong>{m.name}</strong>
                          <small>{Math.round(m.bytes / 1024)} KB</small>
                          <code>{m.url}</code>
                        </article>
                      ))}
                    </div>
                    {!data.media.length && (
                      <p className="admin-empty">
                        Belum ada gambar yang diunggah.
                      </p>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
