"use client";
import { useState } from "react";
import { Field } from "./fields.jsx";
import { dueHourChoices, accountLimit } from "../payment-model.js";

const hoursLabel = (h) =>
  h > 24 && h % 24 === 0 ? `${h / 24} hari` : `${h} jam`;
const previews = [
  ["order", "midtrans", "Pesanan · link Midtrans"],
  ["order", "transfer", "Pesanan · transfer bank"],
  ["invoice", "midtrans", "Invoice"],
  ["expired", "midtrans", "Pesanan dibatalkan"],
];

// Emails to guests: the order with its payment deadline, the invoice once
// paid, and the cancellation when the deadline passed. Bank accounts for
// bookings billed by transfer, a note printed on every invoice, and a copy
// of each email for the office.
export default function GuestMailSettings({
  settings,
  mail,
  onChange,
  onSave,
  busy,
}) {
  const [lang, setLang] = useState("id");
  const [sample, setSample] = useState(null);
  const [sending, setSending] = useState(false);
  const accounts = settings.accounts ?? [];
  const rows = [...accounts];
  while (rows.length < accountLimit)
    rows.push({ bank: "", number: "", holder: "" });
  const setAccount = (index, key, value) => {
    const next = rows.map((row, i) =>
      i === index ? { ...row, [key]: value } : row,
    );
    // Empty rows are dropped when the settings are saved.
    onChange({ accounts: next });
  };
  async function sendSample(kind, method) {
    setSending(true);
    setSample(null);
    try {
      const response = await fetch("/api/admin/mail-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, method, lang }),
      });
      const result = await response.json();
      setSample(
        response.ok
          ? { ok: true, text: `Contoh email terkirim ke ${result.to}.` }
          : { ok: false, text: result.error || "Contoh belum terkirim." },
      );
    } catch {
      setSample({ ok: false, text: "Server belum dapat merespons." });
    } finally {
      setSending(false);
    }
  }
  return (
    <form onSubmit={onSave} className="admin-card admin-guest-mail">
      <div className="admin-dev-head">
        <div>
          <h2>Email tamu & invoice</h2>
          <p className="admin-subtle">
            Tamu yang mengisi email menerima email ber-logo Zanclus: rincian
            pesanan dengan batas waktu bayar, invoice begitu lunas, dan
            pemberitahuan bila batas bayar lewat. Berlaku untuk pesanan dari
            website dan reservasi WhatsApp yang dicatat di admin.
          </p>
        </div>
        <label className="admin-dev-switch">
          <input
            type="checkbox"
            role="switch"
            checked={settings.guestEmails !== false}
            onChange={(e) => onChange({ guestEmails: e.target.checked })}
          />
          <span aria-hidden="true" />
          {settings.guestEmails !== false ? "Aktif" : "Mati"}
        </label>
      </div>
      <ul className="admin-pay-checks">
        <li className={mail?.configured ? "ok" : "warn"}>
          {mail?.configured
            ? `Email dikirim dari ${mail.from}. Balasan tamu masuk ke email di menu Kontak.`
            : "SMTP belum diatur, jadi email belum bisa dikirim. Isi SMTP_HOST, SMTP_USER, dan SMTP_PASS di hPanel → Variabel environment, lalu deploy ulang."}
        </li>
      </ul>

      <div className="admin-form-grid">
        <Field
          label="Batas waktu pembayaran"
          hint="Untuk pesanan website (link Midtrans kedaluwarsa setelahnya) dan tagihan dari admin."
        >
          <select
            value={settings.dueHours ?? 24}
            onChange={(e) => onChange({ dueHours: Number(e.target.value) })}
          >
            {dueHourChoices.map((h) => (
              <option key={h} value={h}>
                {hoursLabel(h)}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Salinan setiap email ke"
          hint="Opsional. Email kantor untuk arsip invoice (dikirim sebagai BCC)."
        >
          <input
            type="email"
            maxLength={200}
            placeholder="keuangan@zanclusdivecenter.com"
            value={settings.copyTo ?? ""}
            onChange={(e) => onChange({ copyTo: e.target.value })}
          />
        </Field>
      </div>

      <h3 className="admin-guest-mail-title">Rekening untuk transfer bank</h3>
      <p className="admin-subtle">
        Tampil di email tagihan transfer dan di halaman transfer setelah tamu
        memesan di website. Isi sampai {accountLimit} rekening.
      </p>
      <div className="admin-account-rows">
        {rows.map((row, i) => (
          <div className="admin-account-row" key={i}>
            <Field label={`Bank ${i + 1}`}>
              <input
                maxLength={40}
                placeholder="BCA"
                value={row.bank}
                onChange={(e) => setAccount(i, "bank", e.target.value)}
              />
            </Field>
            <Field label="Nomor rekening">
              <input
                maxLength={30}
                inputMode="numeric"
                placeholder="123 456 7890"
                value={row.number}
                onChange={(e) => setAccount(i, "number", e.target.value)}
              />
            </Field>
            <Field label="Atas nama">
              <input
                maxLength={80}
                placeholder="Zanclus Dive Center"
                value={row.holder}
                onChange={(e) => setAccount(i, "holder", e.target.value)}
              />
            </Field>
          </div>
        ))}
      </div>

      <h3 className="admin-guest-mail-title">Catatan di invoice</h3>
      <div className="admin-form-grid">
        <Field
          label="Bahasa Indonesia"
          hint="Mis. ketentuan pembatalan atau perubahan jadwal. Kosongkan bila tidak perlu."
        >
          <textarea
            rows={3}
            maxLength={600}
            value={settings.invoiceNote?.id ?? ""}
            onChange={(e) =>
              onChange({
                invoiceNote: { ...settings.invoiceNote, id: e.target.value },
              })
            }
          />
        </Field>
        <Field
          label="English"
          hint="For guests who booked in English; the Indonesian note is used when empty."
        >
          <textarea
            rows={3}
            maxLength={600}
            value={settings.invoiceNote?.en ?? ""}
            onChange={(e) =>
              onChange({
                invoiceNote: { ...settings.invoiceNote, en: e.target.value },
              })
            }
          />
        </Field>
      </div>

      <div className="admin-guest-mail-preview">
        <div>
          <h3 className="admin-guest-mail-title">Lihat contoh email</h3>
          <p className="admin-subtle">
            Memakai pengaturan yang sudah disimpan dan pesanan contoh.
          </p>
        </div>
        <div
          className="admin-activity-tabs"
          role="group"
          aria-label="Bahasa contoh"
        >
          {[
            ["id", "Indonesia"],
            ["en", "English"],
          ].map(([code, label]) => (
            <button
              type="button"
              key={code}
              aria-pressed={lang === code}
              onClick={() => setLang(code)}
            >
              {label}
            </button>
          ))}
        </div>
        <ul className="admin-mail-samples">
          {previews.map(([kind, method, label]) => (
            <li key={kind + method}>
              <span>{label}</span>
              <a
                className="admin-inline"
                href={`/api/admin/mail-preview?kind=${kind}&method=${method}&lang=${lang}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Pratinjau
              </a>
              <button
                type="button"
                className="admin-inline"
                disabled={sending || !mail?.configured}
                onClick={() => sendSample(kind, method)}
              >
                Kirim ke email saya
              </button>
            </li>
          ))}
        </ul>
        {sample && (
          <p
            className={"admin-pay-test-result " + (sample.ok ? "ok" : "warn")}
            role="status"
          >
            {sample.text}
          </p>
        )}
      </div>

      <button className="admin-button" disabled={busy}>
        {busy ? "Menyimpan…" : "Simpan pengaturan email"}
      </button>
    </form>
  );
}
