"use client";
import { cloneElement, useId } from "react";
import { defaultAbout, valueLimit } from "../about-model.js";
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
const languages = [
  ["id", "Indonesia"],
  ["en", "English"],
];

// The About page (/about): photo, title, introduction, story and values.
export default function AboutEditor({
  about,
  media,
  update,
  onSave,
  busy,
  placePhoto,
}) {
  const page = about ?? defaultAbout;
  const both = (field, label, max, rows, required) =>
    languages.map(([lang, name]) => {
      const Input = rows ? "textarea" : "input";
      return (
        <Field key={field + lang} label={`${label} (${name})`}>
          <Input
            rows={rows}
            maxLength={max}
            required={required && lang === "id"}
            value={page[field][lang]}
            onChange={(e) =>
              update({ [field]: { ...page[field], [lang]: e.target.value } })
            }
          />
        </Field>
      );
    });
  const changeValue = (index, field, lang, text) =>
    update({
      values: page.values.map((v, i) =>
        i === index ? { ...v, [field]: { ...v[field], [lang]: text } } : v,
      ),
    });
  return (
    <form onSubmit={onSave}>
      <section className="admin-card">
        <h2>Halaman Tentang kami</h2>
        <p className="admin-subtle">
          Tampil di /about dan di menu utama. Kolom English yang kosong memakai
          teks Indonesia. Ceritakan siapa Zanclus, sejak kapan, dan siapa
          timnya.
        </p>
        <div className="admin-photo-row">
          <PhotoField
            label="Foto sampul Tentang kami"
            value={page.image}
            media={media}
            onChange={(url) => update({ image: url })}
            placePhoto={placePhoto}
          />
          <div className="admin-form-grid">
            {both("title", "Judul", 120, 0, true)}
            {both("intro", "Pengantar singkat", 300, 3)}
          </div>
        </div>
        <div className="admin-form-grid">
          {both(
            "story",
            "Cerita (pisahkan paragraf dengan baris kosong)",
            4000,
            10,
            true,
          )}
        </div>
        <div className="admin-actions">
          <button className="admin-button" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan Tentang kami"}
          </button>
        </div>
      </section>
      <section className="admin-card">
        <h2>Yang kami pegang</h2>
        <p className="admin-subtle">
          Nilai atau janji Zanclus, tampil sebagai kartu bernomor. Maksimal{" "}
          {valueLimit} poin; poin tanpa judul tidak ditampilkan.
        </p>
        {page.values.map((value, index) => (
          <fieldset className="admin-price-item" key={index}>
            <legend>
              {value.title.id || "Poin baru"}
              <span>
                <button
                  type="button"
                  className="admin-text-button"
                  onClick={() =>
                    update({
                      values: page.values.filter((_, i) => i !== index),
                    })
                  }
                >
                  Hapus
                </button>
              </span>
            </legend>
            <div className="admin-form-grid">
              {languages.map(([lang, name]) => (
                <Field key={"title" + lang} label={`Judul (${name})`}>
                  <input
                    maxLength={60}
                    value={value.title[lang]}
                    onChange={(e) =>
                      changeValue(index, "title", lang, e.target.value)
                    }
                  />
                </Field>
              ))}
              {languages.map(([lang, name]) => (
                <Field key={"text" + lang} label={`Keterangan (${name})`}>
                  <textarea
                    rows="2"
                    maxLength={240}
                    value={value.text[lang]}
                    onChange={(e) =>
                      changeValue(index, "text", lang, e.target.value)
                    }
                  />
                </Field>
              ))}
            </div>
          </fieldset>
        ))}
        <div className="admin-actions">
          <button
            type="button"
            className="admin-button secondary"
            disabled={page.values.length >= valueLimit}
            onClick={() =>
              update({
                values: [
                  ...page.values,
                  { title: { id: "", en: "" }, text: { id: "", en: "" } },
                ],
              })
            }
          >
            + Tambah poin
          </button>
          <button className="admin-button" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan poin"}
          </button>
        </div>
      </section>
    </form>
  );
}
