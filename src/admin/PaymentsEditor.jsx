"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { programTitle } from "../cms-model.js";
import {
  paymentStatusLabels,
  paymentItemLabel,
  manualMethods,
  isManual,
  overdue,
} from "../payment-model.js";
import { methodLabel } from "../booking-mail.js";
import { bookingReference } from "../booking-model.js";

const money = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export function PaymentBadge({ payment }) {
  return (
    <span className={"admin-pay-badge " + payment.status}>
      {paymentStatusLabels[payment.status] ?? payment.status}
    </span>
  );
}

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="admin-pay-copy">
      <small>{label}</small>
      <code>{value}</code>
      <button
        type="button"
        className="admin-inline"
        onClick={async () => {
          await navigator.clipboard?.writeText(value).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
      >
        {copied ? "Tersalin" : "Salin"}
      </button>
    </div>
  );
}

const stages = {
  snap: "saat membuat pembayaran",
  test: "saat tes koneksi",
  status: "saat cek status",
};
const witTime = (value) =>
  new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jayapura",
  }) + " WIT";
// What a Midtrans refusal usually means, in plain words.
function explain(status) {
  if (status === 401)
    return "Midtrans menolak server key. Pastikan yang diisi Server Key (bukan Client Key), modenya sesuai (sandbox: awalan SB-Mid-server-, production: Mid-server- dengan MIDTRANS_PRODUCTION=true), tanpa spasi atau tanda kutip, lalu deploy ulang.";
  if (status === 0)
    return "Server website tidak bisa terhubung ke Midtrans. Coba lagi beberapa menit lagi; jika tetap gagal, tanyakan ke Hostinger apakah koneksi keluar ke midtrans.com diizinkan.";
  if (status >= 500) return "Midtrans sedang bermasalah. Coba lagi nanti.";
  return "Midtrans menolak data pembayaran. Kirim pesan ini ke pengembang website.";
}

