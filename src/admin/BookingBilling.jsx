"use client";
import { useState } from "react";
import Link from "next/link";
import { Field } from "./fields.jsx";
import {
  dueHourChoices,
  manualMethods,
  midtransLocked,
  isManual,
  overdue,
  mailFor,
  paymentStatusLabels,
} from "../payment-model.js";
import { mailKindLabels } from "../booking-mail.js";

const hoursLabel = (h) =>
  h > 24 && h % 24 === 0 ? `${h / 24} hari` : `${h} jam`;
const wit = (value) =>
  new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jayapura",
  }) + " WIT";

// The payment choice that matches a saved payment, for the form.
export function billingFrom(payment, today) {
  const base = {
    dueHours: null,
    method:
      payment?.method && manualMethods[payment.method]
        ? payment.method
        : "transfer",
    paidOn: today,
    extend: false,
    notify: true,
  };
  if (!payment) return { ...base, action: "none" };
  if (midtransLocked(payment)) return { ...base, action: "keep" };
  if (isManual(payment))
    return {
      ...base,
      action: payment.status === "paid" ? "paid" : "transfer",
      paidOn: payment.paidAt
        ? new Date(payment.paidAt).toLocaleDateString("en-CA", {
            timeZone: "Asia/Jayapura",
          })
        : today,
    };
  return { ...base, action: "keep" };
}

