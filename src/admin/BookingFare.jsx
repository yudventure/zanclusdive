"use client";
import { useState } from "react";
import { fareActions, fareNames, fareSettings } from "../fare-model.js";
import { dictionary } from "../i18n.js";

const money = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
const day = (date) =>
  new Date(date + "T12:00:00Z").toLocaleDateString("id-ID", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const witToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jayapura" });

// The fare of a booking paid online, in the reservation editor: what it
// allows and until when, the dates the guest moved, and a refund the guest
// asked for, which the team marks as sent once the money is back.
export default function BookingFare({ booking, onRefunded }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const payment = booking.payment ?? {};
  const fare = payment.fare;
  const refund = payment.refund;
  const moves = booking.reschedules ?? [];
  if (!fare && !refund && !moves.length) return null;
  const actions = fareActions(booking, witToday());
  const rules = fare
    ? dictionary("id").fare.rules[fare.tier](fareSettings(fare))
    : "";
  async function markSent() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Gagal menyimpan.");
      setNote("");
      await onRefunded?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-fare-box" aria-labelledby="admin-fare-title">
      <h3 id="admin-fare-title">
        {fare
          ? `Tarif ${fareNames[fare.tier]}${fare.percent ? ` +${fare.percent}%` : ""}`
          : "Perubahan dari tamu"}
      </h3>
      {fare && (
        <>
          <p className="admin-subtle">{rules}</p>
          <ul className="admin-fare-facts">
            {fare.markup > 0 && <li>Kenaikan tarif {money(fare.markup)}</li>}
            {actions.rescheduleUntil && (
              <li>
                Tamu bisa ganti tanggal sampai {day(actions.rescheduleUntil)}
              </li>
            )}
            {actions.refundUntil && (
              <li>
                Tamu bisa refund {money(fare.refundable)} sampai{" "}
                {day(actions.refundUntil)}
              </li>
            )}
            {fare.tier === "standard" && (
              <li>
                Ganti tanggal karena cuaca diatur tim lewat kolom tanggal di
                atas.
              </li>
            )}
          </ul>
        </>
      )}
      {moves.length > 0 && (
        <>
          <p className="admin-fare-label">Diganti tamu</p>
          <ul className="admin-fare-facts">
            {moves.map((move) => (
              <li key={move.at}>
                {day(move.from)} menjadi {day(move.to)}
              </li>
            ))}
          </ul>
        </>
      )}
      {refund?.status === "requested" && (
        <div className="admin-refund is-open">
          <p>
            <strong>Refund diminta {money(refund.amount)}</strong>
            <span>
              Tamu membatalkan lewat halaman pesanannya pada{" "}
              {day(refund.requestedAt.slice(0, 10))}. Kirim refund lewat
              dashboard Midtrans atau transfer, lalu tandai di sini.
            </span>
          </p>
          <label className="admin-field">
            <span>Catatan refund (mis. nomor transfer)</span>
            <input
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {error && <p className="admin-error">{error}</p>}
          <button
            type="button"
            className="admin-button secondary"
            disabled={busy}
            onClick={markSent}
          >
            {busy ? "Menyimpan…" : "Tandai refund sudah dikirim"}
          </button>
        </div>
      )}
      {refund?.status === "done" && (
        <div className="admin-refund">
          <p>
            <strong>Refund {money(refund.amount)} sudah dikirim</strong>
            <span>
              {day(refund.doneAt.slice(0, 10))}
              {refund.note ? `. ${refund.note}` : ""}
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
