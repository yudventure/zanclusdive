"use client";
import { useState } from "react";
import { Field } from "./fields.jsx";
import {
  notifyEmailLimit,
  paypalAmount,
  paypalRateLimits,
} from "../payment-model.js";

const witTime = (value) =>
  new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jayapura",
  }) + " WIT";

function Switch({ checked, onChange, disabled }) {
  return (
    <label className="admin-dev-switch">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span aria-hidden="true" />
      {checked ? "Aktif" : "Mati"}
    </label>
  );
}

// Checks that PayPal accepts the Client ID and Secret, from the server.
function PaypalTest({ disabled }) {
  const [result, setResult] = useState(null);
  const [testing, setTesting] = useState(false);
  async function run() {
    setTesting(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "paypal-test" }),
      });
      setResult(await response.json());
    } catch {
      setResult({ ok: false, reason: "network" });
    } finally {
      setTesting(false);
    }
  }
  const text = !result
    ? null
    : result.ok
      ? "Berhasil. PayPal menerima Client ID dan Secret ini."
      : result.reason === "missing"
        ? "Client ID dan Secret PayPal belum diisi di hosting."
        : result.reason === "key"
          ? "Gagal (401). PayPal menolak Client ID atau Secret. Pastikan keduanya dari aplikasi yang sama di developer.paypal.com, dan PAYPAL_MODE sesuai (live untuk key Live, kosong untuk key Sandbox)."
          : result.reason === "network"
            ? "Gagal. Server website tidak bisa terhubung ke PayPal. Coba lagi nanti, atau tanyakan ke Hostinger apakah koneksi keluar ke paypal.com diizinkan."
            : `Gagal (${result.status}). ${result.message || "PayPal menolak permintaan."}`;
  return (
    <div className="admin-pay-test">
      <button
        type="button"
        className="admin-button secondary"
        disabled={disabled || testing}
        onClick={run}
      >
        {testing ? "Menguji…" : "Tes koneksi PayPal"}
      </button>
      {text && (
        <p
          className={"admin-pay-test-result " + (result.ok ? "ok" : "warn")}
          role="status"
        >
          {text}
        </p>
      )}
    </div>
  );
}

