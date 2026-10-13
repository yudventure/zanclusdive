"use client";
import { cloneElement, useEffect, useId, useRef, useState } from "react";
import { builtInPhotos } from "../photography.js";
import {
  defaultGallery,
  galleryLimit,
  videoLimit,
  videoPlatforms,
  videoSource,
} from "../gallery.js";
import ContactIcon from "../components/ContactIcon.jsx";
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

// What each platform does in the video row, shown under a recognised link.
const platformNotes = {
  youtube: "Berputar sendiri tanpa suara.",
  tiktok: "Berputar sendiri tanpa suara.",
  instagram:
    "Tampil dengan pemutar Instagram; pengunjung mengetuk untuk memutar karena Instagram tidak mengizinkan putar otomatis.",
  facebook:
    "Tampil dengan pemutar Facebook dan mulai tanpa suara; videonya harus publik.",
};

// Video links (YouTube, TikTok, Instagram, Facebook) for the 9:16 videos
// above the gallery button. Share links from the TikTok and Facebook apps
// are opened on the server and replaced by the full video link.
function VideoList({ videos, update, busy }) {
  const [opening, setOpening] = useState({});
  const latest = useRef(videos);
  const tried = useRef(new Set());
  latest.current = videos;
  const change = (index, patch) =>
    update(
      videos.map((video, i) => (i === index ? { ...video, ...patch } : video)),
    );
  function move(index, delta) {
    const next = [...videos];
    const [video] = next.splice(index, 1);
    next.splice(index + delta, 0, video);
    update(next);
  }
  async function open(url) {
    setOpening((current) => ({ ...current, [url]: "busy" }));
    try {
      const response = await fetch("/api/admin/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error || "Link pendek belum bisa dibuka.");
      update(
        latest.current.map((video) =>
          video.url.trim() === url ? { ...video, url: result.url } : video,
        ),
      );
      setOpening((current) => {
        const next = { ...current };
        delete next[url];
        return next;
      });
    } catch (error) {
      setOpening((current) => ({ ...current, [url]: error.message }));
    }
  }
  useEffect(() => {
    const timer = setTimeout(() => {
      for (const video of videos) {
        const url = video.url.trim();
        if (!videoSource(url)?.short || tried.current.has(url)) continue;
        tried.current.add(url);
        open(url);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [videos]); // eslint-disable-line react-hooks/exhaustive-deps
  function status(url, source) {
    const platform = videoPlatforms[source?.platform];
    if (!url)
      return "Tempel link video dari YouTube, TikTok, Instagram, atau Facebook.";
    if (!source)
      return "Link belum dikenali. Salin link dari tombol Bagikan / Salin tautan di aplikasi YouTube, TikTok, Instagram, atau Facebook.";
    if (source.short)
      return opening[url] && opening[url] !== "busy"
        ? opening[url]
        : `Membuka link pendek ${platform}…`;
    return `Link ${platform} dikenali. ${platformNotes[source.platform]} Simpan untuk menampilkan.`;
  }
  return (
    <section className="admin-card">
      <h2>Video vertikal (9:16)</h2>
      <p className="admin-subtle">
        Video vertikal di bawah dua kartu Jelajahi laut, di atas tombol Buka
        galeri. Tempel link dari YouTube (Shorts atau video biasa), TikTok,
        Instagram (Reels), atau Facebook (Reels atau video). Video tetap di
        platformnya, jadi website tidak berat. Link pendek dari tombol Bagikan
        di aplikasi otomatis dibuka menjadi link lengkap. Maksimal {videoLimit}{" "}
        video.
      </p>
      <div className="admin-gallery-list">
        {videos.map((video, index) => {
          const url = video.url.trim();
          const source = videoSource(url);
          const ready = source && !source.short;
          return (
            <fieldset className="admin-price-item" key={index}>
              <legend>
                Video {index + 1}
                <span>
                  <button
                    type="button"
                    className="admin-text-button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Naikkan video ${index + 1}`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="admin-text-button"
                    disabled={index === videos.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Turunkan video ${index + 1}`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="admin-text-button"
                    onClick={() => update(videos.filter((_, i) => i !== index))}
                  >
                    Hapus
                  </button>
                </span>
              </legend>
              <div className="admin-gallery-item admin-video-item">
                <div
                  className="admin-video-preview"
                  data-platform={source?.platform}
                >
                  {ready && source.platform === "youtube" ? (
                    <img
                      src={`https://i.ytimg.com/vi/${source.id}/hqdefault.jpg`}
                      alt={"Preview video " + (index + 1)}
                    />
                  ) : source ? (
                    <span className="admin-video-platform">
                      <ContactIcon name={source.platform} />
                      {videoPlatforms[source.platform]}
                    </span>
                  ) : (
                    <span>9:16</span>
                  )}
                </div>
                <div className="admin-form-grid">
                  <Field label="Link video">
                    <input
                      required
                      maxLength={300}
                      inputMode="url"
                      placeholder="https://youtube.com/shorts/… · tiktok.com/@akun/video/… · instagram.com/reel/…"
                      value={video.url}
                      onChange={(e) => change(index, { url: e.target.value })}
                    />
                  </Field>
                  <p
                    className={
                      "admin-subtle admin-video-status" +
                      (url &&
                      !ready &&
                      opening[url] !== "busy" &&
                      (!source || opening[url])
                        ? " warn"
                        : "")
                    }
                  >
                    {status(url, source)}
                  </p>
                  <Field label="Keterangan (Indonesia)">
                    <input
                      maxLength={120}
                      value={video.caption.id}
                      onChange={(e) =>
                        change(index, {
                          caption: { ...video.caption, id: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field label="Caption (English)">
                    <input
                      maxLength={120}
                      value={video.caption.en}
                      onChange={(e) =>
                        change(index, {
                          caption: { ...video.caption, en: e.target.value },
                        })
                      }
                    />
                  </Field>
                </div>
              </div>
            </fieldset>
          );
        })}
      </div>
      <button
        type="button"
        className="admin-button secondary"
        disabled={videos.length >= videoLimit}
        onClick={() =>
          update([...videos, { url: "", caption: { id: "", en: "" } }])
        }
      >
        + Tambah video
      </button>
      <button className="admin-button" disabled={busy}>
        {busy ? "Menyimpan…" : "Simpan video"}
      </button>
    </section>
  );
}

// Photos of the dive gallery under the ocean cards on the homepage, and the
// videos shown above its button.
export default function GalleryEditor({
  gallery,
  media,
  update,
  updateVideos,
  onSave,
  busy,
  placePhoto,
  addPhoto,
}) {
  const items = (gallery ?? defaultGallery).items;
  const videos = gallery?.videos ?? [];
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
      <VideoList videos={videos} update={updateVideos} busy={busy} />
    </form>
  );
}
