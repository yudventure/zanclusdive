"use client";
import { useEffect, useState } from "react";
import { bookingReference } from "../booking-model.js";
import {
  purchaseDelivery,
  purchaseItems,
  purchaseState,
  purchaseStates,
} from "../booking-kind.js";
import { overdue } from "../payment-model.js";
import { methodLabel, witDateTime } from "../booking-mail.js";

const money = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
const dateLabel = (value) =>
  new Date(value + "T12:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const filters = [
  ["unpaid", "Belum dibayar"],
  ["paid", "Sudah dibayar"],
  ["all", "Semua"],
];
// The payment badge colours: waiting, paid, or not going to be paid.
const badges = {
  unpaid: "unpaid",
  paid: "paid",
  expired: "expired",
  refunded: "expired",
  cancelled: "failed",
};
const providerName = (p) =>
  p.provider === "paypal"
    ? "PayPal"
    : p.provider === "manual"
      ? methodLabel(p.method, "id")
      : "Midtrans";
// What the team needs to know about the payment, in a few words.
function paymentNote(b) {
  const p = b.payment;
  if (!p) return "";
  const state = purchaseState(b);
  if (state === "paid")
    return `Lewat ${providerName(p)}${p.paidAt ? `, ${witDateTime(p.paidAt, "id")}` : ""}`;
  if (state !== "unpaid") return providerName(p);
  const due = p.dueAt ? `, batas ${witDateTime(p.dueAt, "id")}` : "";
  return p.provider === "manual"
    ? `Menunggu transfer bank${due}`
    : `Menunggu ${providerName(p)}${due}`;
}
const canMarkPaid = (b) =>
  b.status !== "cancelled" &&
  b.payment?.provider === "manual" &&
  b.payment.status === "unpaid";

// Dive Shop purchases: no schedule, only whether each one is paid. A bank
// transfer is marked paid here once the money is in; an online payment
// settles by itself.
export default function PurchaseOrders({
  purchases,
  busy,
  focusId,
  onMarkPaid,
  onCancel,
  onRemove,
}) {
  const unpaid = purchases.filter((b) => purchaseState(b) === "unpaid");
  const [filter, setFilter] = useState(unpaid.length ? "unpaid" : "all");
  const [find, setFind] = useState("");
  useEffect(() => {
    if (!focusId) return;
    const shown = purchases.find((b) => b.id === focusId);
    if (shown && filter !== "all" && purchaseState(shown) !== filter)
      setFilter("all");
    setTimeout(
      () =>
        document
          .getElementById("pembelian-" + focusId)
          ?.scrollIntoView({ block: "center" }),
      60,
    );
  }, [focusId]);
  const count = (key) =>
    key === "all"
      ? purchases.length
      : purchases.filter((b) => purchaseState(b) === key).length;
  const query = find.trim().toLowerCase();
  const shown = purchases
    .filter((b) => filter === "all" || purchaseState(b) === filter)
    .filter(
      (b) =>
        !query ||
        [
          b.guestName,
          b.phone,
          b.email,
          bookingReference(b.id),
          b.payment?.orderId,
          ...purchaseItems(b),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
    )
    .sort((a, b) =>
      (b.payment?.createdAt ?? b.startDate).localeCompare(
        a.payment?.createdAt ?? a.startDate,
      ),
    );
  return (
    <section className="admin-card admin-purchases" id="daftar-pembelian">
      <h2>Daftar pembelian</h2>
      <p className="admin-subtle">
        Pesanan barang dari Dive Shop, terbaru di atas. Transfer bank ditandai
        Sudah dibayar setelah uangnya masuk, lalu tamu menerima invoice.
        Pembayaran Midtrans dan PayPal tercatat sendiri begitu lunas.
      </p>
      <div className="admin-toolbar">
        <div
          className="admin-month-views"
          role="group"
          aria-label="Status pembayaran"
        >
          {filters.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label} ({count(key)})
            </button>
          ))}
        </div>
        <input
          type="search"
          aria-label="Cari pembelian"
          placeholder="Cari nama, telepon, barang, kode…"
          value={find}
          onChange={(e) => setFind(e.target.value)}
        />
      </div>
      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tamu</th>
              <th>Barang</th>
              <th>Total</th>
              <th>Pembayaran</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((b) => {
              const state = purchaseState(b);
              const phone = String(b.phone ?? "").replace(/\D/g, "");
              return (
                <tr
                  key={b.id}
                  id={"pembelian-" + b.id}
                  className={b.id === focusId ? "is-focus" : undefined}
                >
                  <td>
                    <strong>{b.guestName || "Tamu"}</strong>
                    <small>
                      {dateLabel(b.startDate)}
                      {b.phone ? " · " + b.phone : ""}
                    </small>
                    <small>{bookingReference(b.id)}</small>
                  </td>
                  <td>
                    <ul className="admin-purchase-items">
                      {purchaseItems(b).map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                    {purchaseDelivery(b) && (
                      <small>{purchaseDelivery(b)}</small>
                    )}
                  </td>
                  <td>{money(Number(b.payment?.amount ?? b.amount) || 0)}</td>
                  <td>
                    <span className={"admin-pay-badge " + badges[state]}>
                      {purchaseStates[state]}
                    </span>
                    {paymentNote(b) && <small>{paymentNote(b)}</small>}
                    {state === "unpaid" && overdue(b.payment) && (
                      <small className="admin-overdue">Lewat batas bayar</small>
                    )}
                  </td>
                  <td>
                    <div className="admin-purchase-actions">
                      {canMarkPaid(b) && (
                        <button
                          type="button"
                          className="admin-inline"
                          disabled={busy}
                          onClick={() => onMarkPaid(b)}
                        >
                          Sudah dibayar
                        </button>
                      )}
                      {phone && (
                        <a
                          className="admin-inline"
                          href={`https://wa.me/${phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`WhatsApp ${b.guestName || "tamu"}`}
                        >
                          WhatsApp
                        </a>
                      )}
                      {state === "unpaid" && (
                        <button
                          type="button"
                          className="admin-inline"
                          disabled={busy}
                          onClick={() => onCancel(b)}
                        >
                          Batalkan
                        </button>
                      )}
                      <button
                        type="button"
                        className="admin-inline danger"
                        disabled={busy}
                        onClick={() => onRemove(b)}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!shown.length && (
          <p className="admin-empty">
            {purchases.length
              ? "Tidak ada pembelian pada pilihan ini."
              : "Belum ada pembelian barang. Pesanan dari Dive Shop akan muncul di sini."}
          </p>
        )}
      </div>
    </section>
  );
}
