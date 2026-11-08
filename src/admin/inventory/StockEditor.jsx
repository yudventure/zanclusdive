"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Field } from "../fields.jsx";
import {
  itemCategories,
  units,
  inventoryLimits,
} from "../../inventory-model.js";
import { money } from "../../money.js";
import { modeNames } from "../../shop-stock.js";
import { itemLabel, itemMode } from "./item-label.js";

const editable = (item) => ({
  name: item.name,
  sku: item.sku ?? "",
  category: item.category ?? "alat",
  unit: item.unit ?? "pcs",
  minStock: String(item.minStock ?? 0),
  cost: item.cost ? String(item.cost) : "",
  location: item.location ?? "",
  note: item.note ?? "",
});

// What the Dive Shop holds of a linked item, as short lines.
const shopLines = (shop) =>
  [
    shop.rentedToday && `${shop.rentedToday} disewa hari ini`,
    shop.bookedLater && `${shop.bookedLater} dipesan untuk sewa nanti`,
    shop.waiting && `${shop.waiting} menunggu pembayaran`,
  ].filter(Boolean);

const filters = [
  ["all", "Semua"],
  ["sale", "Barang jual"],
  ["rental", "Barang sewa"],
  ["low", "Perlu diisi"],
];
const key = (text) =>
  String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Barang & stok: the stock of every Dive Shop product, for sale or for