// Checks that Midtrans accepts the server key, from the website's server.
function ConnectionTest({ disabled }) {
  const [result, setResult] = useState(null);
  const [testing, setTesting] = useState(false);
  async function run() {
    setTesting(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      setResult(await response.json());
    } catch {
      setResult({ ok: false, reason: "network", message: "" });
    } finally {
      setTesting(false);
    }
  }
  const text = !result
    ? null
    : result.ok
      ? "Berhasil: Midtrans menerima server key ini."
      : result.reason === "missing"
        ? "Server key belum diisi di hosting."
        : result.reason === "key"
          ? "Gagal (401): " + explain(401)
          : result.reason === "network"
            ? "Gagal: " +
              explain(0) +
              (result.message ? ` (${result.message})` : "")
            : `Gagal (${result.status}): ${result.message || explain(result.status)}`;
  return (
    <div className="admin-pay-test">
      <button
        type="button"
        className="admin-button secondary"
        disabled={disabled || testing}
        onClick={run}
      >
        {testing ? "Menguji…" : "Tes koneksi Midtrans"}
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

// Online payment with Midtrans: switch it on, see whether the hosting has
// the keys, and follow each payment.
export default function PaymentsEditor({
  payments,
  status,
  bookings,
  content,
  update,
  onSave,
  onSync,
  busy,
  children,
}) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const paid = bookings.filter((b) => b.payment);
  const configured = status?.configured;
  const total = paid
    .filter((b) => b.payment.status === "paid")
    .reduce((sum, b) => sum + b.payment.amount, 0);
  return (
    <>
      <form
        onSubmit={onSave}
        className={
          "admin-card admin-dev-master" + (payments.enabled ? " is-on" : "")
        }
      >
        <div className="admin-dev-head">
          <div>
            <h2>Bayar langsung dengan Midtrans</h2>
            <p className="admin-subtle">
              Saat aktif, semua pemesanan dibayar lewat Midtrans: paket Diving,
              Snorkeling, dan Trip laut, belanja dan sewa alat di Dive Shop,
              kursus selam, dan servis alat. Tamu melihat ringkasan, lalu
              membayar lunas. Begitu Midtrans melaporkan pembayaran berhasil,
              pesanan otomatis berstatus Dikonfirmasi pada tanggalnya dan tampil
              di kalender. Tamu yang masih ragu tetap bisa mengirim ringkasannya
              lewat WhatsApp.
            </p>
          </div>
          <label className="admin-dev-switch">
            <input
              type="checkbox"
              role="switch"
              checked={payments.enabled}
              onChange={(e) => update(e.target.checked)}
            />
            <span aria-hidden="true" />
            {payments.enabled ? "Aktif" : "Mati"}
          </label>
        </div>
        <ul className="admin-pay-checks">
          <li className={configured ? "ok" : "warn"}>
            {configured
              ? "Server key Midtrans terpasang di hosting."
              : "Server key Midtrans belum diisi. Tambahkan MIDTRANS_SERVER_KEY di environment variable hPanel, lalu deploy ulang. Tombol bayar belum tampil sebelum key diisi."}
          </li>
          <li className={status?.production ? "ok" : "info"}>
            {status?.production
              ? "Mode production: pembayaran sungguhan."
              : "Mode sandbox (uji coba): tidak ada uang sungguhan. Isi MIDTRANS_PRODUCTION=true dan server key production saat siap menerima pembayaran."}
          </li>
          {(status?.issues ?? []).map((issue) => (
            <li className="warn" key={issue}>
              {issue}
            </li>
          ))}
          {status?.lastError && (
            <li className="warn admin-pay-last-error">
              <strong>
                Penolakan terakhir dari Midtrans{" "}
                {stages[status.lastError.stage] ?? ""} (
                {witTime(status.lastError.at)}):
              </strong>{" "}
              {status.lastError.status ? `${status.lastError.status} · ` : ""}
              {status.lastError.message || "tanpa keterangan"}
              <span>{explain(status.lastError.status)}</span>
            </li>
          )}
          {status?.blockedByDemo && (
            <li className="warn">
              Pembayaran sungguhan butuh database MySQL (CMS_MODE=mysql).
              Penyimpanan demo bersifat sementara, jadi tombol bayar
              disembunyikan sampai CMS memakai MySQL.
            </li>
          )}
        </ul>
        <ConnectionTest disabled={!configured} />
        {origin && (
          <div className="admin-pay-urls">
            <p className="admin-subtle">
              Di dashboard Midtrans (Settings → Payment → Notification URL),
              tempel alamat berikut supaya pembayaran langsung tercatat:
            </p>
            <CopyField
              label="Payment Notification URL"
              value={origin + "/api/payments/midtrans"}
            />
            <CopyField
              label="Finish Redirect URL"
              value={origin + "/payment/finish"}
            />
          </div>
        )}
        <button className="admin-button" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan pengaturan pembayaran"}
        </button>
      </form>
      {children}

      <section className="admin-card">
        <div className="admin-pay-head">
          <h2>Riwayat pembayaran</h2>
          <p>
            Lunas: <strong>{money(total)}</strong>
          </p>
        </div>
        {paid.length ? (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tamu</th>
                  <th>Aktivitas & paket</th>
                  <th>Tanggal kegiatan</th>
                  <th>Total</th>
                  <th>Pembayaran</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paid.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.guestName}</strong>
                      <small>{b.phone}</small>
                      <small>{bookingReference(b.id)}</small>
                    </td>
                    <td>
                      {programTitle(content, b.experience)}
                      <small>{paymentItemLabel(b.payment)}</small>
                    </td>
                    <td>
                      {new Date(b.startDate + "T12:00:00").toLocaleDateString(
                        "id-ID",
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
                      <small>{b.participants} peserta</small>
                    </td>
                    <td>{money(b.payment.amount)}</td>
                    <td>
                      <PaymentBadge payment={b.payment} />
                      {isManual(b.payment) ? (
                        <small>Dicatat admin</small>
                      ) : (
                        <small>{b.payment.orderId}</small>
                      )}
                      {b.payment.method && (
                        <small>
                          {manualMethods[b.payment.method] ??
                            methodLabel(b.payment.method)}
                        </small>
                      )}
                      {overdue(b.payment) && (
                        <small className="admin-overdue">
                          Lewat batas bayar
                        </small>
                      )}
                    </td>
                    <td>
                      {!isManual(b.payment) && (
                        <button
                          type="button"
                          className="admin-inline"
                          disabled={busy || !configured}
                          onClick={() => onSync(b.payment.orderId)}
                        >
                          Cek status
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-subtle">
            Belum ada pembayaran online. Pembayaran yang lunas juga tampil di{" "}
            <Link href="/admin/reservations">Reservasi</Link> dan kalender.
          </p>
        )}
      </section>
    </>
  );
}
