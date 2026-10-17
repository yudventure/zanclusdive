"use client";
import { cloneElement, useId, useState } from "react";
import {
  activeBanners,
  blankBanner,
  calendarLimits,
  defaultCalendar,
  eventTypeLabels,
  eventTypes,
  seasonRatingLabels,
  seasonRatings,
} from "../calendar-model.js";
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
const months = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const tabs = {
  banners: "Banner event",
  events: "Kegiatan",
  seasons: "Musim",
  spots: "Spot populer",
  eco: "Peduli lingkungan",
};
const blank = {
  banners: blankBanner,
  events: () => ({
    date: "",
    type: "dive",
    place: "",
    title: { id: "", en: "" },
    description: { id: "", en: "" },
  }),
  spots: () => ({
    name: "",
    best: { id: "", en: "" },
    note: { id: "", en: "" },
  }),
  eco: () => ({
    title: { id: "", en: "" },
    when: { id: "", en: "" },
    description: { id: "", en: "" },
  }),
};

const todayWIT = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jayapura" });

// The public activity calendar page: dated activities, season guide,
// popular spots and ocean care plans; and the event banners on the
// homepage. Banner photos are uploaded and saved in one step; editBanners
// takes a function of the current list so an upload that finishes later
// lands on the right banner.
export default function CalendarEditor({
  calendar,
  update,
  onSave,
  busy,
  media = [],
  placePhoto,
  editBanners,
}) {
  const [tab, setTab] = useState("events");
  const data = { ...defaultCalendar, ...calendar };
  const items = data[tab];
  const change = (index, patch) =>
    update(
      tab,
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
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
            required={lang === "id" && field === "title"}
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
  const remove = (index) =>
    update(
      tab,
      items.filter((_, i) => i !== index),
    );
  return (
    <form onSubmit={onSave}>
      <div
        className="admin-activity-tabs"
        role="group"
        aria-label="Bagian kalender"
      >
        {Object.entries(tabs).map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="admin-card">
        <h2>Kalender kegiatan · {tabs[tab]}</h2>
        {tab === "banners" ? (
          <p className="admin-subtle">
            Banner lebar di beranda, di atas kartu Diving, Snorkeling, dan Trip
            laut. Banner hanya tampil bila <b>Tampilkan</b> dicentang, mulai
            tanggal <b>Mulai tampil</b> (atau langsung) sampai{" "}
            <b>Tanggal selesai</b> event, lalu hilang sendiri. Tanpa tanggal
            selesai, banner tampil sampai dimatikan. Maksimal 2 banner tampil
            bersamaan. <b>Flyer</b> tampil kecil di kiri dan bisa dibuka penuh.
            <b>Foto latar</b> yang opsional mengisi banner di belakang tulisan.
            Harga ditulis dalam rupiah per orang. Banner punya satu tombol yang
            membuka formulir pendaftaran event. Pendaftaran masuk ke Reservasi
            sebagai Trip laut yang menunggu konfirmasi. Bila link diisi,
            tombolnya membuka link itu. Kolom English yang kosong memakai teks
            Indonesia.
          </p>
        ) : (
          <p className="admin-subtle">
            Tampil di kalender halaman Diving. Kolom English yang kosong memakai
            teks Indonesia.
          </p>
        )}
        {tab === "banners" &&
          items.map((banner, index) => {
            const live =
              activeBanners({ banners: [banner] }, todayWIT()).length > 0;
            const set = (patch) =>
              editBanners((list) =>
                list.map((b, i) => (i === index ? { ...b, ...patch } : b)),
              );
            return (
              <fieldset className="admin-price-item" key={index}>
                <legend>
                  {banner.title?.id || "Banner baru"}
                  <span>
                    <em
                      className={
                        "admin-banner-state" + (live ? " is-live" : "")
                      }
                    >
                      {live
                        ? "Tampil sekarang"
                        : banner.enabled
                          ? "Terjadwal / selesai"
                          : "Tidak tampil"}
                    </em>
                    <button
                      type="button"
                      className="admin-text-button"
                      onClick={() => remove(index)}
                    >
                      Hapus
                    </button>
                  </span>
                </legend>
                <div className="admin-gallery-item admin-banner-item">
                  <div className="admin-banner-photos">
                    <PhotoField
                      label="Flyer event"
                      guide="flyer"
                      value={banner.image}
                      media={media}
                      placePhoto={placePhoto}
                      onChange={(url) => set({ image: url })}
                    />
                    <PhotoField
                      label="Foto latar banner (opsional)"
                      guide="bannerBackground"
                      value={banner.background}
                      media={media}
                      placePhoto={placePhoto}
                      onChange={(url) => set({ background: url })}
                    />
                  </div>
                  <div className="admin-form-grid">
                    <label className="admin-dev-choice admin-agent-wide">
                      <input
                        type="checkbox"
                        checked={banner.enabled}
                        onChange={(e) => set({ enabled: e.target.checked })}
                      />
                      <span>
                        <strong>Tampilkan di beranda</strong>
                        <small>
                          Sesuai tanggal di bawah. Matikan untuk menyimpan
                          sebagai draf.
                        </small>
                      </span>
                    </label>
                    <Field label="Tanggal mulai event">
                      <input
                        type="date"
                        value={banner.startDate}
                        onChange={(e) => set({ startDate: e.target.value })}
                      />
                    </Field>
                    <Field label="Tanggal selesai event (banner hilang setelahnya)">
                      <input
                        type="date"
                        value={banner.endDate}
                        onChange={(e) => set({ endDate: e.target.value })}
                      />
                    </Field>
                    <Field label="Mulai tampil (kosong = langsung)">
                      <input
                        type="date"
                        value={banner.showFrom}
                        onChange={(e) => set({ showFrom: e.target.value })}
                      />
                    </Field>
                    <Field label="Harga per orang (Rp)">
                      <input
                        type="number"
                        min="0"
                        max="1000000000"
                        value={banner.amount || ""}
                        onChange={(e) =>
                          set({
                            amount:
                              e.target.value === ""
                                ? 0
                                : Number(e.target.value),
                          })
                        }
                      />
                    </Field>
                    <Field label="Minimal peserta">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={banner.minPeople || 1}
                        onChange={(e) =>
                          set({ minPeople: Number(e.target.value) || 1 })
                        }
                      />
                    </Field>
                    <Field label="Link tombol (kosong = formulir pendaftaran)">
                      <input
                        maxLength={1200}
                        placeholder="/id/trip atau https://…"
                        value={banner.link}
                        onChange={(e) => set({ link: e.target.value })}
                      />
                    </Field>
                    {[
                      ["title", "Judul", 80],
                      ["subtitle", "Keterangan singkat", 140],
                      ["note", "Catatan (mis. Harga spesial)", 60],
                      ["badge", "Label kecil", 24],
                    ].flatMap(([field, label, max]) =>
                      ["id", "en"].map((lang) => (
                        <Field
                          key={field + lang}
                          label={`${label} (${lang === "id" ? "Indonesia" : "English"})`}
                        >
                          <input
                            maxLength={max}
                            required={field === "title" && lang === "id"}
                            value={banner[field]?.[lang] ?? ""}
                            onChange={(e) =>
                              set({
                                [field]: {
                                  ...banner[field],
                                  [lang]: e.target.value,
                                },
                              })
                            }
                          />
                        </Field>
                      )),
                    )}
                  </div>
                </div>
              </fieldset>
            );
          })}
        {tab === "seasons" &&
          items.map((season, index) => (
            <fieldset className="admin-price-item" key={index}>
              <legend>{months[index]}</legend>
              <div className="admin-form-grid">
                <Field label="Kondisi">
                  <select
                    value={season.rating}
                    onChange={(e) => change(index, { rating: e.target.value })}
                  >
                    {seasonRatings.map((r) => (
                      <option value={r} key={r}>
                        {seasonRatingLabels[r]}
                      </option>
                    ))}
                  </select>
                </Field>
                <span />
                {both(index, "note", "Catatan", 200)}
              </div>
            </fieldset>
          ))}
        {!["seasons", "banners"].includes(tab) &&
          items.map((item, index) => (
            <fieldset className="admin-price-item" key={index}>
              <legend>
                {tab === "events"
                  ? item.date || "Kegiatan baru"
                  : `Item ${index + 1}`}
                <span>
                  <button
                    type="button"
                    className="admin-text-button"
                    onClick={() => remove(index)}
                  >
                    Hapus
                  </button>
                </span>
              </legend>
              <div className="admin-form-grid">
                {tab === "events" && (
                  <>
                    <Field label="Tanggal">
                      <input
                        type="date"
                        required
                        value={item.date}
                        onChange={(e) =>
                          change(index, { date: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Jenis kegiatan">
                      <select
                        value={item.type}
                        onChange={(e) =>
                          change(index, { type: e.target.value })
                        }
                      >
                        {eventTypes.map((type) => (
                          <option value={type} key={type}>
                            {eventTypeLabels[type]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Tempat">
                      <input
                        maxLength={80}
                        value={item.place}
                        onChange={(e) =>
                          change(index, { place: e.target.value })
                        }
                      />
                    </Field>
                    <span />
                    {both(index, "title", "Nama kegiatan", 100)}
                    {both(index, "description", "Keterangan", 400, true)}
                  </>
                )}
                {tab === "spots" && (
                  <>
                    <Field label="Nama spot">
                      <input
                        required
                        maxLength={60}
                        value={item.name}
                        onChange={(e) =>
                          change(index, { name: e.target.value })
                        }
                      />
                    </Field>
                    <span />
                    {both(index, "best", "Waktu terbaik", 60)}
                    {both(index, "note", "Keterangan", 240, true)}
                  </>
                )}
                {tab === "eco" && (
                  <>
                    {both(index, "title", "Nama rencana", 80)}
                    {both(index, "when", "Waktu", 60)}
                    {both(index, "description", "Keterangan", 300, true)}
                  </>
                )}
              </div>
            </fieldset>
          ))}
        {tab !== "seasons" && (
          <button
            type="button"
            className="admin-button secondary"
            disabled={items.length >= calendarLimits[tab]}
            onClick={() => update(tab, [...items, blank[tab]()])}
          >
            + Tambah{" "}
            {tab === "events"
              ? "kegiatan"
              : tab === "banners"
                ? "banner"
                : "item"}
          </button>
        )}
        <button className="admin-button" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan kalender"}
        </button>
      </section>
    </form>
  );
}
