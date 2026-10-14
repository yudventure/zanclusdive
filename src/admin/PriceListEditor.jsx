"use client";
import { cloneElement, useId, useState } from "react";
import {
  addOnLimit,
  allPriceGroups,
  extraLabels,
  priceGroups,
  rentalLabels,
} from "../price-list.js";
import { activityLabels } from "../activity-model.js";
import { formatIDR } from "../i18n.js";

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

const labels = { ...activityLabels, ...rentalLabels, ...extraLabels };
const intro = (group) =>
  activityLabels[group]
    ? `Layanan utama ${activityLabels[group]}. Tampil sebagai paket di halaman ${activityLabels[group]} dan di samping kartu ${activityLabels[group]} di beranda.`
    : extraLabels[group]
      ? "Tidak tampil sendiri. Dipakai sebagai add-on di halaman aktivitas, misalnya dokumentasi, antar jemput mobil, atau catering."
      : "Tampil di bagian Dive Shop beranda, dan bisa ditawarkan sebagai add-on aktivitas.";

// Package prices beside the homepage cards, one list per activity, the
// gear rental lists in the homepage Dive Shop section, and services offered
// only as add-ons. Each activity picks its add-ons from the other lists.
export default function PriceListEditor({ priceList, update, onSave, busy }) {
  const [group, setGroup] = useState("diving");
  const items = priceList[group];
  const addOns = priceList.addOns ?? {};
  const chosen = addOns[group] ?? [];
  const sources = allPriceGroups.filter((key) => key !== group);
  const known = new Set(
    sources.flatMap((key) => priceList[key].map((item) => item.id)),
  );
  const chosenCount = chosen.filter((id) => known.has(id)).length;
  // Ticked add-ons keep the order of the lists they come from.
  function toggleAddOn(id, on) {
    const next = new Set(chosen.filter((key) => known.has(key)));
    if (on) next.add(id);
    else next.delete(id);
    update("addOns", {
      ...addOns,
      [group]: sources.flatMap((key) =>
        priceList[key].map((item) => item.id).filter((key) => next.has(key)),
      ),
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
            Centang alat dan layanan dari daftar lain yang ditawarkan sebagai
            tambahan di halaman {labels[group]}. Tamu menambahkannya bersama
            paket utama. Nama dan harganya diubah di daftar asalnya. Maksimal{" "}
            {addOnLimit} add-on, {chosenCount} dipilih.
          </p>
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
