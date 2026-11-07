"use client";
import Link from "next/link";
import { programTitle } from "../cms-model.js";
import { bookingReference } from "../booking-model.js";
import { paymentText, teamDates } from "../team-mail.js";
import { noticeKind, noticeTags, noticeTexts } from "../booking-notice.js";
import { useOutsideClose } from "./useOutsideClose.js";

const money = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

// A booking from the corner note or the bell, as a short notice: who,
// what, when and how it is paid, with one button to confirm it. The full
// form stays in the calendar for changes.
export default function BookingNotice({
  booking,
  content,
  busy,
  error,
  onConfirm,
  onShowCalendar,
  onClose,
}) {
  const card = useOutsideClose(true, () => !busy && onClose());
  const kind = noticeKind(booking);
  const texts = noticeTexts[kind];
  const amount = Number(booking.payment?.amount ?? booking.amount) || 0;
  const phone = String(booking.phone ?? "").replace(/\D/g, "");
  const rows = [
    ["Kegiatan", programTitle(content, booking.experience)],
    ["Tanggal", teamDates(booking)],
    ["Peserta", `${booking.participants} orang`],
    ["WhatsApp", booking.phone ?? ""],
    ["Email", booking.email ?? ""],
    ["Nilai", amount ? money(amount) : ""],
    ["Pembayaran", paymentText(booking)],
    ["Catatan", booking.notes ?? ""],
    ["Kode", bookingReference(booking.id)],
  ].filter(([, value]) => value);
  return (
    <div className="admin-notice-backdrop">
      <section
        ref={card}
        className={"admin-notice is-" + kind}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-notice-title"
      >
        <p className="admin-notice-eyebrow">{texts.eyebrow}</p>
        <h2 id="booking-notice-title">{booking.guestName || "Tamu"}</h2>
        <dl className="admin-notice-rows">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="admin-notice-text">{texts.text}</p>
        {error && (
          <p className="admin-notice-error" role="alert">
            {error}
          </p>
        )}
        <div className="admin-notice-actions">
          {texts.confirm && (
            <button
              type="button"
              className="admin-button"
              disabled={busy}
              onClick={() => onConfirm(booking, kind)}
            >
              {busy ? "Menyimpan…" : texts.confirm}
            </button>
          )}
          {phone && (
            <a
              className="admin-button secondary"
              href={`https://wa.me/${phone}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Chat WhatsApp
            </a>
          )}
          {onShowCalendar && (
            <button
              type="button"
              className="admin-button secondary"
              disabled={busy}
              onClick={() => onShowCalendar(booking)}
            >
              Lihat di kalender
            </button>
          )}
          <button
            type="button"
            className="admin-inline"
            disabled={busy}
            onClick={onClose}
          >
            {texts.confirm ? "Nanti saja" : "Tutup"}
          </button>
        </div>
      </section>
    </div>
  );
}

const day = (value) => new Date(value + "T12:00:00");
const shortDate = (value) =>
  day(value).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

// The bell's list: each booking waiting on its own tile, with the date
// on the left, the guest and what they booked, and a tag when they pay by
// transfer or online.
export function PendingBookings({ bookings, content, onOpen, onMore }) {
  const thisYear = new Date().getFullYear();
  return (
    <>
      <div className="admin-bell-head">
        <h3>Perlu konfirmasi</h3>
        {bookings.length > 0 && <span>{bookings.length}</span>}
      </div>
      {bookings.length ? (
        <ul className="admin-bell-list">
          {bookings.slice(0, 5).map((b) => {
            const start = day(b.startDate);
            const kind = noticeKind(b);
            const details = [
              programTitle(content, b.experience),
              `${b.participants} orang`,
            ];
            if (b.endDate && b.endDate !== b.startDate)
              details.push("s/d " + shortDate(b.endDate));
            return (
              <li key={b.id}>
                <Link
                  href={"/admin/calendar?booking=" + b.id}
                  className={"admin-bell-item is-" + kind}
                  onClick={(event) => {
                    event.preventDefault();
                    onOpen(b);
                  }}
                >
                  <span className="admin-bell-date">
                    <b>{start.getDate()}</b>
                    <small>
                      {start.toLocaleDateString("id-ID", { month: "short" })}
                    </small>
                    {start.getFullYear() !== thisYear && (
                      <i>{start.getFullYear()}</i>
                    )}
                  </span>
                  <span className="admin-bell-body">
                    <span className="admin-bell-name">
                      <b>{b.guestName || "Tamu"}</b>
                      {noticeTags[kind] && <em>{noticeTags[kind]}</em>}
                    </span>
                    <small>{details.filter(Boolean).join(" · ")}</small>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="admin-bell-empty">Tidak ada reservasi menunggu.</p>
      )}
      {bookings.length > 5 && (
        <Link
          href="/admin/calendar#daftar-reservasi"
          className="admin-bell-more"
          onClick={onMore}
        >
          Lihat {bookings.length - 5} lainnya di Kalender reservasi
        </Link>
      )}
    </>
  );
}
