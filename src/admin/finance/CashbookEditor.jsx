"use client";
import { useEffect, useState } from "react";
import { Field, MonthNav, shortDay } from "../fields.jsx";
import {
  txKinds,
  categoriesOf,
  paymentMethods,
  financeLimits,
  money,
} from "../../finance-model.js";

const blank = (today) => ({
  date: today,
  kind: "out",
  category: "operasional",
  amount: "",
  description: "",
  method: "tunai",
  reference: "",
  note: "",
});

// Buku kas: the month's lines, typed or from paid online orders.
export default function CashbookEditor({ request, today }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [data, setData] = useState(null);
  const [form, setForm] = useState(blank(today));
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load(which = month) {
    try {
      setData(await request(`/api/admin/finance/transactions?month=${which}`));
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
    setForm((f) => {
      const next = { ...f, [key]: event.target.value };
      if (key === "kind")
        next.category = Object.keys(categoriesOf(next.kind))[0];
      return next;
    });
  function startEdit(tx) {
    setEditing(tx);
    setForm({ ...blank(today), ...tx, amount: String(tx.amount) });
    setError("");
    setNotice("");
    document.getElementById("tx-form")?.scrollIntoView({ block: "start" });
  }
  function cancel() {
    setEditing(null);
    setForm(blank(today));
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
    const label = `${txKinds[form.kind]} ${money(Number(form.amount))}`;
    return editing
      ? act(async () => {
          await request(
            `/api/admin/finance/transactions/${editing.id}`,
            "PUT",
            form,
          );
          cancel();
        }, `${label} sudah diperbarui.`)
      : act(async () => {
          await request("/api/admin/finance/transactions", "POST", form);
          if (form.date.slice(0, 7) !== month) setMonth(form.date.slice(0, 7));
          setForm({
            ...blank(today),
            kind: form.kind,
            category: form.category,
          });
        }, `${label} tercatat.`);
  };
  const remove = (tx) =>
    act(async () => {
      await request(`/api/admin/finance/transactions/${tx.id}`, "DELETE");
      setRemoving(null);
      if (editing?.id === tx.id) cancel();
    }, "Transaksi dihapus.");
  const totals = data?.totals;
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
      <section className="admin-card">
        <MonthNav month={month} onChange={setMonth}>
          <a
            className="admin-button secondary admin-hr-export"
            href={`/api/admin/finance/export?kind=cashbook&month=${month}`}
          >
            Unduh Excel
          </a>
        </MonthNav>
        {totals && (
          <div className="admin-stat-strip">
            <div className="is-in">
              <small>Pemasukan</small>
              <strong>{money(totals.income)}</strong>
            </div>
            <div className="is-out">
              <small>Pengeluaran</small>
              <strong>{money(totals.expense)}</strong>
            </div>
            <div className={totals.net < 0 ? "is-out" : "is-net"}>
              <small>Bersih</small>
              <strong>{money(totals.net)}</strong>
            </div>
          </div>
        )}
        {!data ? (
          <p className="admin-empty">Memuat buku kas…</p>
        ) : !data.transactions.length ? (
          <p className="admin-empty">
            Belum ada transaksi bulan ini. Catat di bawah; pembayaran online
            yang lunas masuk sendiri.
          </p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table admin-hr-table admin-cashbook">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th>Kategori</th>
                  <th>Cara bayar</th>
                  <th>Masuk</th>
                  <th>Keluar</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((tx) => (
                  <tr key={tx.id} className={tx.kind}>
                    <td>{shortDay(tx.date)}</td>
                    <td>
                      <strong>{tx.description}</strong>
                      {(tx.reference || tx.note) && (
                        <small>
                          {[tx.reference, tx.note].filter(Boolean).join(" · ")}
                        </small>
                      )}
                    </td>
                    <td>{categoriesOf(tx.kind)[tx.category]}</td>
                    <td>{paymentMethods[tx.method]}</td>
                    <td className="is-amount">
                      {tx.kind === "in" ? money(tx.amount) : ""}
                    </td>
                    <td className="is-amount">
                      {tx.kind === "out" ? money(tx.amount) : ""}
                    </td>
                    <td className="admin-user-actions">
                      {tx.source === "midtrans" ? (
                        <span className="admin-user-state is-on">Otomatis</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="admin-inline"
                            disabled={busy}
                            onClick={() => startEdit(tx)}
                          >
                            Ubah
                          </button>
                          {removing === tx.id ? (
                            <>
                              <button
                                type="button"
                                className="admin-inline danger"
                                disabled={busy}
                                onClick={() => remove(tx)}
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
                              onClick={() => setRemoving(tx.id)}
                            >
                              Hapus
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card" id="tx-form">
        <h2>{editing ? "Ubah transaksi" : "Catat transaksi"}</h2>
        <form onSubmit={submit} className="admin-hr-form">
          <div className="admin-form-grid">
            <Field label="Jenis">
              <select value={form.kind} onChange={set("kind")}>
                {Object.entries(txKinds).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kategori">
              <select value={form.category} onChange={set("category")}>
                {Object.entries(categoriesOf(form.kind)).map(([key, label]) => (
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
            <Field label="Jumlah (Rp)">
              <input
                type="number"
                min={1}
                step={1}
                required
                value={form.amount}
                onChange={set("amount")}
              />
            </Field>
            <Field label="Keterangan">
              <input
                required
                maxLength={financeLimits.description}
                placeholder="BBM perahu, 2 tamu diving, kaos 3 pcs…"
                value={form.description}
                onChange={set("description")}
              />
            </Field>
            <Field label="Cara bayar">
              <select value={form.method} onChange={set("method")}>
                {Object.entries(paymentMethods)
                  .filter(([key]) => key !== "midtrans")
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Referensi (nota, invoice, opsional)">
              <input
                maxLength={60}
                value={form.reference}
                onChange={set("reference")}
              />
            </Field>
            <Field label="Catatan (opsional)">
              <input
                maxLength={financeLimits.note}
                value={form.note}
                onChange={set("note")}
              />
            </Field>
          </div>
          <div className="admin-user-buttons">
            <button className="admin-button" disabled={busy}>
              {busy ? "Menyimpan…" : editing ? "Simpan perubahan" : "Catat"}
            </button>
            {editing && (
              <button
                type="button"
                className="admin-button secondary"
                onClick={cancel}
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
