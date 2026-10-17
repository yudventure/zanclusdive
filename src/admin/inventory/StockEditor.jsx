"use client";
import { useEffect, useState } from "react";
import { Field } from "../fields.jsx";
import {
  itemCategories,
  units,
  movementReasons,
  inventoryLimits,
} from "../../inventory-model.js";
import { money } from "../../money.js";
import { modeNames } from "../../shop-stock.js";

const blank = () => ({
  name: "",
  sku: "",
  category: "alat",
  unit: "pcs",
  minStock: "",
  cost: "",
  location: "",
  note: "",
  active: true,
  productId: "",
  mode: "",
  size: "",
});
const blankMove = (today, kind) => ({
  date: today,
  kind,
  qty: "",
  reason: Object.keys(movementReasons[kind])[0],
  note: "",
});

// What the Dive Shop holds of a linked item, as short lines.
const shopLines = (shop) =>
  [
    shop.rentedToday && `${shop.rentedToday} disewa hari ini`,
    shop.bookedLater && `${shop.bookedLater} dipesan untuk sewa nanti`,
    shop.waiting && `${shop.waiting} menunggu pembayaran`,
  ].filter(Boolean);

// Barang & stok: every item with its stock, quick in/out, and the form.
// Every Dive Shop product has its item here; the server makes the missing
// ones when the list loads.
export default function StockEditor({ request, today }) {
  const [items, setItems] = useState(null);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(blank());
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [move, setMove] = useState(null); // { itemId, ...blankMove }
  const [showInactive, setShowInactive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    try {
      const result = await request("/api/admin/inventory/items");
      setItems(result.items);
      setProducts(result.products ?? []);
      if (result.created)
        setNotice(
          `${result.created} barang Dive Shop masuk ke gudang dengan stok 0. Isi stok jual dan stok sewanya di Dive Shop, atau lewat tombol Masuk.`,
        );
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const set = (key) => (event) =>
    setForm((f) => ({
      ...f,
      [key]:
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value,
    }));
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
  function startEdit(item) {
    setEditing(item);
    setForm({
      ...blank(),
      ...item,
      minStock: String(item.minStock),
      cost: String(item.cost || ""),
      productId: item.shop?.productId ?? "",
      mode: item.shop?.mode ?? "",
      size: item.shop?.size ?? "",
    });
    setMove(null);
    document.getElementById("item-form")?.scrollIntoView({ block: "start" });
  }
  function cancel() {
    setEditing(null);
    setForm(blank());
  }
  const submit = (event) => {
    event.preventDefault();
    return editing
      ? act(async () => {
          await request(
            `/api/admin/inventory/items/${editing.id}`,
            "PUT",
            form,
          );
          cancel();
        }, `${form.name} sudah diperbarui.`)
      : act(async () => {
          await request("/api/admin/inventory/items", "POST", form);
          setForm(blank());
        }, `${form.name} sudah ditambahkan. Catat stok awalnya lewat tombol Masuk.`);
  };
  const saveMove = (event) => {
    event.preventDefault();
    const item = items.find((i) => i.id === move.itemId);
    return act(
      async () => {
        await request("/api/admin/inventory/movements", "POST", move);
        setMove(null);
      },
      `${move.kind === "in" ? "Masuk" : "Keluar"} ${move.qty} ${item.unit} ${item.name} tercatat.`,
    );
  };
  const toggle = (item) =>
    act(
      () =>
        request(`/api/admin/inventory/items/${item.id}`, "PUT", {
          active: item.active === false,
        }),
      item.active === false
        ? `${item.name} aktif kembali.`
        : `${item.name} dinonaktifkan.`,
    );
  const remove = (item) =>
    act(
      async () => {
        await request(`/api/admin/inventory/items/${item.id}`, "DELETE");
        setRemoving(null);
        if (editing?.id === item.id) cancel();
      },
      `${item.name} dihapus.` +
        (item.shop
          ? ` ${item.shop.mode === "rental" ? "Stok sewa" : "Stok jual"} ${item.shop.productName}${item.shop.size ? ` ukuran ${item.shop.size}` : ""} mendapat barang baru dengan stok 0.`
          : ""),
    );
  const shown = (items ?? []).filter((i) => showInactive || i.active !== false);
  const low = (items ?? []).filter((i) => i.low);
  const empty = (items ?? []).filter((i) => i.empty);
  const linkedTo = (productId, mode, size) =>
    (items ?? []).find(
      (i) =>
        i.shop?.productId === productId &&
        i.shop.mode === mode &&
        i.shop.size === size,
    );
  // Each product's sale or rental stock, per size, is one choice in the
  // item form.
  const variants = products.flatMap((product) =>
    (product.modes ?? ["sale"]).flatMap((mode) =>
      (product.sizes?.length ? product.sizes : [""]).map((size) => ({
        value: [product.id, mode, size].join("::"),
        productId: product.id,
        mode,
        size,
        label:
          `${product.name} · ${modeNames[mode]}` + (size ? ` · ${size}` : ""),
      })),
    ),
  );
  const moveItem = move && items?.find((i) => i.id === move.itemId);
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
        <div className="admin-card-heading">
          <div>
            <h2>Barang & stok</h2>
            <p
              className={
                "admin-subtle" + (low.length || empty.length ? " is-warn" : "")
              }
            >
              {!items
                ? "Memuat…"
                : low.length || empty.length
                  ? [
                      empty.length && `${empty.length} barang habis`,
                      low.length &&
                        `${low.length} barang menipis (${low.map((i) => i.name).join(", ")})`,
                    ]
                      .filter(Boolean)
                      .join(", ") + "."
                  : "Semua stok di atas batas minimum."}
            </p>
          </div>
          <div className="admin-hr-tools">
            <label className="admin-login-show">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Tampilkan nonaktif
            </label>
            <a
              className="admin-button secondary"
              href="/api/admin/inventory/export?kind=stock"
            >
              Unduh Excel
            </a>
          </div>
        </div>
        {!items ? (
          <p className="admin-empty">Memuat barang…</p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table admin-hr-table admin-stock">
              <thead>
                <tr>
                  <th>Barang</th>
                  <th>Kategori</th>
                  <th>Stok</th>
                  <th>Minimum</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((i) => (
                  <tr key={i.id} className={i.low || i.empty ? "is-low" : ""}>
                    <td>
                      <strong>{i.name}</strong>
                      <small>
                        {[i.sku, i.location].filter(Boolean).join(" · ")}
                      </small>
                      {i.shop && (
                        <span className="admin-stock-shop">
                          Dive Shop · {i.shop.productName} ·{" "}
                          {modeNames[i.shop.mode]}
                          {i.shop.size ? ` · ${i.shop.size}` : ""}
                          {i.shop.shown ? "" : " (draft)"}
                        </span>
                      )}
                    </td>
                    <td>{itemCategories[i.category]}</td>
                    <td>
                      <strong>
                        {i.stock} {i.unit}
                      </strong>
                      {i.cost > 0 && <small>nilai {money(i.value)}</small>}
                      {i.shop &&
                        shopLines(i.shop).map((line) => (
                          <small key={line}>{line}</small>
                        ))}
                    </td>
                    <td>{i.minStock || "–"}</td>
                    <td>
                      <span
                        className={
                          "admin-user-state " +
                          (i.active === false
                            ? "is-off"
                            : i.low || i.empty
                              ? "is-warn"
                              : "is-on")
                        }
                      >
                        {i.active === false
                          ? "Nonaktif"
                          : i.empty
                            ? "Habis"
                            : i.low
                              ? "Menipis"
                              : "Cukup"}
                      </span>
                    </td>
                    <td className="admin-user-actions">
                      <button
                        type="button"
                        className="admin-inline"
                        disabled={busy}
                        onClick={() =>
                          setMove({ itemId: i.id, ...blankMove(today, "in") })
                        }
                      >
                        Masuk
                      </button>
                      <button
                        type="button"
                        className="admin-inline"
                        disabled={busy}
                        onClick={() =>
                          setMove({ itemId: i.id, ...blankMove(today, "out") })
                        }
                      >
                        Keluar
                      </button>
                      <button
                        type="button"
                        className="admin-inline"
                        disabled={busy}
                        onClick={() => startEdit(i)}
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        className="admin-inline"
                        disabled={busy}
                        onClick={() => toggle(i)}
                      >
                        {i.active === false ? "Aktifkan" : "Nonaktifkan"}
                      </button>
                      {removing === i.id ? (
                        <>
                          <button
                            type="button"
                            className="admin-inline danger"
                            disabled={busy}
                            onClick={() => remove(i)}
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
                          onClick={() => setRemoving(i.id)}
                        >
                          Hapus
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!shown.length && (
                  <tr>
                    <td colSpan={6}>
                      <small>Belum ada barang. Tambahkan di bawah.</small>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {moveItem && (
        <section className="admin-card admin-quick-move">
          <h2>{move.kind === "in" ? "Barang masuk" : "Barang keluar"}</h2>
          <p className="admin-subtle">
            {moveItem.name}, stok sekarang {moveItem.stock} {moveItem.unit}.
            {moveItem.shop &&
              move.kind === "out" &&
              " Penjualan dan sewa dari pesanan online Dive Shop dihitung otomatis, jadi tidak perlu dicatat di sini."}
          </p>
          <form onSubmit={saveMove} className="admin-hr-form">
            <div className="admin-form-grid">
              <Field label="Tanggal">
                <input
                  type="date"
                  required
                  value={move.date}
                  onChange={(e) =>
                    setMove((m) => ({ ...m, date: e.target.value }))
                  }
                />
              </Field>
              <Field label={`Jumlah (${moveItem.unit})`}>
                <input
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={move.qty}
                  onChange={(e) =>
                    setMove((m) => ({ ...m, qty: e.target.value }))
                  }
                />
              </Field>
              <Field label="Alasan">
                <select
                  value={move.reason}
                  onChange={(e) =>
                    setMove((m) => ({ ...m, reason: e.target.value }))
                  }
                >
                  {Object.entries(movementReasons[move.kind]).map(
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
                  value={move.note}
                  onChange={(e) =>
                    setMove((m) => ({ ...m, note: e.target.value }))
                  }
                />
              </Field>
            </div>
            <div className="admin-user-buttons">
              <button className="admin-button" disabled={busy}>
                {busy ? "Menyimpan…" : "Catat mutasi"}
              </button>
              <button
                type="button"
                className="admin-button secondary"
                onClick={() => setMove(null)}
              >
                Batal
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="admin-card" id="item-form">
        <h2>{editing ? `Ubah ${editing.name}` : "Tambah barang"}</h2>
        <form onSubmit={submit} className="admin-hr-form">
          <div className="admin-form-grid">
            <Field label="Nama barang">
              <input
                required
                maxLength={80}
                value={form.name}
                onChange={set("name")}
              />
            </Field>
            <Field label="Kode barang (opsional)">
              <input
                maxLength={30}
                placeholder="BCD-M-01"
                value={form.sku}
                onChange={set("sku")}
              />
            </Field>
            <Field label="Kategori">
              <select value={form.category} onChange={set("category")}>
                {Object.entries(itemCategories).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Satuan">
              <select value={form.unit} onChange={set("unit")}>
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Stok minimum"
              hint="Peringatan muncul saat stok mencapai angka ini. 0 = tanpa peringatan."
            >
              <input
                type="number"
                min={0}
                step={1}
                value={form.minStock}
                onChange={set("minStock")}
              />
            </Field>
            <Field label="Harga beli per satuan (opsional)">
              <input
                type="number"
                min={0}
                step={1000}
                value={form.cost}
                onChange={set("cost")}
              />
            </Field>
            <Field label="Lokasi simpan (opsional)">
              <input
                maxLength={60}
                placeholder="Rak A, gudang perahu…"
                value={form.location}
                onChange={set("location")}
              />
            </Field>
            <Field label="Catatan (opsional)">
              <input
                maxLength={inventoryLimits.note}
                value={form.note}
                onChange={set("note")}
              />
            </Field>
            <Field
              label="Produk Dive Shop"
              hint="Barang Dive Shop dibuat dan diisi stoknya langsung di Dive Shop, terpisah untuk jual dan sewa, jadi kolom ini hanya untuk memindahkan produk ke barang yang sudah ada di sini. Penjualan online mengurangi stok jual sendiri, dan sewa online memakai stok sewa sesuai tanggal sewa."
            >
              <select
                value={
                  form.productId
                    ? [form.productId, form.mode || "sale", form.size].join(
                        "::",
                      )
                    : ""
                }
                onChange={(e) => {
                  const chosen = variants.find(
                    (v) => v.value === e.target.value,
                  );
                  setForm((f) => ({
                    ...f,
                    productId: chosen?.productId ?? "",
                    mode: chosen?.mode ?? "",
                    size: chosen?.size ?? "",
                  }));
                }}
              >
                <option value="">Tidak dijual di Dive Shop</option>
                {variants.map((variant) => {
                  const other = linkedTo(
                    variant.productId,
                    variant.mode,
                    variant.size,
                  );
                  return (
                    <option key={variant.value} value={variant.value}>
                      {variant.label}
                      {other && other.id !== editing?.id
                        ? ` (sekarang ${other.name})`
                        : ""}
                    </option>
                  );
                })}
              </select>
            </Field>
          </div>
          {editing && (
            <label className="admin-login-show">
              <input
                type="checkbox"
                checked={form.active}
                onChange={set("active")}
              />
              Barang aktif
            </label>
          )}
          <div className="admin-user-buttons">
            <button className="admin-button" disabled={busy}>
              {busy
                ? "Menyimpan…"
                : editing
                  ? "Simpan perubahan"
                  : "Simpan barang"}
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
