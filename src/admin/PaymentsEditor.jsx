"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { programTitle } from "../cms-model.js";
import { paymentStatusLabels } from "../payment-model.js";
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
              Saat aktif, formulir di halaman Diving, Snorkeling, dan Trip laut
              punya pilihan <strong>Tanya dulu</strong> (WhatsApp) dan{" "}
              <strong>Bayar sekarang</strong>. Tamu memilih paket dari daftar
              harga dan membayar lunas. Begitu Midtrans melaporkan pembayaran
              berhasil, reservasi otomatis berstatus Dikonfirmasi pada tanggal
              kegiatannya dan tampil di kalender.
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
          {status?.blockedByDemo && (
            <li className="warn">
              Pembayaran sungguhan butuh database MySQL (CMS_MODE=mysql).
              Penyimpanan demo bersifat sementara, jadi tombol bayar
              disembunyikan sampai CMS memakai MySQL.
            </li>
          )}
        </ul>
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
                      <small>
                        {b.payment.item} × {b.payment.quantity}
                      </small>
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
                      <small>{b.payment.orderId}</small>
                      {b.payment.method && <small>{b.payment.method}</small>}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-inline"
                        disabled={busy || !configured}
                        onClick={() => onSync(b.payment.orderId)}
                      >
                        Cek status
                      </button>
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
