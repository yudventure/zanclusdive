"use client";
import { cloneElement, useEffect, useId, useState } from "react";
import Link from "next/link";
import ShopEditor from "./ShopEditor.jsx";
import ActivitiesEditor from "./ActivitiesEditor.jsx";
import PriceListEditor from "./PriceListEditor.jsx";
import GalleryEditor from "./GalleryEditor.jsx";
import CalendarEditor from "./CalendarEditor.jsx";
import CourseEditor from "./CourseEditor.jsx";
import AboutEditor from "./AboutEditor.jsx";
import ServiceEditor from "./ServiceEditor.jsx";
import { defaultCourses } from "../course-model.js";
import { defaultAbout } from "../about-model.js";
import { defaultService } from "../service-model.js";
import Overview, { displayName, dailySchedule } from "./Overview.jsx";
import { AdminIcon } from "./icons.jsx";
import ImageUpload from "./ImageUpload.jsx";
import { prepareImage } from "./image-upload.js";
import { galleryLimit } from "../gallery.js";
import { socialPlatforms, defaultMapQuery } from "../contact-model.js";
import { bookingReference } from "../booking-model.js";
import { siteImageFields, builtInPhotos } from "../photography.js";
import { localizeContent, applyEnglishEdit } from "../content-i18n.js";
import {
  experienceKeys,
  textFields,
  statuses,
  sources,
  defaultContent,
} from "../cms-model.js";
const sections = {
  overview: "Ringkasan cepat",
  calendar: "Kalender reservasi",
  reservations: "Reservasi",
  customers: "Tamu",
  website: "Teks website",
  media: "Foto & media",
  experiences: "Pengalaman & harga",
  contact: "Kontak & sosial media",
  shop: "Dive Shop",
  activities: "Halaman aktivitas",
  prices: "Daftar harga",
  events: "Kalender kegiatan",
  courses: "Kursus selam",
  service: "Servis alat selam",
  about: "Tentang kami",
};
const mainSections = [
  "overview",
  "calendar",
  "reservations",
  "customers",
  "events",
];
const siteSections = [
  "media",
  "website",
  "experiences",
  "activities",
  "courses",
  "prices",
  "shop",
  "service",
  "about",
  "contact",
];
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
export default function Dashboard({ section, email, today }) {
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
    [editing, setEditing] = useState(null),
    [editLocale, setEditLocale] = useState("id"),
    [siteOpen, setSiteOpen] = useState(siteSections.includes(section)),
    [autoSave, setAutoSave] = useState(0);
  // Copy sections can be edited per language; prices, photos and visibility
  // are shared by both versions of the website.
  const bilingual = [
    "website",
    "experiences",
    "activities",
    "shop",
    "contact",
  ].includes(section);
  const view =
    bilingual && editLocale === "en" ? localizeContent(content, "en") : content;
  const pending = data?.bookings.filter((b) => b.status === "pending") || [];
  const todayGuests = data
    ? dailySchedule(data.bookings, today, 1)[0].guests
    : 0;
  const ownerName =
    displayName(email) === "tim Zanclus" ? "Operator" : displayName(email);
  const initials = ownerName.slice(0, 2).toUpperCase();
  const link = (key) => (
    <Link
      key={key}
      href={"/admin/" + key}
      aria-current={section === key ? "page" : undefined}
      className={section === key ? "active" : ""}
    >
      <AdminIcon name={key} />
      {sections[key]}
    </Link>
  );
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
    if (siteSections.includes(section)) setSiteOpen(true);
    setNotification(false);
    setNotice("");
  }, [section]);
  function mutateContent(group, key, value) {
    setContent((current) =>
      editLocale === "en"
        ? applyEnglishEdit(current, group, key, value)
        : {
            ...current,
            [group]: { ...current[group], [key]: value },
          },
    );
    setNotice("");
  }
  async function saveSettings(
    event,
    message = "Perubahan sudah tersimpan dan tampil di website.",
  ) {
    event?.preventDefault();
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
      setNotice(message);
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
  // Uploads a photo from a computer or phone into the media library.
  async function uploadPhoto(file) {
    setError("");
    setNotice("");
    try {
      const form = new FormData();
      const prepared = await prepareImage(file);
      form.append("file", prepared, prepared.name);
      const media = await request("/api/admin/media", "POST", form);
      setData((current) => ({ ...current, media: [media, ...current.media] }));
      return media.url;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }
  // Upload, place the photo with apply(url) and save at once, so the new
  // photo is live without a separate save step.
  async function placePhoto(file, apply) {
    const url = await uploadPhoto(file);
    apply(url);
    setAutoSave((n) => n + 1);
  }
  useEffect(() => {
    if (autoSave)
      saveSettings(null, "Foto terpasang dan sudah tampil di website.");
  }, [autoSave]);
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
                {b.source === "website" && (
                  <small>{bookingReference(b.id)}</small>
                )}
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
              Kembali ke situs <AdminIcon name="arrow" size={15} />
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
                <AdminIcon name="bell" />
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
                aria-label="Akun"
                aria-expanded={ownerMenu}
                onClick={() => {
                  setOwnerMenu(!ownerMenu);
                  setNotification(false);
                }}
              >
                <span>{initials}</span>
                <b>{ownerName}</b>
                <AdminIcon name="chevron" size={15} />
              </button>
              {ownerMenu && (
                <div className="admin-popover">
                  <p>{email}</p>
                  <button className="admin-inline" onClick={logout}>
                    <AdminIcon name="logout" size={15} /> Keluar dari admin
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
              <AdminIcon name="menu" />
            </button>
          </div>
        </div>
      </header>

      <div className="admin-workspace">
        <aside className={"admin-sidebar " + (mobileMenu ? "open" : "")}>
          <p className="admin-eyebrow">MENU</p>
          <div
            className="admin-links"
            role="navigation"
            aria-label="Menu admin"
          >
            {mainSections.map(link)}
            <button
              type="button"
              className={
                "admin-group-toggle" +
                (siteSections.includes(section) ? " current" : "")
              }
              aria-expanded={siteOpen}
              onClick={() => setSiteOpen(!siteOpen)}
            >
              <AdminIcon name="settings" />
              Pengaturan situs
              <AdminIcon name="chevron" size={16} className="admin-chevron" />
            </button>
            {siteOpen && (
              <div className="admin-sublinks">{siteSections.map(link)}</div>
            )}
          </div>
          <div
            className={"admin-sidebar-note" + (pending.length ? " warn" : "")}
          >
            <strong>STATUS HARI INI</strong>
            <p>
              {!data
                ? "Memuat catatan…"
                : pending.length
                  ? `${pending.length} reservasi menunggu konfirmasi.`
                  : "Semua reservasi sudah dikonfirmasi."}{" "}
              {todayGuests
                ? `${todayGuests} tamu ke laut hari ini.`
                : data
                  ? "Belum ada tamu ke laut hari ini."
                  : ""}
            </p>
          </div>
        </aside>
        <main className="admin-main">
          {section !== "overview" && (
            <p className="admin-eyebrow">ZANCLUS / RUANG KERJA</p>
          )}
          <div
            className="admin-title-row"
            hidden={section === "overview" && !!data}
          >
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
                <Overview
                  bookings={bookings}
                  content={content}
                  customers={customers}
                  pending={pending}
                  today={today}
                  email={email}
                  table={bookingTable(bookings.slice(0, 5))}
                />
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
                    Dihimpun dari catatan reservasi.
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
              {bilingual && data && (
                <div className="admin-language">
                  <div
                    className="admin-activity-tabs"
                    role="group"
                    aria-label="Bahasa konten"
                  >
                    {[
                      ["id", "Bahasa Indonesia"],
                      ["en", "English"],
                    ].map(([code, label]) => (
                      <button
                        type="button"
                        key={code}
                        aria-pressed={editLocale === code}
                        onClick={() => setEditLocale(code)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="admin-subtle">
                    {editLocale === "en"
                      ? "Mengedit versi English (halaman utama zanclusdive.com). Harga, foto, nomor kontak, dan status tampil sama di kedua bahasa."
                      : "Mengedit versi Bahasa Indonesia (zanclusdive.com/id). Pilih English untuk mengubah teks website default."}
                  </p>
                </div>
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
                            value={view.text[key]}
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
                          value={view.contact.location}
                          onChange={(e) =>
                            mutateContent("contact", "location", e.target.value)
                          }
                        />
                      </Field>
                      <Field label="Pencarian Google Maps untuk peta toko">
                        <input
                          maxLength={200}
                          placeholder={defaultMapQuery}
                          value={content.contact.mapQuery ?? ""}
                          onChange={(e) =>
                            mutateContent("contact", "mapQuery", e.target.value)
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
                      ikonnya.
                    </p>
                    <button className="admin-button" disabled={busy}>
                      {busy ? "Menyimpan…" : "Simpan kontak"}
                    </button>
                  </section>
                </form>
              )}
              {section === "activities" && (
                <ActivitiesEditor
                  activities={view.activities}
                  update={(key, value) =>
                    mutateContent("activities", key, value)
                  }
                  onSave={saveSettings}
                  busy={busy}
                  media={data.media}
                  placePhoto={placePhoto}
                />
              )}
              {section === "courses" && (
                <CourseEditor
                  courses={content.courses}
                  media={data.media}
                  update={(items) =>
                    setContent((current) => ({
                      ...current,
                      courses: { ...current.courses, items },
                    }))
                  }
                  onSave={saveSettings}
                  busy={busy}
                  placePhoto={placePhoto}
                  editPartners={(edit) =>
                    setContent((current) => ({
                      ...current,
                      courses: {
                        ...current.courses,
                        partners: edit(
                          current.courses?.partners ?? defaultCourses.partners,
                        ),
                      },
                    }))
                  }
                />
              )}
              {section === "about" && (
                <AboutEditor
                  about={content.about}
                  media={data.media}
                  update={(patch) =>
                    setContent((current) => ({
                      ...current,
                      about: { ...(current.about ?? defaultAbout), ...patch },
                    }))
                  }
                  onSave={saveSettings}
                  busy={busy}
                  placePhoto={placePhoto}
                />
              )}
              {section === "service" && (
                <ServiceEditor
                  service={content.service}
                  media={data.media}
                  updateItems={(items) =>
                    setContent((current) => ({
                      ...current,
                      service: {
                        ...(current.service ?? defaultService),
                        items,
                      },
                    }))
                  }
                  setImage={(image) =>
                    setContent((current) => ({
                      ...current,
                      service: {
                        ...(current.service ?? defaultService),
                        image,
                      },
                    }))
                  }
                  onSave={saveSettings}
                  busy={busy}
                  placePhoto={placePhoto}
                />
              )}
              {section === "events" && (
                <CalendarEditor
                  calendar={content.calendar}
                  update={(key, value) => mutateContent("calendar", key, value)}
                  onSave={saveSettings}
                  busy={busy}
                />
              )}
              {section === "prices" && (
                <PriceListEditor
                  priceList={content.priceList}
                  update={(group, items) =>
                    mutateContent("priceList", group, items)
                  }
                  onSave={saveSettings}
                  busy={busy}
                />
              )}
              {section === "shop" && (
                <ShopEditor
                  shop={view.shop}
                  update={(key, value) => mutateContent("shop", key, value)}
                  onSave={saveSettings}
                  busy={busy}
                  media={data.media}
                  placePhoto={placePhoto}
                />
              )}
              {section === "experiences" && (
                <form onSubmit={saveSettings}>
                  <p className="admin-subtle">
                    Program diving di sini digunakan oleh kuis dan formulir
                    rencana. Kelola kartu Diving, Snorkeling, dan Trip Laut di
                    menu Halaman aktivitas.
                  </p>
                  {experienceKeys.map((key) => {
                    const exp = view.experiences[key];
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
                        Tekan Ganti foto, lalu pilih foto dari komputer atau HP.
                        Foto langsung terpasang dan tampil di website.
                      </p>
                      <div className="admin-image-grid">
                        {siteImageFields.map(([key, label]) => (
                          <div key={key} className="admin-image-slot">
                            <img
                              src={content.images[key]}
                              alt={"Preview " + label}
                            />
                            <strong>{label}</strong>
                            <ImageUpload
                              label="Ganti foto"
                              onFile={(file) =>
                                placePhoto(file, (url) =>
                                  mutateContent("images", key, url),
                                )
                              }
                            />
                            <details className="admin-more">
                              <summary>Pilih foto lain atau tempel URL</summary>
                              <Field label={"URL foto " + label}>
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
                                <option value="">Pilih dari koleksi…</option>
                                {data.media.length > 0 && (
                                  <optgroup label="Foto yang diunggah">
                                    {data.media.map((m) => (
                                      <option value={m.url} key={m.id}>
                                        {m.name}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                <optgroup label="Foto bawaan website">
                                  {builtInPhotos.map(([url, title]) => (
                                    <option value={url} key={url}>
                                      {title}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            </details>
                          </div>
                        ))}
                      </div>
                      <button className="admin-button" disabled={busy}>
                        {busy ? "Menyimpan…" : "Simpan gambar website"}
                      </button>
                    </section>
                  </form>
                  <GalleryEditor
                    gallery={content.gallery}
                    media={data.media}
                    update={(items) => mutateContent("gallery", "items", items)}
                    updateVideos={(videos) =>
                      mutateContent("gallery", "videos", videos)
                    }
                    onSave={saveSettings}
                    busy={busy}
                    placePhoto={placePhoto}
                    addPhoto={(url) =>
                      setContent((current) => ({
                        ...current,
                        gallery: {
                          ...current.gallery,
                          items: [
                            ...current.gallery.items,
                            { src: url, caption: { id: "", en: "" } },
                          ].slice(0, galleryLimit),
                        },
                      }))
                    }
                  />
                  <section className="admin-card">
                    <h2>Koleksi foto</h2>
                    <p className="admin-subtle">
                      Semua foto yang pernah diunggah. Bisa memilih beberapa
                      foto sekaligus, lalu memakainya di galeri, Dive Shop, atau
                      halaman aktivitas.
                    </p>
                    <ImageUpload
                      multiple
                      label="Upload beberapa foto"
                      hint="Foto besar dari kamera otomatis dikecilkan"
                      onFile={async (file) => {
                        await uploadPhoto(file);
                        setNotice("Foto masuk ke koleksi.");
                      }}
                    />
                    <div className="admin-media-grid">
                      {data.media.map((m) => (
                        <article key={m.id}>
                          <img src={m.url} alt={m.name} />
                          <strong>{m.name}</strong>
                          <small>{Math.round(m.bytes / 1024)} KB</small>
                        </article>
                      ))}
                    </div>
                    {!data.media.length && (
                      <p className="admin-empty">
                        Belum ada foto yang diunggah.
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
