"use client";
import { cloneElement, useId, useState } from "react";
import { activityKeys, activityLabels } from "../activity-model.js";

function Field({ label, children }) {
  const id = useId();
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
export default function ActivitiesEditor({
  activities,
  update,
  onSave,
  busy,
  media,
}) {
  const [active, setActive] = useState("diving");
  const activity = activities[active];
  function change(key, value) {
    update(active, { ...activity, [key]: value });
  }
  function changeItem(group, index, key, value) {
    change(
      group,
      activity[group].map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    );
  }
  return (
    <form onSubmit={onSave}>
      <div className="admin-activity-tabs" aria-label="Pilih halaman aktivitas">
        {activityKeys.map((key) => (
          <button
            type="button"
            key={key}
            aria-pressed={active === key}
            onClick={() => setActive(key)}
          >
            {activityLabels[key]}
          </button>
        ))}
      </div>
      <section className="admin-card">
        <div className="admin-card-heading">
          <h2>Halaman {activityLabels[active]}</h2>
          <label className="admin-toggle">
            <input
              type="checkbox"
              checked={activity.enabled}
              onChange={(e) => change("enabled", e.target.checked)}
            />{" "}
            Tampilkan di website
          </label>
        </div>
        <p className="admin-subtle">
          Halaman /{active} terhubung dari kartu di seksi Pengalaman dan footer.
          Jika dinonaktifkan, tautannya disembunyikan dan halaman tidak dapat
          dibuka.
        </p>
        <a
          className="admin-button secondary"
          href={`/${active}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Lihat halaman ↗
        </a>
        <div className="admin-form">
          <Field label="Judul halaman">
            <input
              required
              maxLength={150}
              value={activity.title}
              onChange={(e) => change("title", e.target.value)}
            />
          </Field>
          <Field label="Ringkasan untuk hero & kartu beranda">
            <textarea
              required
              rows="3"
              maxLength={500}
              value={activity.summary}
              onChange={(e) => change("summary", e.target.value)}
            />
          </Field>
          <Field label="Deskripsi lengkap">
            <textarea
              required
              rows="5"
              maxLength={2000}
              value={activity.description}
              onChange={(e) => change("description", e.target.value)}
            />
          </Field>
          <div className="admin-form-grid">
            <Field label="Untuk siapa">
              <input
                required
                maxLength={150}
                value={activity.audience}
                onChange={(e) => change("audience", e.target.value)}
              />
            </Field>
            <Field label="Durasi">
              <input
                required
                maxLength={150}
                value={activity.duration}
                onChange={(e) => change("duration", e.target.value)}
              />
            </Field>
            <Field label="Titik temu">
              <input
                required
                maxLength={250}
                value={activity.meetingPoint}
                onChange={(e) => change("meetingPoint", e.target.value)}
              />
            </Field>
            <Field label="Harga mulai per orang (Rp, kosong = penawaran)">
              <input
                type="number"
                min="1"
                max="1000000000"
                step="1"
                value={activity.price ?? ""}
                onChange={(e) =>
                  change(
                    "price",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            </Field>
          </div>
          <Field label="Sorotan aktivitas (1–8 poin, satu per baris)">
            <textarea
              rows="4"
              required
              value={activity.highlights.join("\n")}
              onChange={(e) => change("highlights", e.target.value.split("\n"))}
            />
          </Field>
          <Field label="Persiapan (1–8 poin, satu per baris)">
            <textarea
              rows="5"
              required
              value={activity.preparations.join("\n")}
              onChange={(e) =>
                change("preparations", e.target.value.split("\n"))
              }
            />
          </Field>
        </div>
      </section>
      <section className="admin-card">
        <h2>Foto halaman & kartu</h2>
        <div className="admin-form">
          <Field label="URL foto">
            <input
              required
              maxLength={1200}
              value={activity.image}
              onChange={(e) => change("image", e.target.value)}
            />
          </Field>
          <Field label="Pilih dari media atau aset website">
            <select
              value=""
              onChange={(e) =>
                e.target.value && change("image", e.target.value)
              }
            >
              <option value="">Pilih foto…</option>
              <option value="/assets/hero.webp">Konsep diving</option>
              <option value="/assets/reef.webp">Konsep kehidupan laut</option>
              <option value="/assets/ocean.webp">Konsep laut</option>
              {media.map((item) => (
                <option value={item.url} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Deskripsi foto / caption">
            <input
              required
              maxLength={250}
              value={activity.imageAlt}
              onChange={(e) => change("imageAlt", e.target.value)}
            />
          </Field>
          <p className="admin-subtle">
            Unggah foto di Foto & media terlebih dahulu, lalu pilih di sini.
            Deskripsi foto tampil sebagai caption dan teks alternatif gambar.
          </p>
        </div>
      </section>
      <section className="admin-card">
        <h2>Alur kegiatan</h2>
        <p className="admin-subtle">
          Isi 1–8 langkah. Sesuaikan dengan program dan perjalanan yang
          benar-benar tersedia.
        </p>
        {activity.itinerary.map((step, index) => (
          <div className="admin-activity-item" key={index}>
            <div className="admin-card-heading">
              <h3>Langkah {index + 1}</h3>
              <button
                type="button"
                className="admin-button secondary"
                disabled={activity.itinerary.length === 1}
                onClick={() =>
                  change(
                    "itinerary",
                    activity.itinerary.filter((_, i) => i !== index),
                  )
                }
              >
                Hapus langkah
              </button>
            </div>
            <Field label={`Judul langkah ${index + 1}`}>
              <input
                required
                maxLength={120}
                value={step.title}
                onChange={(e) =>
                  changeItem("itinerary", index, "title", e.target.value)
                }
              />
            </Field>
            <Field label={`Deskripsi langkah ${index + 1}`}>
              <textarea
                required
                rows="2"
                maxLength={500}
                value={step.description}
                onChange={(e) =>
                  changeItem("itinerary", index, "description", e.target.value)
                }
              />
            </Field>
          </div>
        ))}
        <button
          type="button"
          className="admin-button secondary"
          disabled={activity.itinerary.length >= 8}
          onClick={() =>
            change("itinerary", [
              ...activity.itinerary,
              { title: "", description: "" },
            ])
          }
        >
          + Tambah langkah
        </button>
      </section>
      <section className="admin-card">
        <h2>Pertanyaan umum</h2>
        <p className="admin-subtle">
          Isi 1–6 pertanyaan yang membantu tamu menyiapkan kegiatannya.
        </p>
        {activity.faqs.map((faq, index) => (
          <div className="admin-activity-item" key={index}>
            <div className="admin-card-heading">
              <h3>Pertanyaan {index + 1}</h3>
              <button
                type="button"
                className="admin-button secondary"
                disabled={activity.faqs.length === 1}
                onClick={() =>
                  change(
                    "faqs",
                    activity.faqs.filter((_, i) => i !== index),
                  )
                }
              >
                Hapus pertanyaan
              </button>
            </div>
            <Field label={`Pertanyaan ${index + 1}`}>
              <input
                required
                maxLength={250}
                value={faq.question}
                onChange={(e) =>
                  changeItem("faqs", index, "question", e.target.value)
                }
              />
            </Field>
            <Field label={`Jawaban ${index + 1}`}>
              <textarea
                required
                rows="3"
                maxLength={1000}
                value={faq.answer}
                onChange={(e) =>
                  changeItem("faqs", index, "answer", e.target.value)
                }
              />
            </Field>
          </div>
        ))}
        <button
          type="button"
          className="admin-button secondary"
          disabled={activity.faqs.length >= 6}
          onClick={() =>
            change("faqs", [...activity.faqs, { question: "", answer: "" }])
          }
        >
          + Tambah pertanyaan
        </button>
      </section>
      <div className="admin-actions">
        <button className="admin-button" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan halaman aktivitas"}
        </button>
        <span className="admin-subtle">
          Menyimpan perubahan pada ketiga halaman.
        </span>
      </div>
    </form>
  );
}
