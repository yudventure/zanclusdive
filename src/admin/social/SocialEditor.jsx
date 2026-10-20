"use client";
import { useEffect, useState } from "react";
import { Field, MonthNav, dayLabel, shortDay } from "../fields.jsx";
import { monthDays } from "../../month-grid.js";
import {
  platforms,
  formats,
  postStatuses,
  metricKeys,
  planLimits,
} from "../../content-plan-model.js";

const weekdays = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const blank = (date) => ({
  date,
  time: "",
  platform: "instagram",
  format: "reel",
  title: "",
  caption: "",
  status: "idea",
  link: "",
  pic: "",
  metrics: Object.fromEntries(Object.keys(metricKeys).map((k) => [k, ""])),
  evaluation: "",
});
const live = (status) => ["published", "evaluated"].includes(status);

// Kalender konten: the month's posts on a grid, the form from idea to
// evaluation, and the month's numbers.
export default function SocialEditor({ request, today }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [data, setData] = useState(null);
  const [form, setForm] = useState(blank(today));
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load(which = month) {
    try {
      setData(await request(`/api/admin/social/posts?month=${which}`));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    setData(null);
    load(month);
  }, [month]);
  const set = (key) => (event) =>
    setForm((f) => ({ ...f, [key]: event.target.value }));
  const setMetric = (key) => (event) =>
    setForm((f) => ({
      ...f,
      metrics: { ...f.metrics, [key]: event.target.value },
    }));
  function startEdit(post) {
    setEditing(post);
    setForm({
      ...blank(post.date),
      ...post,
      metrics: { ...blank(post.date).metrics, ...(post.metrics ?? {}) },
    });
    setRemoving(false);
    setError("");
    setNotice("");
    document.getElementById("post-form")?.scrollIntoView({ block: "start" });
  }
  function startNew(date) {
    setEditing(null);
    setForm(blank(date));
    document.getElementById("post-form")?.scrollIntoView({ block: "start" });
  }
  function cancel() {
    setEditing(null);
    setForm(blank(today));
    setRemoving(false);
  }
  async function act(work, message) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      await load();
      setNotice(message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const submit = (event) => {
    event.preventDefault();
    return editing
      ? act(async () => {
          await request(`/api/admin/social/posts/${editing.id}`, "PUT", form);
          cancel();
        }, `"${form.title}" sudah diperbarui.`)
      : act(async () => {
          await request("/api/admin/social/posts", "POST", form);
          if (form.date.slice(0, 7) !== month) setMonth(form.date.slice(0, 7));
          setForm(blank(form.date));
        }, `"${form.title}" masuk kalender konten.`);
  };
  const remove = () =>
    act(async () => {
      await request(`/api/admin/social/posts/${editing.id}`, "DELETE");
      cancel();
    }, "Konten dihapus.");
  const posts = data?.posts ?? [];
  const onDay = (date) => posts.filter((p) => p.date === date);
  const summary = data?.summary;
  const evaluated = posts.filter((p) => live(p.status));
  return (
    <div className="admin-hr">
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="admin-success" role="status">
          {notice}
        </p>
      )}
      <section className="admin-card admin-month-card">
        <MonthNav month={month} onChange={setMonth}>
          <button
            type="button"
            className="admin-inline"
            onClick={() => startNew(today)}
          >
            + Konten baru
          </button>
          <a
            className="admin-button secondary admin-hr-export"
            href={`/api/admin/social/export?month=${month}`}
          >
            Unduh Excel
          </a>
        </MonthNav>
        {summary && (
          <div className="admin-plan-summary">
            {Object.entries(postStatuses).map(([key, label]) => (
              <span key={key} className={"admin-plan-count " + key}>
                <strong>{summary.byStatus[key]}</strong> {label}
              </span>
            ))}
          </div>
        )}
        <div className="admin-month admin-plan">
          <div className="admin-month-head" aria-hidden="true">
            {weekdays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="admin-month-days">
            {monthDays(month).map((date) => (
              <div
                key={date}
                data-date={date}
                className={
                  "admin-month-day" +
                  (date.slice(0, 7) === month ? "" : " is-outside") +
                  (date === today ? " is-today" : "")
                }
              >
                <button
                  type="button"
                  className="admin-month-date"
                  aria-label={`Konten baru ${dayLabel(date)}`}
                  onClick={() => startNew(date)}
                >
                  {Number(date.slice(8))}
                </button>
                {onDay(date).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`plan-chip is-${p.platform} is-${p.status}`}
                    title={`${platforms[p.platform]} · ${formats[p.format]} · ${postStatuses[p.status]}`}
                    onClick={() => startEdit(p)}
                  >
                    <i aria-hidden="true" />
                    <span>
                      {p.time && p.time + " "}
                      {p.title}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="admin-legend admin-month-legend">
          {Object.entries(platforms).map(([key, label]) => (
            <span key={key}>
              <i className={"dot plat-" + key} /> {label}
            </span>
          ))}
          <span className="admin-legend-note">
            Pudar = ide/draf · Tebal = tayang
          </span>
        </div>
      </section>

      <section className="admin-card" id="post-form">
        <h2>{editing ? "Ubah konten" : "Konten baru"}</h2>
        <form onSubmit={submit} className="admin-hr-form">
          <div className="admin-form-grid">
            <Field label="Judul / ide">
              <input
                required
                maxLength={120}
                placeholder="Reel manta di Manta Point, tips snorkeling pemula…"
                value={form.title}
                onChange={set("title")}
              />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={set("status")}>
                {Object.entries(postStatuses).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Platform">
              <select value={form.platform} onChange={set("platform")}>
                {Object.entries(platforms).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Format">
              <select value={form.format} onChange={set("format")}>
                {Object.entries(formats).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tanggal tayang">
              <input
                type="date"
                required
                value={form.date}
                onChange={set("date")}
              />
            </Field>
            <Field label="Jam (opsional)">
              <input type="time" value={form.time} onChange={set("time")} />
            </Field>
            <Field label="Penanggung jawab (opsional)">
              <input maxLength={60} value={form.pic} onChange={set("pic")} />
            </Field>
            <Field label="Tautan setelah tayang (opsional)">
              <input
                type="url"
                placeholder="https://"
                maxLength={300}
                value={form.link}
                onChange={set("link")}
              />
            </Field>
          </div>
          <Field label="Caption / catatan produksi (opsional)">
            <textarea
              rows={3}
              maxLength={planLimits.caption}
              value={form.caption}
              onChange={set("caption")}
            />
          </Field>
          {live(form.status) && (
            <>
              <h3>Evaluasi</h3>
              <div className="admin-metric-grid">
                {Object.entries(metricKeys).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={form.metrics[key]}
                      onChange={setMetric(key)}
                    />
                  </Field>
                ))}
              </div>
              <Field
                label="Catatan evaluasi"
                hint="Apa yang berhasil, apa yang diulang, apa yang diganti."
              >
                <textarea
                  rows={2}
                  maxLength={planLimits.evaluation}
                  value={form.evaluation}
                  onChange={set("evaluation")}
                />
              </Field>
            </>
          )}
          <div className="admin-user-buttons">
            <button className="admin-button" disabled={busy}>
              {busy
                ? "Menyimpan…"
                : editing
                  ? "Simpan perubahan"
                  : "Simpan ke kalender"}
            </button>
            {editing && (
              <>
                <button
                  type="button"
                  className="admin-button secondary"
                  onClick={cancel}
                >
                  Batal
                </button>
                {removing ? (
                  <button
                    type="button"
                    className="admin-inline danger"
                    disabled={busy}
                    onClick={remove}
                  >
                    Yakin, hapus konten ini
                  </button>
                ) : (
                  <button
                    type="button"
                    className="admin-inline danger"
                    onClick={() => setRemoving(true)}
                  >
                    Hapus
                  </button>
                )}
              </>
            )}
          </div>
        </form>
      </section>

      {summary && (
        <section className="admin-card">
          <div className="admin-card-heading">
            <div>
              <h2>Hasil bulan ini</h2>
              <p className="admin-subtle">
                {evaluated.length} konten tayang ·{" "}
                {Object.entries(metricKeys)
                  .filter(([key]) => summary.metrics[key])
                  .map(
                    ([key, label]) =>
                      `${summary.metrics[key].toLocaleString("id-ID")} ${label.toLowerCase()}`,
                  )
                  .join(" · ") || "belum ada angka"}
              </p>
            </div>
          </div>
          <div className="admin-table-scroll">
            <table className="admin-table admin-hr-table">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Direncanakan</th>
                  <th>Tayang</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(platforms).map(([key, label]) => (
                  <tr key={key}>
                    <td>{label}</td>
                    <td>{summary.byPlatform[key].planned}</td>
                    <td>{summary.byPlatform[key].live}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {evaluated.length > 0 && (
            <div className="admin-table-scroll">
              <table className="admin-table admin-hr-table admin-eval">
                <thead>
                  <tr>
                    <th>Konten</th>
                    {Object.values(metricKeys).map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluated.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.title}</strong>
                        <small>
                          {shortDay(p.date)} · {platforms[p.platform]} ·{" "}
                          {postStatuses[p.status]}
                        </small>
                      </td>
                      {Object.keys(metricKeys).map((key) => (
                        <td key={key}>
                          {(p.metrics?.[key] ?? 0).toLocaleString("id-ID")}
                        </td>
                      ))}
                      <td>
                        <button
                          type="button"
                          className="admin-inline"
                          onClick={() => startEdit(p)}
                        >
                          {p.status === "evaluated" ? "Lihat" : "Evaluasi"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