// rent and in each size. The items come from the Dive Shop, so there is
// nothing to add here; stock comes in and goes out on Keluar masuk, where
// the Masuk, Keluar and Kartu stok buttons lead. Ubah keeps the minimum
// stock, code, place and buying price of an item.
export default function StockEditor({ request }) {
  const [items, setItems] = useState(null);
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [find, setFind] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [removing, setRemoving] = useState(null);
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
          `${result.created} barang baru dari Dive Shop masuk dengan stok 0. Catat stok awalnya lewat Masuk.`,
        );
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
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
    setForm(editable(item));
    setTimeout(
      () =>
        document
          .getElementById("item-form")
          ?.scrollIntoView({ block: "start" }),
      30,
    );
  }
  const close = () => {
    setEditing(null);
    setForm(null);
  };
  const set = (name) => (event) =>
    setForm((f) => ({ ...f, [name]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    const label = itemLabel(editing).title;
    return act(async () => {
      // A Dive Shop item keeps the product's name and kind.
      const { name, category, ...rest } = form;
      await request(
        `/api/admin/inventory/items/${editing.id}`,
        "PUT",
        editing.shop ? rest : form,
      );
      close();
    }, `${label} sudah diperbarui.`);
  };
  const activate = (item) =>
    act(
      () =>
        request(`/api/admin/inventory/items/${item.id}`, "PUT", {
          active: true,
        }),
      `${itemLabel(item).title} tampil lagi di daftar stok.`,
    );
  const remove = (item) =>
    act(async () => {
      await request(`/api/admin/inventory/items/${item.id}`, "DELETE");
      setRemoving(null);
      if (editing?.id === item.id) close();
    }, `${item.name} dihapus.`);
  // Dive Shop items first, in the catalog's order, each product's sizes in
  // their order, so a product's stock sits together. Items without a
  // product (from before, or of a product removed from the Dive Shop)
  // follow by name.
  const place = (i) => {
    const at = products.findIndex((p) => p.id === i.shop?.productId);
    if (at < 0) return [Infinity, 0];
    const sizes = products[at].sizes ?? [];
    return [at, sizes.indexOf(i.shop.size)];
  };
  const list = (items ?? [])
    .map((i) => [place(i), i])
    .sort(
      ([a, x], [b, y]) =>
        a[0] - b[0] ||
        a[1] - b[1] ||
        x.name.localeCompare(y.name, "id", { numeric: true }),
    )
    .map(([, i]) => i);
  const active = list.filter((i) => i.active !== false);
  const inactive = list.filter((i) => i.active === false);
  const low = active.filter((i) => i.low);
  const empty = active.filter((i) => i.empty);
  const matches = (i, which) =>
    which === "all" ||
    (which === "low" ? i.low || i.empty : itemMode(i) === which);
  const count = (which) => active.filter((i) => matches(i, which)).length;
  const words = key(find).split(/\s+/).filter(Boolean);
  const shown = (showInactive ? list : active).filter(
    (i) =>
      matches(i, filter) &&
      words.every((word) =>
        key(
          `${i.name} ${i.shop?.productName ?? ""} ${i.sku} ${i.location} ${i.shop?.size ?? ""} ${modeNames[itemMode(i)] ?? ""}`,
        ).includes(word),
      ),
  );
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
      <section className="admin-card admin-stock-card">
        <div className="admin-card-heading">
          <div>
            <h2>Stok barang</h2>
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
                      low.length && `${low.length} barang menipis`,
                    ]
                      .filter(Boolean)
                      .join(", ") + "."
                  : "Semua stok di atas batas minimum."}
            </p>
          </div>
          <div className="admin-hr-tools">
            <Link className="admin-button" href="/admin/movements">
              Catat mutasi
            </Link>
            <a
              className="admin-button secondary"
              href="/api/admin/inventory/export?kind=stock"
            >
              Unduh Excel
            </a>
          </div>
        </div>
        <p className="admin-subtle">
          Barang di sini berasal dari Dive Shop, satu untuk tiap produk jual
          atau sewa dan tiap ukurannya. Barang baru ditambah di Dive Shop, jadi
          tidak dicatat dua kali. Stok bertambah dan berkurang lewat Keluar
          masuk, dan penjualan online tercatat sendiri.
        </p>
        <div className="admin-toolbar admin-stock-tools">
          <div
            className="admin-month-views"
            role="group"
            aria-label="Saring barang"
          >
            {filters.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label} ({count(value)})
              </button>
            ))}
          </div>
          <input
            type="search"
            aria-label="Cari barang"
            placeholder="Cari nama, ukuran, kode, lokasi…"
            value={find}
            onChange={(e) => setFind(e.target.value)}
          />
          {inactive.length > 0 && (
            <label className="admin-login-show">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Tampilkan yang disembunyikan ({inactive.length})
            </label>
          )}
        </div>
        {!items ? (
          <p className="admin-empty">Memuat barang…</p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table admin-hr-table admin-stock">
              <thead>
                <tr>
                  <th>Barang</th>
                  <th>Stok</th>
                  <th>Minimum</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((i) => {
                  const { title, detail } = itemLabel(i);
                  const go = (kind) =>
                    `/admin/movements?barang=${encodeURIComponent(i.id)}&jenis=${kind}`;
                  return (
                    <tr key={i.id} className={i.low || i.empty ? "is-low" : ""}>
                      <td>
                        <strong>{title}</strong>
                        <span className="admin-stock-tags">
                          {detail.map((tag) => (
                            <span
                              key={tag}
                              className={
                                "admin-stock-tag" +
                                (tag === "Bukan dari Dive Shop"
                                  ? " is-other"
                                  : "")
                              }
                            >
                              {tag}
                            </span>
                          ))}
                        </span>
                        {(i.sku || i.location) && (
                          <small>
                            {[i.sku, i.location].filter(Boolean).join(" · ")}
                          </small>
                        )}
                      </td>
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
                            ? "Disembunyikan"
                            : i.empty
                              ? "Habis"
                              : i.low
                                ? "Menipis"
                                : "Cukup"}
                        </span>
                      </td>
                      <td className="admin-user-actions">
                        <Link className="admin-inline" href={go("in")}>
                          Masuk
                        </Link>
                        <Link className="admin-inline" href={go("out")}>
                          Keluar
                        </Link>
                        <Link
                          className="admin-inline"
                          href={`/admin/movements?kartu=${encodeURIComponent(i.id)}`}
                        >
                          Kartu stok
                        </Link>
                        <button
                          type="button"
                          className="admin-inline"
                          disabled={busy}
                          onClick={() => startEdit(i)}
                        >
                          Ubah
                        </button>
                        {i.active === false && (
                          <button
                            type="button"
                            className="admin-inline"
                            disabled={busy}
                            onClick={() => activate(i)}
                          >
                            Tampilkan
                          </button>
                        )}
                        {!i.shop &&
                          (removing === i.id ? (
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
                          ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!shown.length && (
              <p className="admin-empty">
                {list.length
                  ? "Tidak ada barang yang cocok."
                  : "Belum ada barang. Tambahkan produk di Dive Shop, barangnya muncul di sini."}
              </p>
            )}
          </div>
        )}
      </section>

      {editing && form && (
        <section className="admin-card admin-quick-move" id="item-form">
          <h2>Ubah {itemLabel(editing).title}</h2>
          <p className="admin-subtle">
            {editing.shop
              ? `${itemLabel(editing).detail.join(", ")}. Nama dan foto diatur di Dive Shop, stok lewat Keluar masuk.`
              : "Barang ini tidak terhubung ke produk Dive Shop. Stoknya tetap dicatat lewat Keluar masuk."}
          </p>
          <form onSubmit={submit} className="admin-hr-form">
            <div className="admin-form-grid">
              {!editing.shop && (
                <>
                  <Field label="Nama barang">
                    <input
                      required
                      maxLength={80}
                      value={form.name}
                      onChange={set("name")}
                    />
                  </Field>
                  <Field label="Kategori">
                    <select value={form.category} onChange={set("category")}>
                      {Object.entries(itemCategories).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
              <Field
                label="Stok minimum"
                hint="Peringatan Menipis muncul saat stok mencapai angka ini. Kosong atau 0 berarti tanpa peringatan."
              >
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.minStock}
                  onChange={set("minStock")}
                />
              </Field>
              <Field label="Satuan">
                <select value={form.unit} onChange={set("unit")}>
                  {[...new Set([...units, form.unit])].map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Kode barang (opsional)">
                <input
                  maxLength={30}
                  placeholder="BCD-M-01"
                  value={form.sku}
                  onChange={set("sku")}
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
              <Field
                label="Harga beli per satuan (opsional)"
                hint="Untuk nilai stok di daftar dan di Excel."
              >
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.cost}
                  onChange={set("cost")}
                />
              </Field>
              <Field label="Catatan (opsional)">
                <input
                  maxLength={inventoryLimits.note}
                  value={form.note}
                  onChange={set("note")}
                />
              </Field>
            </div>
            <div className="admin-user-buttons">
              <button className="admin-button" disabled={busy}>
                {busy ? "Menyimpan…" : "Simpan perubahan"}
              </button>
              <button
                type="button"
                className="admin-button secondary"
                onClick={close}
              >
                Batal
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
