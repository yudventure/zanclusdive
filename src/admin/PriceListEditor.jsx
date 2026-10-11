"use client";
import { cloneElement, useId, useState } from "react";
import { priceGroups } from "../price-list.js";
import { activityLabels } from "../activity-model.js";

function Field({ label, children }) {
  const id = useId();
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
const blank = () => ({
  name: { id: "", en: "" },
  info: { id: "", en: "" },
  price: "",
  unit: { id: "/ hari", en: "/ day" },
});

// Package prices beside the homepage cards, one list per activity.
export default function PriceListEditor({ priceList, update, onSave, busy }) {
  const [group, setGroup] = useState("diving");
  const items = priceList[group];
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
        {priceGroups.map((key) => (
          <button
            type="button"
            key={key}
            aria-pressed={group === key}
            onClick={() => setGroup(key)}
          >
            {activityLabels[key]}
          </button>
        ))}
      </div>
      <section className="admin-card">
        <h2>Daftar harga {activityLabels[group]}</h2>
        <p className="admin-subtle">
          Tampil di samping kartu {activityLabels[group]} di beranda. Isi nama
          dan keterangan dalam dua bahasa; kolom English yang kosong memakai
          teks Indonesia. Maksimal 8 item; harga dalam rupiah.
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
                  onClick={() =>
                    update(
                      group,
                      items.filter((_, i) => i !== index),
                    )
                  }
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
          onClick={() => update(group, [...items, blank()])}
        >
          + Tambah item
        </button>
        <button className="admin-button" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan daftar harga"}
        </button>
      </section>
    </form>
  );
}
