"use client";
import { useId, useMemo } from "react";
import { formatIDR } from "../i18n.js";
import {
  bookingPriceGroups,
  defaultQuantity,
  formatRupiah,
  groupsFor,
  packageLimit,
  packagesTotal,
  parseRupiah,
} from "../booking-price.js";

// The value of a reservation: packages picked from the website's prices,
// each with its quantity, add up to the value, or the team types it by
// hand, as 1.500.000 or 1500000.
export default function BookingPackages({ value, setValue, content }) {
  const id = useId();
  const groups = useMemo(
    () => groupsFor(bookingPriceGroups(content), value.experience),
    [content, value.experience],
  );
  const lines = value.packages ?? [];
  const fromPackages = lines.length > 0 && value.amountManual !== true;
  const total = packagesTotal(lines);
  const rupiah = (n) => formatIDR(n, "id");
  function setLines(next) {
    setValue({
      ...value,
      packages: next,
      ...(next.length && value.amountManual !== true
        ? { amount: packagesTotal(next) }
        : {}),
      ...(next.length ? {} : { amountManual: false }),
    });
  }
  function add(key) {
    const item = groups.flatMap((g) => g.items).find((i) => i.key === key);
    if (!item) return;
    const same = lines.findIndex((line) => line.key === key);
    if (same >= 0)
      return setLines(
        lines.map((line, i) =>
          i === same
            ? { ...line, quantity: Math.min(1000, line.quantity + 1) }
            : line,
        ),
      );
    if (lines.length >= packageLimit) return;
    setLines([
      ...lines,
      {
        key: item.key,
        name: item.name,
        price: item.price,
        unit: item.unit,
        quantity: defaultQuantity(item.unit, value),
      },
    ]);
  }
  const setQuantity = (index, quantity) =>
    setLines(
      lines.map((line, i) =>
        i === index
          ? {
              ...line,
              quantity: Math.max(1, Math.min(1000, Number(quantity) || 1)),
            }
          : line,
      ),
    );
  return (
    <div className="admin-packages">
      {groups.length > 0 && (
        <div className="admin-field">
          <label htmlFor={id + "-pick"}>Paket dari daftar harga</label>
          <select
            id={id + "-pick"}
            value=""
            disabled={lines.length >= packageLimit}
            onChange={(e) => add(e.target.value)}
          >
            <option value="">Pilih paket untuk ditambahkan…</option>
            {groups.map((group) => (
              <optgroup key={group.key} label={group.label}>
                {group.items.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.name} · {rupiah(item.price)} {item.unit}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}
      {lines.length > 0 && (
        <ul className="admin-package-lines">
          {lines.map((line, index) => (
            <li key={line.key}>
              <span className="admin-package-name">
                <strong>{line.name}</strong>
                <small>
                  {rupiah(line.price)} {line.unit}
                </small>
              </span>
              <input
                type="number"
                min="1"
                max="1000"
                aria-label={`Jumlah ${line.name}`}
                value={line.quantity}
                onChange={(e) => setQuantity(index, e.target.value)}
              />
              <b>{rupiah(line.price * line.quantity)}</b>
              <button
                type="button"
                className="admin-inline danger"
                aria-label={`Hapus ${line.name}`}
                onClick={() => setLines(lines.filter((_, i) => i !== index))}
              >
                Hapus
              </button>
            </li>
          ))}
        </ul>
      )}
      {lines.length > 0 && (
        <p className="admin-package-total">
          Total paket <b>{rupiah(total)}</b>
        </p>
      )}
      <div className="admin-form-grid">
        <div className="admin-field">
          <label htmlFor={id + "-amount"}>Nilai reservasi (Rp)</label>
          <input
            id={id + "-amount"}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            readOnly={fromPackages}
            value={formatRupiah(value.amount)}
            onChange={(e) =>
              setValue({ ...value, amount: parseRupiah(e.target.value) })
            }
          />
        </div>
        {lines.length > 0 && (
          <label className="admin-check admin-package-auto">
            <input
              type="checkbox"
              checked={fromPackages}
              onChange={(e) =>
                setValue({
                  ...value,
                  amountManual: !e.target.checked,
                  ...(e.target.checked ? { amount: total } : {}),
                })
              }
            />
            Hitung dari paket
          </label>
        )}
      </div>
      <p className="admin-subtle admin-package-hint">
        {lines.length
          ? fromPackages
            ? "Nilai mengikuti total paket. Hapus centang Hitung dari paket untuk mengetik nilai sendiri, misalnya setelah diskon."
            : "Nilai diketik sendiri. Centang Hitung dari paket untuk memakai total paket lagi."
          : "Pilih paket di atas supaya nilainya terhitung sendiri, atau ketik nominalnya, misalnya 1.500.000."}
      </p>
    </div>
  );
}
