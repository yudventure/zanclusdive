"use client";
import { cloneElement, useId } from "react";
import { courseLimit, defaultCourses, partnerLimit } from "../course-model.js";
import { builtInPhotos } from "../photography.js";
import ImageUpload from "./ImageUpload.jsx";

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
  id: `kursus-${n}`,
  enabled: false,
  name: { ...empty },
  level: { ...empty },
  duration: { ...empty },
  depth: { ...empty },
  age: { ...empty },
  price: 1000000,
  unit: { id: "/ orang", en: "/ person" },
  summary: { ...empty },
  includes: [],
  requirements: { ...empty },
  image: "",
});

// Dive courses on the homepage and the /course page.
export default function CourseEditor({
  courses,
  media,
  update,
  onSave,
  busy,
  placePhoto,
  editPartners,
}) {
  const items = (courses ?? defaultCourses).items;
  const partners = courses?.partners ?? defaultCourses.partners;
  // Partner edits go through a function of the current list, so an upload
  // that finishes later still lands on the right partner.
  const changePartner = (index, patch) =>
    editPartners((list) =>
      list.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
  function movePartner(index, delta) {
    editPartners((list) => {
      const next = [...list];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });
  }
  const change = (index, patch) =>
    update(
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  function move(index, delta) {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    update(next);
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
            required={
              lang === "id" && ["name", "duration", "summary"].includes(field)
            }
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
  // "What you get" is edited as one line per point in each language.
  const includes = (index, lang) => (
    <Field
      key={"includes" + lang}
      label={`Yang didapat, satu per baris (${lang === "id" ? "Indonesia" : "English"})`}
    >
      <textarea
        rows="4"
        value={items[index].includes.map((x) => x[lang]).join("\n")}
        onChange={(e) => {
          const lines = e.target.value.split("\n").slice(0, 8);
          const other = lang === "id" ? "en" : "id";
          // Empty points are dropped when the course is saved.
          const length = Math.max(lines.length, items[index].includes.length);
          change(index, {
            includes: Array.from({ length }, (_, i) => ({
              [lang]: lines[i] ?? "",
              [other]: items[index].includes[i]?.[other] ?? "",
            })),
          });
        }}
      />
    </Field>
  );
  return (
    <form onSubmit={onSave}>
      <section className="admin-card">
        <h2>Kursus selam</h2>
        <p className="admin-subtle">
          Tampil di beranda (bagian kursus) dan di halaman /course. Urutan di
          sini menjadi urutan jalur belajar. Kolom English yang kosong memakai
          teks Indonesia. Maksimal {courseLimit} kursus.
        </p>
        {items.map((course, index) => (
          <fieldset className="admin-price-item" key={index}>
            <legend>
              {course.name.id || "Kursus baru"}
              <span>
                <button
                  type="button"
                  className="admin-text-button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Naikkan ${course.name.id || "kursus"}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="admin-text-button"
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Turunkan ${course.name.id || "kursus"}`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="admin-text-button"
                  onClick={() => update(items.filter((_, i) => i !== index))}
                >
                  Hapus
                </button>
              </span>
            </legend>
            <div className="admin-gallery-item">
              <div className="admin-gallery-photo">
                {course.image && (
                  <img src={course.image} alt={"Foto " + course.name.id} />
                )}
                <ImageUpload
                  compact
                  label={course.image ? "Ganti foto" : "Upload foto"}
                  onFile={(file) =>
                    placePhoto(file, (url) => change(index, { image: url }))
                  }
                />
              </div>
              <div className="admin-form-grid">
                <label className="admin-toggle">
                  <input
                    type="checkbox"
                    checked={course.enabled}
                    onChange={(e) =>
                      change(index, { enabled: e.target.checked })
                    }
                  />
                  Tampilkan di website
                </label>
                <Field label="Kode (untuk tautan /course#kode)">
                  <input
                    required
                    pattern="[a-z0-9\-]{2,40}"
                    value={course.id}
                    onChange={(e) =>
                      change(index, { id: e.target.value.toLowerCase() })
                    }
                  />
                </Field>
                {both(index, "name", "Nama kursus", 80)}
                {both(index, "level", "Level", 40)}
                <Field label="Harga (Rp)">
                  <input
                    type="number"
                    required
                    min="1"
                    max="1000000000"
                    value={course.price}
                    onChange={(e) => change(index, { price: e.target.value })}
                  />
                </Field>
                <span />
                {both(index, "unit", "Satuan harga", 20)}
                {both(index, "duration", "Durasi", 60)}
                {both(index, "depth", "Kedalaman", 40)}
                {both(index, "age", "Usia minimal", 40)}
                {both(index, "summary", "Ringkasan", 400, true)}
                {includes(index, "id")}
                {includes(index, "en")}
                {both(index, "requirements", "Syarat", 300, true)}
                <Field label="Foto dari koleksi atau URL">
                  <select
                    value=""
                    onChange={(e) =>
                      e.target.value && change(index, { image: e.target.value })
                    }
                  >
                    <option value="">Pilih foto…</option>
                    {media.length > 0 && (
                      <optgroup label="Foto yang diunggah">
                        {media.map((m) => (
                          <option value={m.url} key={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Foto bawaan website">
                      {builtInPhotos.map(([url, title]) => (
                        <option value={url} key={url}>
                          {title}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </Field>
              </div>
            </div>
          </fieldset>
        ))}
        <div className="admin-actions">
          <button
            type="button"
            className="admin-button secondary"
            disabled={items.length >= courseLimit}
            onClick={() => update([...items, blank(items.length + 1)])}
          >
            + Tambah kursus
          </button>
          <button className="admin-button" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan kursus"}
          </button>
        </div>
      </section>
      <section className="admin-card">
        <h2>Partner sertifikasi</h2>
        <p className="admin-subtle">
          Tampil sebagai running text di bagian kursus beranda dan di halaman
          /course, putih di atas foto gelap tanpa kartu atau bingkai. Upload logo
          resmi (PNG berlatar transparan) dari PC atau HP; tanpa logo, nama
          singkat tampil sebagai tulisan. Maksimal {partnerLimit} partner.
        </p>
        {partners.map((partner, index) => (
          <fieldset className="admin-price-item" key={index}>
            <legend>
              {partner.name || "Partner baru"}
              <span>
                <button
                  type="button"
                  className="admin-text-button"
                  disabled={index === 0}
                  onClick={() => movePartner(index, -1)}
                  aria-label={`Naikkan ${partner.name || "partner"}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="admin-text-button"
                  disabled={index === partners.length - 1}
                  onClick={() => movePartner(index, 1)}
                  aria-label={`Turunkan ${partner.name || "partner"}`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="admin-text-button"
                  onClick={() =>
                    editPartners((list) => list.filter((_, i) => i !== index))
                  }
                >
                  Hapus
                </button>
              </span>
            </legend>
            <div className="admin-gallery-item">
              <div className="admin-gallery-photo admin-partner-logo">
                <span className="admin-partner-preview">
                  {partner.logo ? (
                    <img src={partner.logo} alt={"Logo " + partner.name} />
                  ) : (
                    partner.name || "Logo"
                  )}
                </span>
                <ImageUpload
                  compact
                  label={partner.logo ? "Ganti logo" : "Upload logo"}
                  onFile={(file) =>
                    placePhoto(file, (url) =>
                      changePartner(index, { logo: url }),
                    )
                  }
                />
                {partner.logo && (
                  <button
                    type="button"
                    className="admin-inline"
                    onClick={() => changePartner(index, { logo: "" })}
                  >
                    Pakai tulisan saja
                  </button>
                )}
              </div>
              <div className="admin-form-grid">
                <Field label="Nama singkat (mis. PADI)">
                  <input
                    required
                    maxLength={30}
                    value={partner.name}
                    onChange={(e) =>
                      changePartner(index, { name: e.target.value })
                    }
                  />
                </Field>
                <span />
                {["id", "en"].map((lang) => (
                  <Field
                    key={lang}
                    label={`Nama lengkap (${lang === "id" ? "Indonesia" : "English"})`}
                  >
                    <input
                      maxLength={120}
                      value={partner.full[lang]}
                      onChange={(e) =>
                        changePartner(index, {
                          full: { ...partner.full, [lang]: e.target.value },
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
            </div>
          </fieldset>
        ))}
        <div className="admin-actions">
          <button
            type="button"
            className="admin-button secondary"
            disabled={partners.length >= partnerLimit}
            onClick={() =>
              editPartners((list) => [
                ...list,
                { name: "", full: { id: "", en: "" }, logo: "" },
              ])
            }
          >
            + Tambah partner
          </button>
          <button className="admin-button" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan partner"}
          </button>
        </div>
      </section>
    </form>
  );
}
