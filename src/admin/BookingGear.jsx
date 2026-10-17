"use client";
import { useId } from "react";
import { bookingGearLimit } from "../cms-model.js";
import { holdsPlaces } from "../booking-model.js";
import { freeUnits, shopReservations, variantKey } from "../shop-stock.js";

// Rental gear the team books by hand on a reservation, for a walk-in guest
// or an order made on WhatsApp. It is held on the reservation's dates like
// gear rented online once the reservation is confirmed, so the calendar
// and the website count it. Beside each line, what is left of that gear on
// those dates, counting every other reservation.
export default function BookingGear({ value, setValue, gear, bookings }) {
  const id = useId();
  const lines = value.gear ?? [];
  const keyOf = (line) => variantKey(line.product, "rental", line.size ?? "");
  const info = new Map((gear ?? []).map((g) => [g.key, g]));
  const held = shopReservations(bookings.filter((b) => b.id !== value.id));
  // Gear rented in this booking's online order, shown as it is.
  const online = (value.payment?.lines ?? []).filter(
    (line) => line.product && line.mode === "rental",
  );
  const set = (next) => setValue({ ...value, gear: next });
  const change = (index, patch) =>
    set(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  function note(line) {
    const g = info.get(keyOf(line));
    if (!g) return { text: "Alat ini tidak lagi disewakan.", warn: true };
    if (!g.follows)
      return {
        text: "Website belum mengikuti stok sewa alat ini.",
        warn: false,
      };
    const free = freeUnits(
      g.stock,
      held[g.key],
      value.startDate,
      value.endDate,
    );
    if (Number(line.quantity) > free)
      return {
        text:
          free > 0
            ? `Hanya ${free} ${g.unit} tersedia pada tanggal ini.`
            : "Penuh pada tanggal ini.",
        warn: true,
      };
    return {
      text: `Tersedia ${free} ${g.unit} pada tanggal ini.`,
      warn: false,
    };
  }
  return (
    <section className="admin-booking-gear" aria-label="Alat sewa">
      <h3>Alat sewa</h3>
      <p className="admin-subtle">
        Catat alat yang disewa tamu dari WhatsApp atau datang langsung. Alat
        ditahan pada tanggal reservasi setelah statusnya Dikonfirmasi, dan
        tampil di Kalender, tampilan Sewa alat.
      </p>
      {online.length > 0 && (
        <ul className="admin-gear-online">
          {online.map((line, index) => (
            <li key={index}>
              {line.name?.id ?? line.product} × {line.quantity}
              <small>Dari pesanan online</small>
            </li>
          ))}
        </ul>
      )}
      {gear === null ? (
        <p className="admin-subtle">Memuat alat sewa…</p>
      ) : (
        <>
          {lines.map((line, index) => {
            const { text, warn } = note(line);
            return (
              <div className="admin-gear-line" key={index}>
                <div className="admin-field">
                  <label htmlFor={`${id}-gear-${index}`}>
                    Alat sewa {index + 1}
                  </label>
                  <select
                    id={`${id}-gear-${index}`}
                    value={keyOf(line)}
                    onChange={(e) => {
                      const g = info.get(e.target.value);
                      if (g)
                        change(index, { product: g.productId, size: g.size });
                    }}
                  >
                    {!info.has(keyOf(line)) && (
                      <option value={keyOf(line)}>{line.product}</option>
                    )}
                    {gear.map((g) => (
                      <option key={g.key} value={g.key}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-field">
                  <label htmlFor={`${id}-qty-${index}`}>
                    Jumlah {index + 1}
                  </label>
                  <input
                    id={`${id}-qty-${index}`}
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={line.quantity}
                    onChange={(e) =>
                      change(index, {
                        quantity:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <small className={warn ? "is-warn" : undefined}>{text}</small>
                <button
                  type="button"
                  className="admin-inline danger"
                  aria-label={`Hapus alat sewa ${index + 1}`}
                  onClick={() => set(lines.filter((_, i) => i !== index))}
                >
                  Hapus
                </button>
              </div>
            );
          })}
          {!gear.length ? (
            <p className="admin-subtle">
              Belum ada produk yang disewakan. Centang Disewakan di Dive Shop.
            </p>
          ) : (
            <button
              type="button"
              className="admin-button secondary"
              disabled={lines.length >= bookingGearLimit}
              onClick={() =>
                set([
                  ...lines,
                  {
                    product: gear[0].productId,
                    size: gear[0].size,
                    quantity: 1,
                  },
                ])
              }
            >
              + Tambah alat sewa
            </button>
          )}
          {lines.length > 0 && !holdsPlaces(value) && (
            <p className="admin-subtle is-warn">
              Alat belum ditahan karena reservasi belum Dikonfirmasi.
            </p>
          )}
        </>
      )}
    </section>
  );
}
