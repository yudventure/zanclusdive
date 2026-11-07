"use client";
import { useState } from "react";
import { Field } from "./fields.jsx";
import {
  defaultLegal,
  legalKeys,
  legalLabels,
  legalPaths,
  sectionLimit,
} from "../legal-model.js";

const languages = [
  ["id", "Indonesia"],
  ["en", "English"],
];
const today = () => new Date().toLocaleDateString("sv-SE");
const blank = () => ({
  heading: { id: "", en: "" },
  body: { id: "", en: "" },
});

// The three policy pages linked in the website footer: terms and
// conditions, privacy policy, and the reschedule and refund policy. One
// page at a time, with its title, introduction and sections.
export default function LegalEditor({ legal, update, onSave, busy }) {
  const [kind, setKind] = useState("terms");
  const all = legal ?? defaultLegal;
  const page = all[kind];
  const setPage = (patch) => update({ [kind]: { ...page, ...patch } });
  const both = (field, label, max, rows, required) =>
    languages.map(([lang, name]) => {
      const Input = rows ? "textarea" : "input";
      return (
        <Field key={field + lang} label={`${label} (${name})`}>
          <Input
            rows={rows || undefined}
            maxLength={max}
            required={required && lang === "id"}
            value={page[field][lang]}
            onChange={(e) =>
              setPage({ [field]: { ...page[field], [lang]: e.target.value } })
            }
          />
        </Field>
      );
    });
  const setSections = (sections) => setPage({ sections });
  const change = (index, field, lang, text) =>
    setSections(
      page.sections.map((s, i) =>
        i === index ? { ...s, [field]: { ...s[field], [lang]: text } } : s,
      ),
    );
  const move = (index, delta) => {
    const next = [...page.sections];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setSections(next);
  };
  return (
    <form onSubmit={onSave} className="admin-legal">
      <section className="admin-card">
        <h2>Judul dan pengantar</h2>
        <p className="admin-subtle">
          Tiga halaman yang tautannya ada di kaki website. Syarat dan ketentuan
          di /terms, Kebijakan privasi di /privacy, dan Kebijakan reschedule &
          refund di /refund. Kolom English yang kosong memakai teks Indonesia.
          Teks awalnya draf, periksa dan sesuaikan dengan usaha Zanclus sebelum
          dipakai.
        </p>
        <div
          className="admin-activity-tabs"
          role="group"
          aria-label="Halaman kebijakan"
        >
          {legalKeys.map((key) => (
            <button
              type="button"
              key={key}
              aria-pressed={kind === key}
              onClick={() => setKind(key)}
            >
              {legalLabels[key].id}
            </button>
          ))}
        </div>
        <div className="admin-form-grid admin-legal-meta">
          <Field
            label="Terakhir diperbarui"
            hint="Tampil di bawah judul ketiga halaman. Ganti setiap kali isinya berubah."
          >
            <input
              type="date"
              required
              value={all.updated}
              onChange={(e) => update({ updated: e.target.value })}
            />
          </Field>
          <div className="admin-legal-links">
            <button
              type="button"
              className="admin-button secondary"
              onClick={() => update({ updated: today() })}
            >
              Pakai tanggal hari ini
            </button>
            <a
              className="admin-inline"
              href={"/id" + legalPaths[kind]}
              target="_blank"
              rel="noopener noreferrer"
            >
              Lihat halaman ↗
            </a>
          </div>
        </div>
        <div className="admin-form-grid">
          {both("title", "Judul", 120, 0, true)}
          {both("intro", "Pengantar", 1000, 4)}
        </div>
        {kind === "refund" && (
          <p className="admin-subtle admin-legal-note">
            Kartu tarif Standard, Comfort, dan Flexi tampil otomatis di atas
            bagian pertama, mengikuti pengaturan tarif di Daftar harga. Kenaikan
            persen dan batas hari selalu sama dengan yang dipakai saat checkout.
          </p>
        )}
      </section>
      <section className="admin-card">
        <h2>Bagian {legalLabels[kind].id}</h2>
        <p className="admin-subtle">
          Maksimal {sectionLimit} bagian. Pisahkan paragraf dengan baris kosong.
          Baris yang diawali tanda - menjadi daftar berpoin.
        </p>
        {page.sections.map((s, index) => (
          <fieldset className="admin-price-item" key={index}>
            <legend>
              {s.heading.id || "Bagian baru"}
              <span>
                <button
                  type="button"
                  className="admin-text-button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Naikkan bagian ${index + 1}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="admin-text-button"
                  disabled={index === page.sections.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Turunkan bagian ${index + 1}`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="admin-text-button"
                  onClick={() =>
                    setSections(page.sections.filter((_, i) => i !== index))
                  }
                >
                  Hapus
                </button>
              </span>
            </legend>
            <div className="admin-form-grid">
              {languages.map(([lang, name]) => (
                <Field key={"heading" + lang} label={`Judul bagian (${name})`}>
                  <input
                    maxLength={120}
                    required={lang === "id"}
                    value={s.heading[lang]}
                    onChange={(e) =>
                      change(index, "heading", lang, e.target.value)
                    }
                  />
                </Field>
              ))}
              {languages.map(([lang, name]) => (
                <Field key={"body" + lang} label={`Isi (${name})`}>
                  <textarea
                    rows={8}
                    maxLength={4000}
                    required={lang === "id"}
                    value={s.body[lang]}
                    onChange={(e) =>
                      change(index, "body", lang, e.target.value)
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
            disabled={page.sections.length >= sectionLimit}
            onClick={() => setSections([...page.sections, blank()])}
          >
            + Tambah bagian
          </button>
          <button
            type="button"
            className="admin-button secondary"
            onClick={() => {
              if (
                window.confirm(
                  `Kembalikan ${legalLabels[kind].id} ke teks awal? Perubahan yang belum disimpan hilang.`,
                )
              )
                setPage(structuredClone(defaultLegal[kind]));
            }}
          >
            Kembalikan teks awal
          </button>
          <button className="admin-button" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan halaman kebijakan"}
          </button>
        </div>
      </section>
    </form>
  );
}