// Payment and guest email for a booking entered by the team: no bill, a
// bill by bank transfer or Midtrans link with a deadline, or paid; and
// whether to email the guest.
export function BookingBilling({ value, setBilling, info, canSettings }) {
  const billing = value.billing;
  const payment = value.payment;
  const locked = midtransLocked(payment);
  const set = (patch) => setBilling({ ...billing, ...patch });
  const accounts = info?.accounts ?? 0;
  const openTransfer =
    isManual(payment) &&
    payment.status === "unpaid" &&
    billing.action === "transfer";
  const alreadyPaid =
    isManual(payment) && payment.status === "paid" && billing.action === "paid";
  const newBill =
    (billing.action === "transfer" && (!openTransfer || billing.extend)) ||
    billing.action === "midtrans";
  const emailNote = !value.email
    ? "Isi email tamu agar tamu menerima email."
    : newBill
      ? "Tamu menerima email rincian pesanan dengan batas waktu bayar."
      : billing.action === "paid" && !alreadyPaid
        ? "Tamu menerima invoice lunas."
        : null;
  if (value.status === "closed") return null;
  return (
    <fieldset className="admin-billing">
      <legend>Pembayaran & email tamu</legend>
      {locked ? (
        <div className="admin-billing-locked">
          <p>
            <span className={"admin-pay-badge " + payment.status}>
              {paymentStatusLabels[payment.status]}
            </span>{" "}
            Pembayaran Midtrans {payment.orderId}
            {payment.dueAt && payment.status !== "paid"
              ? ` · batas bayar ${wit(payment.dueAt)}`
              : ""}
          </p>
          <small className="admin-subtle">
            Status berubah sendiri saat Midtrans melaporkan pembayaran. Invoice
            otomatis terkirim ke tamu begitu lunas.
          </small>
        </div>
      ) : (
        <div className="admin-form-grid">
          <Field label="Pembayaran">
            <select
              value={billing.action}
              onChange={(e) => set({ action: e.target.value, extend: false })}
            >
              {payment && !isManual(payment) && (
                <option value="keep">
                  Biarkan ({paymentStatusLabels[payment?.status] ?? "tanpa"} di
                  Midtrans)
                </option>
              )}
              <option value="none">Tanpa tagihan (catat saja)</option>
              <option value="transfer" disabled={!accounts}>
                Tagih lewat transfer bank
                {accounts ? "" : " (isi rekening dulu)"}
              </option>
              <option value="midtrans" disabled={!info?.midtrans}>
                Tagih lewat link Midtrans
                {info?.midtrans ? "" : " (Midtrans belum aktif)"}
              </option>
              <option value="paid">Sudah lunas</option>
            </select>
          </Field>
          {newBill && (
            <Field label="Batas waktu bayar">
              <select
                value={billing.dueHours ?? info?.dueHours ?? 24}
                onChange={(e) => set({ dueHours: Number(e.target.value) })}
              >
                {dueHourChoices.map((h) => (
                  <option key={h} value={h}>
                    {hoursLabel(h)}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {billing.action === "paid" && (
            <>
              <Field label="Dibayar lewat">
                <select
                  value={billing.method}
                  onChange={(e) => set({ method: e.target.value })}
                >
                  {Object.entries(manualMethods).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              {!alreadyPaid && (
                <Field label="Tanggal bayar">
                  <input
                    type="date"
                    value={billing.paidOn}
                    onChange={(e) => set({ paidOn: e.target.value })}
                  />
                </Field>
              )}
            </>
          )}
        </div>
      )}
      {openTransfer && (
        <div className="admin-billing-open">
          <p>
            Tagihan transfer {paymentStatusLabels.unpaid.toLowerCase()}, batas
            bayar {wit(payment.dueAt)}
            {overdue(payment) && (
              <strong className="admin-overdue"> · lewat batas</strong>
            )}
          </p>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={billing.extend}
              onChange={(e) => set({ extend: e.target.checked })}
            />
            Buat batas bayar baru mulai sekarang
          </label>
        </div>
      )}
      {!accounts && billing.action !== "transfer" && !locked && (
        <small className="admin-subtle">
          Untuk menagih lewat transfer, isi rekening di{" "}
          {canSettings ? (
            <Link href="/admin/payments">
              Pembayaran → Email tamu & invoice
            </Link>
          ) : (
            "Pembayaran → Email tamu & invoice (superadmin atau keuangan)"
          )}
          .
        </small>
      )}
      {!locked && (
        <div>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={billing.notify}
              onChange={(e) => set({ notify: e.target.checked })}
            />
            Kirim email ke tamu setelah disimpan
          </label>
          {billing.notify && emailNote && (
            <small className="admin-subtle admin-billing-note">
              {emailNote}
            </small>
          )}
        </div>
      )}
    </fieldset>
  );
}

// What was emailed to the guest, and buttons to look at or resend the
// email that fits the payment now.
export function GuestMailLog({ booking, onSent }) {
  const [state, setState] = useState(null);
  const kind = mailFor(booking.payment);
  const mails = booking.mails ?? [];
  if (!kind && !mails.length) return null;
  async function resend() {
    setState({ busy: true });
    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}/mail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const result = await response.json();
      setState(
        response.ok && result.ok
          ? {
              ok: true,
              text: `${mailKindLabels[result.kind]} terkirim ke ${result.to}.`,
            }
          : { ok: false, text: result.error || "Email belum terkirim." },
      );
      onSent?.();
    } catch {
      setState({ ok: false, text: "Server belum dapat merespons." });
    }
  }
  return (
    <div className="admin-mail-log">
      <h3>Email ke tamu</h3>
      {mails.length ? (
        <ul>
          {mails
            .slice(-4)
            .reverse()
            .map((m) => (
              <li key={m.at} className={m.ok ? "ok" : "warn"}>
                <strong>{mailKindLabels[m.kind] ?? m.kind}</strong> ·{" "}
                {m.ok ? "terkirim ke " + m.to : m.error} · {wit(m.at)}
              </li>
            ))}
        </ul>
      ) : (
        <p className="admin-subtle">Belum ada email yang dikirim.</p>
      )}
      {kind && (
        <div className="admin-mail-actions">
          <a
            className="admin-inline"
            href={`/api/admin/bookings/${booking.id}/mail`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Pratinjau {mailKindLabels[kind].toLowerCase()}
          </a>
          <button
            type="button"
            className="admin-inline"
            disabled={state?.busy || !booking.email}
            onClick={resend}
          >
            Kirim ulang {mailKindLabels[kind].toLowerCase()}
          </button>
        </div>
      )}
      {state?.text && (
        <p
          className={"admin-pay-test-result " + (state.ok ? "ok" : "warn")}
          role="status"
        >
          {state.text}
        </p>
      )}
    </div>
  );
}