// The other ways to pay at the website's checkout (bank transfer and
// PayPal), and the email to the team when a booking comes in.
export default function PaymentMethodSettings({
  settings,
  status,
  mail,
  contactEmail,
  onChange,
  onSave,
  busy,
}) {
  const accounts = settings.accounts ?? [];
  const paypal = { enabled: false, rate: 16000, ...settings.paypal };
  const paypalStatus = status?.paypal ?? {};
  const notify = { enabled: true, emails: [], paid: true, ...settings.notify };
  const emails = [...notify.emails];
  while (emails.length < notifyEmailLimit) emails.push("");
  const setEmail = (index, value) =>
    onChange({
      notify: {
        ...notify,
        // Empty rows are dropped when the settings are saved.
        emails: emails.map((e, i) => (i === index ? value : e)),
      },
    });
  const save = (label) => (
    <button className="admin-button" disabled={busy}>
      {busy ? "Menyimpan…" : label}
    </button>
  );
  return (
    <>
      <form
        onSubmit={onSave}
        id="transfer-bank"
        className={
          "admin-card admin-dev-master" + (settings.transfer ? " is-on" : "")
        }
      >
        <div className="admin-dev-head">
          <div>
            <h2>Transfer bank di checkout</h2>
            <p className="admin-subtle">
              Tamu bisa memilih Transfer bank saat memesan di website. Website
              tidak menarik uang. Setelah memesan, tamu melihat nomor rekening,
              jumlah yang harus ditransfer, dan batas waktunya, lalu mengirim
              bukti transfer lewat WhatsApp. Pesanan menahan tempatnya sampai
              batas waktu. Begitu uang masuk, buka reservasinya di Kalender
              reservasi, pilih Pembayaran Sudah lunas, lalu simpan. Tamu
              menerima invoice.
            </p>
          </div>
          <Switch
            checked={settings.transfer === true}
            onChange={(transfer) => onChange({ transfer })}
          />
        </div>
        <ul className="admin-pay-checks">
          <li className={accounts.length ? "ok" : "warn"}>
            {accounts.length
              ? `${accounts.length} rekening tampil ke tamu (${accounts.map((a) => a.bank).join(", ")}). Ubah di Rekening untuk transfer bank, di bawah.`
              : "Belum ada rekening. Isi Rekening untuk transfer bank di bawah, lalu simpan. Pilihan transfer baru tampil setelah ada rekening."}
          </li>
        </ul>
        {save("Simpan transfer bank")}
      </form>

      <form
        onSubmit={onSave}
        id="paypal"
        className={
          "admin-card admin-dev-master" + (paypal.enabled ? " is-on" : "")
        }
      >
        <div className="admin-dev-head">
          <div>
            <h2>PayPal</h2>
            <p className="admin-subtle">
              Untuk tamu luar negeri. PayPal tidak menerima rupiah, jadi tamu
              membayar dalam dolar AS dengan kurs di bawah. Begitu tamu
              menyetujui pembayaran di PayPal dan kembali ke website, pembayaran
              ditarik dan pesanan otomatis Dikonfirmasi.
            </p>
          </div>
          <Switch
            checked={paypal.enabled}
            onChange={(enabled) => onChange({ paypal: { ...paypal, enabled } })}
          />
        </div>
        <ul className="admin-pay-checks">
          <li className={paypalStatus.configured ? "ok" : "warn"}>
            {paypalStatus.configured
              ? "Client ID dan Secret PayPal terpasang di hosting" +
                (paypalStatus.keyEnding
                  ? `, Client ID berakhiran ${paypalStatus.keyEnding}.`
                  : ".")
              : "Kunci PayPal belum diisi. Di hPanel, Variabel environment, tambahkan PAYPAL_CLIENT_ID dan PAYPAL_CLIENT_SECRET dari developer.paypal.com (Apps & Credentials), lalu deploy ulang. Tombol PayPal belum tampil sebelum kunci diisi."}
          </li>
          <li className={paypalStatus.live ? "ok" : "info"}>
            {paypalStatus.live
              ? "Mode live, pembayaran sungguhan."
              : "Mode sandbox (uji coba), tidak ada uang sungguhan. Untuk pembayaran sungguhan, pakai Client ID dan Secret dari tab Live lalu tambahkan PAYPAL_MODE dengan isi live di hPanel."}
          </li>
          {paypalStatus.lastError && (
            <li className="warn admin-pay-last-error">
              <strong>
                Penolakan terakhir dari PayPal (
                {witTime(paypalStatus.lastError.at)})
              </strong>{" "}
              {paypalStatus.lastError.status
                ? `${paypalStatus.lastError.status} · `
                : ""}
              {paypalStatus.lastError.message || "tanpa keterangan"}
            </li>
          )}
        </ul>
        <PaypalTest disabled={!paypalStatus.configured} />
        <div className="admin-form-grid">
          <Field
            label="Kurs, rupiah per 1 USD"
            hint={`Contoh, pesanan Rp 1.500.000 ditagih USD ${paypalAmount(1500000, paypal.rate || 16000)}. Perbarui sesuai kurs, PayPal juga memotong biayanya sendiri.`}
          >
            <input
              type="number"
              inputMode="numeric"
              min={paypalRateLimits[0]}
              max={paypalRateLimits[1]}
              step={1}
              value={paypal.rate}
              onChange={(e) =>
                onChange({
                  paypal: { ...paypal, rate: Number(e.target.value) || "" },
                })
              }
            />
          </Field>
        </div>
        <p className="admin-subtle">
          Tidak ada alamat yang perlu ditempel di dashboard PayPal. Website
          memberi tahu PayPal alamat kembali di setiap pembayaran.
        </p>
        {save("Simpan pengaturan PayPal")}
      </form>

      <form
        onSubmit={onSave}
        id="pemberitahuan-booking"
        className={
          "admin-card admin-dev-master" + (notify.enabled ? " is-on" : "")
        }
      >
        <div className="admin-dev-head">
          <div>
            <h2>Pemberitahuan booking masuk</h2>
            <p className="admin-subtle">
              Email ke tim setiap ada booking atau permintaan dari website,
              lengkap dengan nama tamu, kegiatan, tanggal, nilai, cara bayar,
              dan tombol untuk membukanya di panel. Panel yang sedang terbuka
              juga berbunyi. Bunyinya diatur di lonceng di kanan atas.
            </p>
          </div>
          <Switch
            checked={notify.enabled}
            onChange={(enabled) => onChange({ notify: { ...notify, enabled } })}
          />
        </div>
        <ul className="admin-pay-checks">
          <li className={mail?.configured ? "ok" : "warn"}>
            {mail?.configured
              ? `Email dikirim dari ${mail.from}.`
              : "SMTP belum diatur, jadi email belum bisa dikirim. Isi SMTP_HOST, SMTP_USER, dan SMTP_PASS di hPanel, Variabel environment, lalu deploy ulang. Bunyi di panel tetap jalan."}
          </li>
        </ul>
        <div className="admin-form-grid">
          {emails.map((value, i) => (
            <Field
              key={i}
              label={`Email penerima ${i + 1}`}
              hint={
                i === 0
                  ? `Kosongkan semua untuk memakai email di menu Kontak${contactEmail ? ` (${contactEmail})` : ""}.`
                  : "Opsional."
              }
            >
              <input
                type="email"
                maxLength={200}
                placeholder="reservasi@zanclusdivecenter.com"
                value={value}
                onChange={(e) => setEmail(i, e.target.value)}
              />
            </Field>
          ))}
        </div>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={notify.paid}
            onChange={(e) =>
              onChange({ notify: { ...notify, paid: e.target.checked } })
            }
          />
          Kirim juga saat pesanan lunas lewat Midtrans atau PayPal
        </label>
        {save("Simpan pemberitahuan")}
      </form>
    </>
  );
}
