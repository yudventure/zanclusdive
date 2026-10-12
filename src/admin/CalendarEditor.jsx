"use client";
import { cloneElement, useId, useState } from "react";
import {
  calendarLimits,
  defaultCalendar,
  eventTypeLabels,
  eventTypes,
  seasonRatingLabels,
  seasonRatings,
} from "../calendar-model.js";

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
  events: "Kegiatan",
  seasons: "Musim",
  spots: "Spot populer",
  eco: "Peduli lingkungan",
};
const blank = {
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

// The public activity calendar page: dated activities, season guide,
// popular spots and ocean care plans.
export default function CalendarEditor({ calendar, update, onSave, busy }) {
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
        <p className="admin-subtle">
          Tampil di halaman Kalender (/calendar). Kolom English yang kosong
          memakai teks Indonesia.
        </p>
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
        {tab !== "seasons" &&
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
            + Tambah {tab === "events" ? "kegiatan" : "item"}
          </button>
        )}
        <button className="admin-button" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan kalender"}
        </button>
      </section>
    </form>
  );
}
