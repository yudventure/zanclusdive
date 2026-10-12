"use client";
import { cloneElement, useId } from "react";
import { builtInPhotos } from "../photography.js";
import { defaultGallery, galleryLimit } from "../gallery.js";
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

// Photos of the dive gallery under the ocean cards on the homepage.
export default function GalleryEditor({
  gallery,
  media,
  update,
  onSave,
  busy,
  placePhoto,
  addPhoto,
}) {
  const items = (gallery ?? defaultGallery).items;
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
  return (
    <form onSubmit={onSave}>
      <section className="admin-card">
        <h2>Galeri penyelaman</h2>
        <p className="admin-subtle">
          Foto yang terbuka saat pengunjung menekan Buka galeri di bagian
          Jelajahi laut. Upload foto dari komputer atau HP, langsung tampil di
          galeri. Maksimal {galleryLimit} foto, keterangan English boleh kosong.
        </p>
        {items.length < galleryLimit && (
          <ImageUpload
            multiple
            label="Tambah foto ke galeri"
            hint="Bisa pilih beberapa foto sekaligus · langsung tampil"
            onFile={(file) => placePhoto(file, addPhoto)}
          />
        )}
        <div className="admin-gallery-list">
          {items.map((item, index) => (
            <fieldset className="admin-price-item" key={index}>
              <legend>
                Foto {index + 1}
                <span>
                  <button
                    type="button"
                    className="admin-text-button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Naikkan foto ${index + 1}`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="admin-text-button"
                    disabled={index === items.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Turunkan foto ${index + 1}`}
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
                  {item.src && (
                    <img src={item.src} alt={"Preview foto " + (index + 1)} />
                  )}
                  <ImageUpload
                    compact
                    label={item.src ? "Ganti foto" : "Upload foto"}
                    onFile={(file) =>
                      placePhoto(file, (url) => change(index, { src: url }))
                    }
                  />
                </div>
                <div className="admin-form-grid">
                  <Field label="URL foto">
                    <input
                      required
                      maxLength={1200}
                      placeholder="URL HTTPS atau /api/media/…"
                      value={item.src}
                      onChange={(e) => change(index, { src: e.target.value })}
                    />
                  </Field>
                  <Field label="Atau pilih dari koleksi">
                    <select
                      value=""
                      onChange={(e) =>
                        e.target.value && change(index, { src: e.target.value })
                      }
                    >
                      <option value="">Pilih foto…</option>
                      {media.length > 0 && (
                        <optgroup label="Media library">
                          {media.map((m) => (
                            <option value={m.url} key={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Visual konsep bawaan">
                        {builtInPhotos.map(([url, title]) => (
                          <option value={url} key={url}>
                            {title}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </Field>
                  <Field label="Keterangan (Indonesia)">
                    <input
                      maxLength={120}
                      value={item.caption.id}
                      onChange={(e) =>
                        change(index, {
                          caption: { ...item.caption, id: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field label="Caption (English)">
                    <input
                      maxLength={120}
                      value={item.caption.en}
                      onChange={(e) =>
                        change(index, {
                          caption: { ...item.caption, en: e.target.value },
                        })
                      }
                    />
                  </Field>
                </div>
              </div>
            </fieldset>
          ))}
        </div>
        <button
          type="button"
          className="admin-button secondary"
          disabled={items.length >= galleryLimit}
          onClick={() =>
            update([...items, { src: "", caption: { id: "", en: "" } }])
          }
        >
          + Tambah foto
        </button>
        <button className="admin-button" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan galeri"}
        </button>
      </section>
    </form>
  );
}
