"use client";
import { useEffect, useState } from "react";
import { Field, MonthNav, shortDay } from "../fields.jsx";
import {
  movementKinds,
  movementReasons,
  inventoryLimits,
  delta,
} from "../../inventory-model.js";

const blank = (today) => ({
  date: today,
  itemId: "",
  kind: "in",
  qty: "",
  reason: "beli",
  note: "",
});

// Keluar masuk: the month's movements and a form for any item.
export default function MovementsEditor({ request, today }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [items, setItems] = useState(null);
  const [movements, setMovements] = useState(null);
  const [form, setForm] = useState(blank(today));
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function loadItems() {
    setItems((await request("/api/admin/inventory/items")).items);
  }
  async function load(which = month) {
    try {
      setMovements(
        (await request(`/api/admin/inventory/movements?month=${which}`))
          .movements,
      );
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    loadItems().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    setMovements(null);
    load(month);
  }, [month]);
  const set = (key) => (event) =>
    setForm((f) => {
      const next = { ...f, [key]: event.target.value };
      if (key === "kind")
        next.reason = Object.keys(movementReasons[next.kind])[0];
      return next;
    });
  async function act(work, message) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      await Promise.all([load(), loadItems()]);
      setNotice(message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const submit = (event) => {
    event.preventDefault();
    const item = items?.find((i) => i.id === form.itemId);
    return act(
      async () => {
        await request("/api/admin/inventory/movements", "POST", form);
        if (form.date.slice(0, 7) !== month) setMonth(form.date.slice(0, 7));
        setForm((f) => ({
          ...blank(today),
          kind: f.kind,
          reason: f.reason,
          itemId: f.itemId,
        }));
      },
      `${movementKinds[form.kind]} ${form.qty} ${item?.unit ?? ""} ${item?.name ?? ""} tercatat.`,
    );
  };
  const remove = (m) =>
    act(async () => {
      await request(`/api/admin/inventory/movements/${m.id}`, "DELETE");
      setRemoving(null);
    }, "Mutasi dihapus; stok dihitung ulang.");
  const nameOf = (id) => items?.find((i) => i.id === id)?.name ?? "–";
  const unitOf = (id) => items?.find((i) => i.id === id)?.unit ?? "";
  const activeItems = (items ?? []).filter((i) => i.active !== false);
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
      <section className="admin-card" id="movement-form">
        <h2>Catat barang masuk / keluar</h2>
        {items && !activeItems.length ? (
          <p className="admin-empty">
            Belum ada barang aktif. Tambahkan di halaman Barang & stok.
          </p>
        ) : (
          <form onSubmit={submit} className="admin-hr-form">
            <div className="admin-form-grid">
              <Field label="Barang">
                <select required value={form.itemId} onChange={set("itemId")}>
                  <option value="">Pilih barang…</option>
                  {activeItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (stok {i.stock} {i.unit})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Jenis">
                <select value={form.kind} onChange={set("kind")}>
                  {Object.entries(movementKinds).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tanggal">
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={set("date")}
                />
              </Field>
              <Field
                label={
                  form.kind === "adjust"
                    ? "Perubahan (+ tambah, − kurang)"
                    : "Jumlah"
                }
                hint={
                  form.kind === "adjust"
                    ? "Contoh: -2 bila hasil opname kurang dua."
                    : ""
                }
              >
                <input
                  type="number"
                  step={1}
                  min={form.kind === "adjust" ? undefined : 1}
                  required
                  value={form.qty}
                  onChange={set("qty")}
                />
              </Field>
              <Field label="Alasan">
                <select value={form.reason} onChange={set("reason")}>
                  {Object.entries(movementReasons[form.kind]).map(
                    ([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Catatan (opsional)">
                <input
                  maxLength={inventoryLimits.note}
                  value={form.note}
                  onChange={set("note")}
                />
              </Field>
            </div>
            <button className="admin-button" disabled={busy}>
              {busy ? "Menyimpan…" : "Catat mutasi"}
            </button>
          </form>
        )}
      </section>

      <section className="admin-card">
        <MonthNav month={month} onChange={setMonth}>
          <a
            className="admin-button secondary admin-hr-export"
            href={`/api/admin/inventory/export?kind=movements&month=${month}`}
          >
            Unduh Excel
          </a>
        </MonthNav>
        {!movements ? (
          <p className="admin-empty">Memuat mutasi…</p>
        ) : !movements.length ? (
          <p className="admin-empty">
            Belum ada barang masuk atau keluar bulan ini.
          </p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table admin-hr-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Barang</th>
                  <th>Jenis</th>
                  <th>Perubahan</th>
                  <th>Alasan</th>
                  <th>Catatan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className={"move-" + m.kind}>
                    <td>{shortDay(m.date)}</td>
                    <td>
                      <strong>{nameOf(m.itemId)}</strong>
                    </td>
                    <td>{movementKinds[m.kind]}</td>
                    <td className="is-amount">
                      <strong>
                        {delta(m) > 0 ? "+" : ""}
                        {delta(m)} {unitOf(m.itemId)}
                      </strong>
                    </td>
                    <td>{movementReasons[m.kind]?.[m.reason]}</td>
                    <td>{m.note}</td>
                    <td className="admin-user-actions">
                      {removing === m.id ? (
                        <>
                          <button
                            type="button"
                            className="admin-inline danger"
                            disabled={busy}
                            onClick={() => remove(m)}
                          >
                            Yakin, hapus
                          </button>
                          <button
                            type="button"
                            className="admin-inline"
                            onClick={() => setRemoving(null)}
                          >
                            Batal
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="admin-inline danger"
                          disabled={busy}
                          onClick={() => setRemoving(m.id)}
                        >
                          Hapus
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
