"use client";
import { cloneElement, useId, useState } from "react";
import {
  addOnLimit,
  allPriceGroups,
  extraLabels,
  priceGroups,
  shopAddOn,
} from "../price-list.js";
import { rentalAddOn } from "../shop-model.js";
import { activityLabels } from "../activity-model.js";
import { dictionary, formatIDR } from "../i18n.js";
import { fareSettings } from "../fare-model.js";

function Field({ label, children }) {
  const id = useId();
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
// A new item gets its id at once, so it can be ticked as an add-on before
// the list is saved.
const blank = (group) => ({
  id: `${group.toLowerCase()}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  name: { id: "", en: "" },
  info: { id: "", en: "" },
  price: "",
  unit: { id: "/ hari", en: "/ day" },
});

const labels = { ...activityLabels, ...extraLabels };
const intro = (group) =>
  activityLabels[group]
    ? `Layanan utama ${activityLabels[group]}. Tampil sebagai paket di halaman ${activityLabels[group]} dan di samping kartu ${activityLabels[group]} di beranda.`
    : "Tidak tampil sendiri. Dipakai sebagai add-on di halaman aktivitas, misalnya dokumentasi, antar jemput mobil, atau catering.";
// Why a rental product cannot be an add-on yet.
const gearNote = (p) =>
  !p.enabled
    ? "Belum tampil di website"
    : p.sizes?.length
      ? "Punya ukuran, disewa lewat Dive Shop"
      : p.availability === "unavailable"
        ? "Tidak tersedia"
        : "Isi harga sewanya dulu";

// Standard, Comfort and Flexi for activity packages and gear rentals paid
// online: the increase of each and the last days for a refund and for a
// new date. Below, what guests read at checkout.
function FaresCard({ fares, updateFares }) {
  const f = fareSettings(fares);
  const words = dictionary("id").fare;
  const number = (value, fallback) =>
    value === ""
      ? ""
      : Number.isFinite(Number(value))
        ? Number(value)
        : fallback;
  return (
    <section className="admin-card admin-fares">
      <h2>Tarif Standard, Comfort, Flexi</h2>
      <p className="admin-subtle">
        Berlaku untuk paket Diving, Snorkeling, Trip laut, dan sewa alat yang
        dipesan lewat website. Tamu memilih tarif saat checkout. Kenaikan
        dihitung dari harga paket atau sewa, tidak dari add-on dan pembelian.
        Tamu Comfort dan Flexi mengganti tanggal sendiri, tamu Flexi juga bisa
        membatalkan dengan refund sebesar harga dasar.
      </p>
      <div className="admin-form-grid">
        <label className="admin-dev-choice admin-agent-wide">
          <input
            type="checkbox"
            checked={f.enabled}
            onChange={(e) => updateFares("enabled", e.target.checked)}
          />
          <span>
            <strong>Tawarkan pilihan tarif</strong>
            <small>Matikan agar semua pesanan memakai tarif Standard.</small>
          </span>
        </label>
        {[
          ["comfort", "Comfort", "ganti tanggal sendiri"],
          ["flexi", "Flexi", "ganti tanggal dan refund"],
        ].map(([key, name, note]) => (
          <div className="admin-fare-tier" key={key}>
            <label className="admin-dev-choice">
              <input
                type="checkbox"
                checked={f[key].enabled}
                disabled={!f.enabled}
                onChange={(e) =>
                  updateFares(key, { ...f[key], enabled: e.target.checked })
                }
              />
              <span>
                <strong>{name}</strong>
                <small>{note}</small>
              </span>
            </label>
            <Field label={`Kenaikan ${name} (%)`}>
              <input
                type="number"
                min="1"
                max="100"
                disabled={!f.enabled || !f[key].enabled}
                value={fares?.[key]?.percent ?? f[key].percent}
                onChange={(e) =>
                  updateFares(key, {
                    ...f[key],
                    percent: number(e.target.value, f[key].percent),
                  })
                }
              />
            </Field>
          </div>
        ))}
        <Field label="Refund paling lambat (hari sebelum tanggal)">
          <input
            type="number"
            min="1"
            max="60"
            disabled={!f.enabled}
            value={fares?.refundDays ?? f.refundDays}
            onChange={(e) =>
              updateFares("refundDays", number(e.target.value, f.refundDays))
            }
          />
        </Field>
        <Field label="Ganti tanggal paling lambat (hari sebelum tanggal)">
          <input
            type="number"
            min="0"
            max="30"
            disabled={!f.enabled}
            value={fares?.rescheduleDays ?? f.rescheduleDays}
            onChange={(e) =>
              updateFares(
                "rescheduleDays",
                number(e.target.value, f.rescheduleDays),
              )
            }
          />
        </Field>
      </div>
      {f.enabled && (
        <div className="admin-fare-preview">
          <p className="admin-subtle">Yang dibaca tamu saat checkout.</p>
          <ul>
            {["standard", "comfort", "flexi"]
              .filter((tier) => tier === "standard" || f[tier].enabled)
              .map((tier) => (
                <li key={tier}>
                  <strong>
                    {words.names[tier]}
                    {tier !== "standard" && ` +${f[tier].percent}%`}
                  </strong>
                  <span>{words.rules[tier](f)}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// Package prices beside the homepage cards, one list per activity, and
// services offered only as add-ons. Each activity picks its add-ons from
// the other lists and from the Dive Shop rental gear ("products"), which
// has its own price, photos and stock in Dive Shop.
export default function PriceListEditor({
  priceList,
  products = [],
  update,
  fares,
  updateFares,
  onSave,
  busy,
}) {
  const [group, setGroup] = useState("diving");
  const items = priceList[group];
  const addOns = priceList.addOns ?? {};
  const chosen = addOns[group] ?? [];
  const sources = allPriceGroups.filter((key) => key !== group);
  const gear = products.filter((p) => p.rentalEnabled);
  // Every add-on that can be ticked, in the order they are offered: the
  // rental gear in the catalog's order, then the other lists.
  const order = [
    ...gear.map((p) => shopAddOn + p.id),
    ...sources.flatMap((key) => priceList[key].map((item) => item.id)),
  ];
  const known = new Set(order);
  const chosenCount = chosen.filter((id) => known.has(id)).length;
  function toggleAddOn(id, on) {
    const next = new Set(chosen.filter((key) => known.has(key)));
    if (on) next.add(id);
    else next.delete(id);
    update("addOns", {
      ...addOns,
      [group]: order.filter((key) => next.has(key)),
    });
  }
  function change(index, field, value, lang) {
    update(
      group,
      items.map((item, i) =>
        i !== index
          ? item
          : {
              ...item,
              [field]: lang ? { ...item[field], [lang]: value } : value,
            },
      ),
    );
  }
  function move(index, delta) {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    update(group, next);
  }
  const text = (index, field, lang, label, max, placeholder) => (
    <Field label={label}>
      <input
        maxLength={max}
        required={field === "name" && lang === "id"}
        placeholder={placeholder}
        value={items[index][field][lang]}
        onChange={(e) => change(index, field, e.target.value, lang)}
      />
    </Field>
  );
  return (
    <form onSubmit={onSave}>
      {updateFares && <FaresCard fares={fares} updateFares={updateFares} />}
      <div
        className="admin-activity-tabs"
        role="group"
        aria-label="Pilih daftar harga"
      >
        {allPriceGroups.map((key) => (
          <button
            type="button"
            key={key}
            aria-pressed={group === key}
            onClick={() => setGroup(key)}
          >
            {labels[key]}
          </button>
        ))}
      </div>
      <section className="admin-card">
        <h2>Daftar harga {labels[group]}</h2>
        <p className="admin-subtle">
          {intro(group)} Isi nama dan keterangan dalam dua bahasa. Kolom English
          yang kosong memakai teks Indonesia. Maksimal 8 item, harga dalam
          rupiah.
        </p>
        <p className="admin-subtle">
          Sewa alat tidak lagi di sini. Setiap alat sewa adalah produk Dive Shop
          dengan harga, foto, dan stok sewanya sendiri, dan pemakaiannya tampil
          di Kalender reservasi.
        </p>
        {items.map((item, index) => (
          <fieldset className="admin-price-item" key={index}>
            <legend>
              Item {index + 1}
              <span>
                <button
                  type="button"
                  className="admin-text-button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Naikkan item ${index + 1}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="admin-text-button"
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Turunkan item ${index + 1}`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="admin-text-button"
                  onClick={() => {
                    update(
                      group,
                      items.filter((_, i) => i !== index),
                    );
                    update(
                      "addOns",
                      Object.fromEntries(
                        Object.entries(addOns).map(([key, ids]) => [
                          key,
                          ids.filter((id) => id !== item.id),
                        ]),
                      ),
                    );
                  }}
                >
                  Hapus
                </button>
              </span>
            </legend>
            <div className="admin-form-grid">
              {text(index, "name", "id", "Nama (Indonesia)", 80)}
              {text(index, "name", "en", "Name (English)", 80)}
              {text(index, "info", "id", "Keterangan (Indonesia)", 160)}
              {text(index, "info", "en", "Info (English)", 160)}
              <Field label="Harga (Rp)">
                <input
                  type="number"
                  min="1"
                  max="1000000000"
                  required
                  value={item.price}
                  onChange={(e) =>
                    change(
                      index,
                      "price",
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                />
              </Field>
              {text(index, "unit", "id", "Satuan (Indonesia)", 20, "/ hari")}
              {text(index, "unit", "en", "Unit (English)", 20, "/ day")}
            </div>
          </fieldset>
        ))}
        <button
          type="button"
          className="admin-button secondary"
          disabled={items.length >= 8}
          onClick={() => update(group, [...items, blank(group)])}
        >
          + Tambah item
        </button>
        <button className="admin-button" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan daftar harga"}
        </button>
      </section>
      {priceGroups.includes(group) && (
        <section className="admin-card admin-addons">
          <h2>Add-on {labels[group]}</h2>
          <p className="admin-subtle">
            Centang alat sewa dan layanan yang ditawarkan sebagai tambahan di
            halaman {labels[group]}. Tamu menambahkannya bersama paket utama.
            Nama dan harganya diubah di asalnya. Alat sewa diatur di Dive Shop,
            disewa untuk tanggal aktivitasnya, dan memakai stok sewanya.
            Maksimal {addOnLimit} add-on, {chosenCount} dipilih.
          </p>
          {gear.length > 0 && (
            <fieldset className="admin-addon-group">
              <legend>Sewa alat dari Dive Shop</legend>
              {gear.map((p) => {
                const id = shopAddOn + p.id;
                const on = chosen.includes(id);
                const ready = rentalAddOn(p);
                return (
                  <label className="admin-check" key={p.id}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!on && (!ready || chosenCount >= addOnLimit)}
                      onChange={(e) => toggleAddOn(id, e.target.checked)}
                    />
                    <span>
                      {p.name}
                      <small>
                        {ready
                          ? `${formatIDR(p.rentalPrice, "id")} / hari`
                          : gearNote(p)}
                      </small>
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}
          {sources.map((key) =>
            priceList[key].length ? (
              <fieldset className="admin-addon-group" key={key}>
                <legend>{labels[key]}</legend>
                {priceList[key].map((item, index) => {
                  const on = chosen.includes(item.id);
                  return (
                    <label className="admin-check" key={item.id ?? index}>
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={
                          !item.id || (!on && chosenCount >= addOnLimit)
                        }
                        onChange={(e) => toggleAddOn(item.id, e.target.checked)}
                      />
                      <span>
                        {item.name.id || "Item tanpa nama"}
                        <small>
                          {Number(item.price) > 0
                            ? `${formatIDR(Number(item.price), "id")} ${item.unit.id}`
                            : "Belum ada harga"}
                        </small>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            ) : null,
          )}
          <button className="admin-button" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan add-on"}
          </button>
        </section>
      )}
    </form>
  );
}
