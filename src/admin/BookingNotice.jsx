"use client";
import { programTitle } from "../cms-model.js";
import { bookingReference } from "../booking-model.js";
import { paymentText, teamDates } from "../team-mail.js";
import { noticeKind, noticeTexts } from "../booking-notice.js";
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
