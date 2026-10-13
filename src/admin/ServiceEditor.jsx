"use client";
import { cloneElement, useId } from "react";
import { defaultService, serviceLimit } from "../service-model.js";
import PhotoField from "./PhotoField.jsx";

function Field({ label, children }) {
  const id = useId();
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
const empty = { id: "", en: "" };
const blank = (n) => ({
  id: `servis-${n}`,
  enabled: false,
  name: { ...empty },
  summary: { ...empty },
  duration: { ...empty },
  price: 100000,
  unit: { id: "/ unit", en: "/ unit" },
});

// Dive gear servicing on /service: the cover photo and each service with
// its starting price.
export default function ServiceEditor({
  service,
  media,
  updateItems,
  setImage,
  onSave,
  busy,
  placePhoto,
}) {
  const { items, image } = service ?? defaultService;
  const change = (index, patch) =>
    updateItems(
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  function move(index, delta) {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    updateItems(next);
  }
  const both = (index, field, label, max, area) =>
    ["id", "en"].map((lang) => {
      const Input = area ? "textarea" : "input";
      return (
        <Field
          key={field + lang}
          label={`${label} (${lang === "id" ? "Indonesia" : "English"})`}
        >
          <Input
            rows={area ? 3 : undefined}
            maxLength={max}
            required={lang === "id" && ["name", "summary"].includes(field)}
            value={items[index][field][lang]}
            onChange={(e) =>
              change(index, {
                [field]: { ...items[index][field], [lang]: e.target.value },
              })
            }
          />
        </Field>
      );
    });
  return (
    <form onSubmit={onSave}>
      <section className="admin-card">
        <h2>Servis alat selam</h2>
        <p className="admin-subtle">
          Tampil di /service, di menu Dive Shop, dan di halaman Tentang kami.
          Harga tampil sebagai &ldquo;Mulai&rdquo;. Kolom English yang kosong
          memakai teks Indonesia. Maksimal {serviceLimit} servis.
        </p>
        <div className="admin-photo-row">
          <PhotoField
            label="Foto sampul servis"
            value={image}
            media={media}
            onChange={setImage}
            placePhoto={placePhoto}
          />
          <p className="admin-subtle">
            Foto bengkel atau alat yang sedang diservis membuat halaman ini
            lebih meyakinkan. Tekan Ganti foto lalu pilih dari PC atau HP.
          </p>
        </div>
        {items.map((item, index) => (
          <fieldset className="admin-price-item" key={index}>
            <legend>
              {item.name.id || "Servis baru"}
              <span>
                <button
                  type="button"
                  className="admin-text-button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Naikkan ${item.name.id || "servis"}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="admin-text-button"
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Turunkan ${item.name.id || "servis"}`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="admin-text-button"
                  onClick={() =>
                    updateItems(items.filter((_, i) => i !== index))
                  }
                >
                  Hapus
                </button>
              </span>
            </legend>
            <div className="admin-form-grid">
              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => change(index, { enabled: e.target.checked })}
                />
                Tampilkan di website
              </label>
              <Field label="Kode (untuk tautan /service#kode)">
                <input
                  required
                  pattern="[a-z0-9\-]{2,40}"
                  value={item.id}
                  onChange={(e) =>
                    change(index, { id: e.target.value.toLowerCase() })
                  }
                />
              </Field>
              {both(index, "name", "Nama servis", 80)}
              <Field label="Harga mulai (Rp)">
                <input
                  type="number"
                  required
                  min="1"
                  max="1000000000"
                  value={item.price}
                  onChange={(e) => change(index, { price: e.target.value })}
                />
              </Field>
              <span />
              {both(index, "unit", "Satuan harga", 20)}
              {both(index, "duration", "Lama pengerjaan", 60)}
              {both(index, "summary", "Keterangan", 300, true)}
            </div>
          </fieldset>
        ))}
        <div className="admin-actions">
          <button
            type="button"
            className="admin-button secondary"
            disabled={items.length >= serviceLimit}
            onClick={() => updateItems([...items, blank(items.length + 1)])}
          >
            + Tambah servis
          </button>
          <button className="admin-button" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan servis"}
          </button>
        </div>
      </section>
    </form>
  );
}
