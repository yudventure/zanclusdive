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
import DeveloperEditor from "./DeveloperEditor.jsx";
import PaymentsEditor, { PaymentBadge } from "./PaymentsEditor.jsx";
import GuestMailSettings from "./GuestMailSettings.jsx";
import {
  BookingBilling,
  GuestMailLog,
  billingFrom,
} from "./BookingBilling.jsx";
import { overdue } from "../payment-model.js";
import { mailKindLabels } from "../booking-mail.js";
import { fareNames, fareSettings } from "../fare-model.js";
import BookingFare from "./BookingFare.jsx";
import AgentsEditor from "./AgentsEditor.jsx";
import { defaultDeveloper, lockCount } from "../developer.js";
import { defaultCourses } from "../course-model.js";
import { defaultAbout } from "../about-model.js";
import { defaultService } from "../service-model.js";
import Overview, { displayName, dailySchedule } from "./Overview.jsx";
import { AdminIcon } from "./icons.jsx";
import ImageUpload from "./ImageUpload.jsx";
import { prepareImage, prepareLogo } from "./image-upload.js";
import PasswordEditor from "./PasswordEditor.jsx";
import UsersEditor from "./UsersEditor.jsx";
import { RoleHome } from "./RoleHome.jsx";
import SeoEditor from "./SeoEditor.jsx";
import CashbookEditor from "./finance/CashbookEditor.jsx";
import ReportsEditor from "./finance/ReportsEditor.jsx";
import StockEditor from "./inventory/StockEditor.jsx";
import MovementsEditor from "./inventory/MovementsEditor.jsx";
import SocialEditor from "./social/SocialEditor.jsx";
import MonthCalendar from "./MonthCalendar.jsx";
import BookingGear from "./BookingGear.jsx";
import SchedulePaste from "./SchedulePaste.jsx";
import BookingPackages from "./BookingPackages.jsx";
import { useOutsideClose } from "./useOutsideClose.js";
import EmployeesEditor from "./hr/EmployeesEditor.jsx";
import AttendanceEditor from "./hr/AttendanceEditor.jsx";
import PayrollEditor from "./hr/PayrollEditor.jsx";
import {
  sections as sectionInfo,
  groupOf,
  visibleMenu,
  sectionAllowed,
  hasArea,
  roleLabel,
} from "../roles.js";
import { defaultCalendar } from "../calendar-model.js";
import { galleryLimit } from "../gallery.js";
import { socialPlatforms, defaultMapQuery } from "../contact-model.js";
import { bookingReference } from "../booking-model.js";
import { siteImageFields, builtInPhotos } from "../photography.js";
import { localizeContent, applyEnglishEdit } from "../content-i18n.js";
import {
  experienceKeys,
  bookingPrograms,
  programTitle,
  textFields,
  statuses,
  sources,
  defaultContent,
} from "../cms-model.js";
// Page titles come from the shared roles model, which also decides what
// each role sees.
const sections = Object.fromEntries(
  Object.entries(sectionInfo).map(([key, info]) => [key, info.title]),
);
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
const blankBooking = (today, experience = "beginner") => ({
  experience,
  status: "pending",
  source: "whatsapp",
  startDate: today,
  endDate: today,
  guestName: "",
  phone: "",
  participants: 1,
  amount: 0,
  notes: "",
  email: "",
  lang: "id",
  gear: [],
  billing: billingFrom(null, today),
});
async function request(url, method = "GET", body) {
  const options = { method, cache: "no-store" };
  if (body instanceof FormData) options.body = body;
  else if (body) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error(
      "Koneksi ke server terputus. Periksa internet, muat ulang halaman, lalu periksa apakah perubahan sudah tersimpan sebelum mencoba lagi.",
    );
  }
  let result;
  try {
    result = await response.json();
  } catch {
    // Not an answer from the website itself, such as the hosting's own
    // error page while the app restarts or takes too long.
    throw new Error(
      `Server belum dapat merespons (kode ${response.status}). Muat ulang halaman, lalu periksa apakah perubahan sudah tersimpan sebelum mencoba lagi.`,
    );
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
  gear,
  bookings,
  billingInfo,
  canSettings,
  onMailSent,
  onRefunded,
  onClose,
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
      <h2>
        {editing
          ? `Ubah reservasi ${value.guestName || ""}`.trim()
          : "Tambah reservasi / tutup tanggal"}
      </h2>
      <p className="admin-subtle">
        {onClose
          ? "Untuk email tamu, nilai, alat sewa, tagihan, atau menutup tanggal. Booking biasa cukup dicatat dari Agenda di samping kalender."
          : "Formulir lengkap untuk hasil konfirmasi dari WhatsApp atau sumber lain, dengan email tamu, nilai, alat sewa, dan tagihan. Untuk booking cepat, klik tanggalnya di kalender."}
      </p>
      <form className="admin-form" onSubmit={onSave}>
        <fieldset className="admin-form-group">
          <legend>Kegiatan dan tanggal</legend>
          <div className="admin-form-grid">
            <Field label="Pengalaman">
              <select
                value={value.experience}
                onChange={(e) => change("experience", e.target.value)}
              >
                {bookingPrograms.map((k) => (
                  <option key={k} value={k}>
                    {programTitle(content, k)}
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
          </div>
        </fieldset>
        <fieldset className="admin-form-group">
          <legend>Tamu</legend>
          <div className="admin-form-grid">
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
            <Field label="Email tamu">
              <input
                type="email"
                maxLength={200}
                placeholder="untuk tagihan dan invoice"
                value={value.email ?? ""}
                onChange={(e) => change("email", e.target.value)}
              />
            </Field>
            <Field label="Bahasa email">
              <select
                value={value.lang ?? "id"}
                onChange={(e) => change("lang", e.target.value)}
              >
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
              </select>
            </Field>
          </div>
        </fieldset>
        <fieldset className="admin-form-group">
          <legend>Nilai dan catatan</legend>
          <BookingPackages
            value={value}
            setValue={setValue}
            content={content}
          />
          <Field label="Catatan">
            <textarea
              rows="3"
              maxLength="2000"
              value={value.notes}
              onChange={(e) => change("notes", e.target.value)}
            />
          </Field>
        </fieldset>
        {value.status !== "closed" && (
          <BookingGear
            value={value}
            setValue={setValue}
            gear={gear}
            bookings={bookings}
          />
        )}
        <BookingBilling
          value={value}
          setBilling={(billing) => setValue({ ...value, billing })}
          info={billingInfo}
          canSettings={canSettings}
        />
        {editing && <BookingFare booking={value} onRefunded={onRefunded} />}
        {editing && <GuestMailLog booking={value} onSent={onMailSent} />}
        <div className="admin-actions">
          <button className="admin-button" disabled={busy}>
            {busy
              ? "Menyimpan…"
              : editing
                ? "Simpan perubahan"
                : "Simpan reservasi"}
          </button>
          {onClose ? (
            <button
              type="button"
              className="admin-button secondary"
              onClick={onClose}
            >
              Tutup
            </button>
          ) : (
            editing && (
              <button
                type="button"
                className="admin-button secondary"
                onClick={onCancel}
              >
                Batal edit
              </button>
            )
          )}
        </div>
      </form>
    </section>
  );
}
export default function Dashboard({ section, account, today }) {
  const email = account.email;
  const role = account.role;
  const can = (area) => hasArea(role, area);
  const menu = visibleMenu(role);
  const allowed = sectionAllowed(role, section);
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
    // The calendar page shows the full booking form only when it is asked
    // for; a booking is noted from the day's agenda.
    [calendarForm, setCalendarForm] = useState(false),
    [editLocale, setEditLocale] = useState("id"),
    [openGroups, setOpenGroups] = useState(() => new Set([groupOf(section)])),
    [autoSave, setAutoSave] = useState(0),
    // The rental gear and its stock, for the calendar and the booking form.
    [gear, setGear] = useState(null);
  // The bell and the account menu close on a tap anywhere else.
  const bellRef = useOutsideClose(notification, () => setNotification(false));
  const ownerRef = useOutsideClose(ownerMenu, () => setOwnerMenu(false));
  useEffect(() => {
    if (!can("bookings") || section !== "calendar") return;
    request("/api/admin/rental-gear")
      .then((result) => setGear(result.gear))
      .catch(() => setGear([]));
  }, [section]);
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
    account.name ||
    (displayName(email) === "tim Zanclus" ? "Operator" : displayName(email));
  const initials = ownerName.slice(0, 2).toUpperCase();
  const link = (key, icon = key) => (
    <Link
      key={key}
      href={"/admin/" + key}
      aria-current={section === key ? "page" : undefined}
      className={section === key ? "active" : ""}
    >
      <AdminIcon name={icon} />
      {sections[key]}
    </Link>
  );
  const toggleGroup = (key) =>
    setOpenGroups((open) => {
      const next = new Set(open);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
  // Links into the calendar from other pages: ?ubah=<id> opens that
  // reservation in the full form, #daftar-reservasi goes to the list.
  const loaded = Boolean(data);
  useEffect(() => {
    if (section !== "calendar" || !loaded) return;
    const url = new URL(window.location.href);
    const id = url.searchParams.get("ubah");
    const found = id && data.bookings.find((b) => b.id === id);
    if (found) {
      editReservation(found);
      window.history.replaceState(null, "", "/admin/calendar");
    } else if (url.hash === "#daftar-reservasi")
      setTimeout(
        () =>
          document
            .getElementById("daftar-reservasi")
            ?.scrollIntoView({ block: "start" }),
        50,
      );
  }, [section, loaded]);
  useEffect(() => {
    setMobileMenu(false);
    setOwnerMenu(false);
    setOpenGroups((open) => new Set([...open, groupOf(section)]));
    setNotification(false);
    setNotice("");
    setCalendarForm(false);
  }, [section]);
  function mutateContent(group, key, value) {
    setContent((current) => {
      const english = editLocale === "en";
      // A function gets the value as the editor shows it, so edits that
      // land one after another (several photos at once) keep each other.
      const next =
        typeof value === "function"
          ? value(
              (english ? localizeContent(current, "en") : current)[group][key],
            )
          : value;
      return english
        ? applyEnglishEdit(current, group, key, next)
        : {
            ...current,
            [group]: { ...current[group], [key]: next },
          };
    });
    setNotice("");
  }
  // Gear for sale made into rental gear, or the other way, takes the
  // English texts of the product it came from.
  function copyProductTexts(from, to) {
    setContent((current) => {
      const english = current.en?.shop?.products?.[from];
      if (!english) return current;
      return {
        ...current,
        en: {
          ...current.en,
          shop: {
            ...current.en.shop,
            products: {
              ...current.en.shop.products,
              [to]: structuredClone(english),
            },
          },
        },
      };
    });
  }
  // A product file filled in from the admin: its texts per language
  // ({ id, en }, each a set of product fields) and the fields both share.
  function importProduct(id, texts, shared = {}) {
    setContent((current) => {
      const patch = (list, fields) =>
        list.map((p) => (p.id === id ? { ...p, ...fields } : p));
      let next = {
        ...current,
        shop: {
          ...current.shop,
          products: patch(current.shop.products, {
            ...shared,
            ...texts.id,
          }),
        },
      };
      if (texts.en)
        next = applyEnglishEdit(
          next,
          "shop",
          "products",
          patch(localizeContent(next, "en").shop.products, texts.en),
        );
      return next;
    });
    setNotice("");
  }
  async function saveSettings(
    event,
    message = "Perubahan sudah tersimpan dan tampil di website.",
    next = content,
  ) {
    event?.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const result = await request("/api/admin/settings", "PUT", {
        content: next,
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
      const saved = await request(
        "/api/admin/bookings" + (editing ? "/" + editing : ""),
        editing ? "PUT" : "POST",
        booking,
      );
      await refresh();
      setBooking(blankBooking(today));
      setEditing(null);
      closeCalendarForm();
      const mail = saved.mail;
      if (mail && !mail.ok) setError("Reservasi tersimpan. " + mail.error);
      setNotice(
        mail?.ok
          ? `Reservasi tersimpan. ${mailKindLabels[mail.kind]} terkirim ke ${mail.to}.`
          : "Reservasi tersimpan.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  // Every travel agent and OTA calendar read again from the reservation
  // calendar, then the page with what came in.
  async function syncAgentCalendars() {
    setNotice("");
    setError("");
    try {
      const result = await request("/api/admin/agents/sync", "POST");
      await refresh();
      if (result.read)
        setNotice(
          `Kalender agen dan OTA dibaca ulang. ${result.read} kalender, ${result.events} acara.`,
        );
      if (result.failed.length)
        setError(
          result.failed
            .map((f) => `${f.name} belum terbaca, ${f.error}`)
            .join(" "),
        );
    } catch (e) {
      setError(e.message);
    }
  }
  // A booking noted from the calendar's day panel. Errors go back to the
  // panel's form.
  async function quickReservation(payload) {
    const saved = await request("/api/admin/bookings", "POST", payload);
    await refresh();
    setError("");
    setNotice(`Booking ${saved.guestName} tersimpan.`);
    return saved;
  }
  // The full form on the calendar page: opened under the month, scrolled
  // into view, and closed back to the month and its agenda.
  function openCalendarForm() {
    setCalendarForm(true);
    setTimeout(
      () =>
        document
          .getElementById("booking-editor")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  }
  function closeCalendarForm() {
    if (section !== "calendar") return;
    setCalendarForm(false);
    document
      .querySelector(".admin-calendar-layout")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function editReservation(item) {
    setNotice("");
    setBooking({
      ...item,
      email: item.email ?? "",
      lang: item.lang ?? "id",
      billing: billingFrom(item.payment, today),
    });
    setEditing(item.id);
    openCalendarForm();
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
        closeCalendarForm();
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
  // Logos are trimmed and their colours checked before the upload; apply
  // receives the URL and "color" or "white".
  async function placeLogo(file, apply) {
    let logo;
    try {
      logo = await prepareLogo(file);
    } catch (e) {
      setError(e.message);
      throw e;
    }
    const url = await uploadPhoto(logo.file);
    apply(url, logo.style, logo.ratio);
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
  const bookings = data?.bookings || [];
  const filtered = bookings.filter(
    (b) =>
      (statusFilter === "all" || b.status === statusFilter) &&
      `${b.guestName} ${b.phone} ${programTitle(content, b.experience)} ${b.payment?.orderId ?? ""}`
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
              <td>{programTitle(content, b.experience)}</td>
              <td>
                {dateLabel(b.startDate)}
                <small>s/d {dateLabel(b.endDate)}</small>
              </td>
              <td>
                <span className={"admin-status " + b.status}>
                  {statuses[b.status]}
                </span>
                {b.payment && <PaymentBadge payment={b.payment} />}
                {b.payment?.fare && b.payment.fare.tier !== "standard" && (
                  <small className="admin-fare-tag">
                    Tarif {fareNames[b.payment.fare.tier]}
                  </small>
                )}
                {b.payment?.refund && (
                  <small
                    className={
                      "admin-fare-tag " +
                      (b.payment.refund.status === "done" ? "ok" : "warn")
                    }
                  >
                    {b.payment.refund.status === "done"
                      ? "Refund terkirim"
                      : `Refund diminta ${money(b.payment.refund.amount)}`}
                  </small>
                )}
                {overdue(b.payment) && (
                  <small className="admin-overdue">Lewat batas bayar</small>
                )}
                {b.mails?.length > 0 && (
                  <small
                    className={
                      "admin-mail-flag " + (b.mails.at(-1).ok ? "ok" : "warn")
                    }
                  >
                    {b.mails.at(-1).ok ? "Email " : "Email gagal: "}
                    {mailKindLabels[b.mails.at(-1).kind]?.toLowerCase()}
                  </small>
                )}
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
      gear={gear}
      bookings={data?.bookings ?? []}
      billingInfo={{
        ...data?.billing,
        accounts: (content.payments?.accounts ?? []).filter(
          (a) => a.bank && a.number,
        ).length,
        dueHours: content.payments?.dueHours ?? 24,
      }}
      canSettings={can("payments")}
      onMailSent={async () => {
        const next = await refresh();
        const fresh = next?.bookings.find((b) => b.id === editing);
        if (fresh)
          setBooking((current) => ({ ...current, mails: fresh.mails }));
      }}
      onRefunded={async (saved) => {
        setBooking((current) => ({ ...current, payment: saved.payment }));
        setNotice("Refund ditandai sudah dikirim dan masuk Buku kas.");
        await refresh();
      }}
      onClose={
        section === "calendar"
          ? () => {
              setEditing(null);
              setBooking(blankBooking(today));
              closeCalendarForm();
            }
          : undefined
      }
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
            {can("bookings") && (
              <div className="admin-menu-anchor" ref={bellRef}>
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
                        <Link
                          key={b.id}
                          href={"/admin/calendar?ubah=" + b.id}
                          onClick={(event) => {
                            setNotification(false);
                            if (section !== "calendar") return;
                            event.preventDefault();
                            editReservation(b);
                          }}
                        >
                          {b.guestName} · {dateLabel(b.startDate)}
                        </Link>
                      ))
                    ) : (
                      <p>Tidak ada reservasi menunggu.</p>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="admin-menu-anchor" ref={ownerRef}>
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
                  <p>
                    {email}
                    <br />
                    <small>Peran: {roleLabel(role)}</small>
                  </p>
                  <Link
                    className="admin-inline"
                    href="/admin/security"
                    onClick={() => setOwnerMenu(false)}
                  >
                    <AdminIcon name="security" size={15} /> Ubah password
                  </Link>
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
            {menu.map((group) => {
              // A run of top-level links, a single page under the group's
              // icon, or a folding group.
              if (!group.title) return group.items.map((key) => link(key));
              if (group.items.length === 1)
                return link(group.items[0], group.icon);
              const open = openGroups.has(group.key);
              return (
                <div key={group.key} className="admin-menu-group">
                  <button
                    type="button"
                    className={
                      "admin-group-toggle" +
                      (group.items.includes(section) ? " current" : "")
                    }
                    aria-expanded={open}
                    onClick={() => toggleGroup(group.key)}
                  >
                    <AdminIcon name={group.icon} />
                    {group.title}
                    <AdminIcon
                      name="chevron"
                      size={16}
                      className="admin-chevron"
                    />
                  </button>
                  {open && (
                    <div className="admin-sublinks">
                      {group.items.map((key) => link(key))}
                    </div>
                  )}
                </div>
              );
            })}
            {can("settings") && lockCount(content?.developer) > 0 && (
              <p className="admin-dev-flag">
                Mode developer aktif · {lockCount(content.developer)} kunci
              </p>
            )}
          </div>
          {can("bookings") ? (
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
          ) : (
            <div className="admin-sidebar-note">
              <strong>PERAN {roleLabel(role).toUpperCase()}</strong>
              <p>Menu di atas adalah bagian yang bisa dibuka peran ini.</p>
            </div>
          )}
        </aside>
        <main className="admin-main">
          {section !== "overview" && (
            <p className="admin-eyebrow">
              RUANG KERJA ·{" "}
              {section === "calendar"
                ? new Date(month + "-01T12:00:00")
                    .toLocaleDateString("id-ID", {
                      month: "long",
                      year: "numeric",
                    })
                    .toUpperCase()
                : roleLabel(role).toUpperCase()}
            </p>
          )}
          <div
            className="admin-title-row"
            hidden={section === "overview" && !!data}
          >
            <div>
              <h1>{sections[section]}</h1>
              {sectionInfo[section]?.intro && (
                <p className="admin-intro">{sectionInfo[section].intro}</p>
              )}
            </div>
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
          {!allowed ? (
            <section className="admin-card admin-forbidden">
              <h2>Bagian ini tidak tersedia untuk peran {roleLabel(role)}</h2>
              <p className="admin-subtle">
                Minta superadmin bila peran Anda perlu akses ke bagian ini.
              </p>
              <Link className="admin-button secondary" href="/admin">
                Ke ringkasan
              </Link>
            </section>
          ) : !data ? (
            <p className="admin-empty">
              {error
                ? "Periksa konfigurasi MySQL pada hPanel."
                : "Memuat data CMS…"}
            </p>
          ) : (
            <>
              {section === "overview" &&
                (can("bookings") ? (
                  <Overview
                    bookings={bookings}
                    content={content}
                    customers={customers}
                    pending={pending}
                    today={today}
                    email={email}
                    table={bookingTable(bookings.slice(0, 5))}
                  />
                ) : (
                  <RoleHome account={account} menu={menu} />
                ))}
              {section === "users" && (
                <UsersEditor request={request} account={account} />
              )}
              {section === "cashbook" && (
                <CashbookEditor request={request} today={today} />
              )}
              {section === "reports" && (
                <ReportsEditor request={request} today={today} />
              )}
              {section === "stock" && (
                <StockEditor request={request} today={today} />
              )}
              {section === "movements" && (
                <MovementsEditor request={request} today={today} />
              )}
              {section === "social" && (
                <SocialEditor request={request} today={today} />
              )}
              {section === "employees" && <EmployeesEditor request={request} />}
              {section === "attendance" && (
                <AttendanceEditor request={request} today={today} />
              )}
              {section === "payroll" && (
                <PayrollEditor request={request} today={today} />
              )}
              {section === "calendar" && (
                <>
                  <MonthCalendar
                    month={month}
                    today={today}
                    bookings={bookings}
                    agents={data.agents ?? []}
                    content={content}
                    gear={gear}
                    onMove={moveMonth}
                    onToday={() => setMonth(today.slice(0, 7))}
                    onPick={(date, experience, draft) => {
                      setEditing(null);
                      setBooking({
                        ...blankBooking(date, experience),
                        ...draft,
                      });
                      openCalendarForm();
                    }}
                    onEdit={editReservation}
                    onQuickSave={quickReservation}
                    onSyncAgents={syncAgentCalendars}
                  />
                  {calendarForm && editor}
                  <section
                    className="admin-card admin-booking-list"
                    id="daftar-reservasi"
                  >
                    <h2>Daftar reservasi</h2>
                    <p className="admin-subtle">
                      Semua reservasi dari WhatsApp, website, agen, dan
                      pembayaran online. Cari nama, telepon, atau kegiatan, dan
                      saring statusnya. Edit membuka formulir lengkap di bawah
                      kalender.
                    </p>
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
                    {bookingTable(filtered)}
                  </section>
                  <SchedulePaste
                    bookings={bookings}
                    content={content}
                    today={today}
                    request={request}
                    onSaved={async (count) => {
                      await refresh();
                      setNotice(`${count} reservasi dari jadwal tersimpan.`);
                    }}
                  />
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
                              <td>{c.phone || "–"}</td>
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
              {section === "seo" && (
                <SeoEditor
                  seo={content.seo}
                  site={data.site}
                  busy={busy}
                  onChange={(seo) =>
                    setContent((current) => ({ ...current, seo }))
                  }
                  onSave={(event) =>
                    saveSettings(event, "Pengaturan SEO tersimpan.")
                  }
                />
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
                  placeLogo={placeLogo}
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
              {section === "agents" && (
                <AgentsEditor
                  agents={data.agents ?? []}
                  busy={busy}
                  run={async (url, method, body, message) => {
                    setBusy(true);
                    setError("");
                    setNotice("");
                    try {
                      await request(url, method, body);
                      await refresh();
                      if (message) setNotice(message);
                      return true;
                    } catch (e) {
                      setError(e.message);
                      return false;
                    } finally {
                      setBusy(false);
                    }
                  }}
                  reload={async () => {
                    try {
                      await request("/api/admin/agents");
                      await refresh();
                    } catch {}
                  }}
                />
              )}
              {section === "payments" && (
                <PaymentsEditor
                  payments={content.payments ?? { enabled: false }}
                  status={data.payments}
                  bookings={bookings}
                  content={content}
                  update={(enabled) =>
                    setContent((current) => ({
                      ...current,
                      payments: { ...current.payments, enabled },
                    }))
                  }
                  onSave={(event) =>
                    saveSettings(event, "Pengaturan pembayaran tersimpan.")
                  }
                  onSync={async (orderId) => {
                    setBusy(true);
                    try {
                      await request("/api/admin/payments", "POST", {
                        orderId,
                      });
                      await refresh();
                      setNotice("Status pembayaran diperbarui dari Midtrans.");
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  busy={busy}
                >
                  <GuestMailSettings
                    settings={content.payments ?? {}}
                    mail={data.mail}
                    busy={busy}
                    onChange={(patch) =>
                      setContent((current) => ({
                        ...current,
                        payments: { ...current.payments, ...patch },
                      }))
                    }
                    onSave={(event) =>
                      saveSettings(event, "Pengaturan email tamu tersimpan.")
                    }
                  />
                </PaymentsEditor>
              )}
              {section === "security" && <PasswordEditor request={request} />}
              {section === "developer" && (
                <DeveloperEditor
                  developer={{ ...defaultDeveloper, ...content.developer }}
                  products={content.shop.products}
                  services={(content.service ?? defaultService).items}
                  update={(key, value) =>
                    setContent((current) => ({
                      ...current,
                      developer: {
                        ...defaultDeveloper,
                        ...current.developer,
                        [key]: value,
                      },
                    }))
                  }
                  onSave={(event) =>
                    saveSettings(
                      event,
                      "Mode developer tersimpan dan langsung berlaku.",
                    )
                  }
                  // The main switch and the whole-site lock save at once.
                  saveNow={(patch, message) => {
                    const next = {
                      ...content,
                      developer: {
                        ...defaultDeveloper,
                        ...content.developer,
                        ...patch,
                      },
                    };
                    setContent(next);
                    saveSettings(null, message, next);
                  }}
                  busy={busy}
                />
              )}
              {section === "events" && (
                <CalendarEditor
                  calendar={content.calendar}
                  update={(key, value) => mutateContent("calendar", key, value)}
                  onSave={saveSettings}
                  busy={busy}
                  media={data.media}
                  placePhoto={placePhoto}
                  editBanners={(edit) =>
                    setContent((current) => ({
                      ...current,
                      calendar: {
                        ...defaultCalendar,
                        ...current.calendar,
                        banners: edit(
                          current.calendar?.banners ?? defaultCalendar.banners,
                        ),
                      },
                    }))
                  }
                />
              )}
              {section === "prices" && (
                <PriceListEditor
                  priceList={content.priceList}
                  products={content.shop?.products ?? []}
                  update={(group, items) =>
                    mutateContent("priceList", group, items)
                  }
                  fares={content.fares}
                  updateFares={(key, value) => {
                    setContent((current) => ({
                      ...current,
                      fares: {
                        ...fareSettings(current.fares),
                        ...current.fares,
                        [key]: value,
                      },
                    }));
                    setNotice("");
                  }}
                  onSave={saveSettings}
                  busy={busy}
                />
              )}
              {section === "shop" && (
                <ShopEditor
                  shop={view.shop}
                  update={(key, value) => mutateContent("shop", key, value)}
                  locale={editLocale}
                  onImport={importProduct}
                  onSave={saveSettings}
                  busy={busy}
                  media={data.media}
                  placePhoto={placePhoto}
                  request={request}
                  canStock={can("gudang")}
                  canCalendar={can("bookings")}
                  onCopyTexts={copyProductTexts}
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
                        {siteImageFields.map(([key, label, guide]) => (
                          <div key={key} className="admin-image-slot">
                            <img
                              src={content.images[key]}
                              alt={"Preview " + label}
                            />
                            <strong>{label}</strong>
                            <ImageUpload
                              label="Ganti foto"
                              guide={guide}
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
                      guide="collection"
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
