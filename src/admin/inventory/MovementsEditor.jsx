"use client";
import { useEffect, useRef, useState } from "react";
import { Field, MonthNav, shortDay } from "../fields.jsx";
import SearchSelect from "../SearchSelect.jsx";
import {
  movementKinds,
  movementReasons,
  inventoryLimits,
  delta,
  opnameChange,
} from "../../inventory-model.js";
import { itemLine, itemMode } from "./item-label.js";

// The three things done to stock, as the team says them.
const kinds = [
  ["in", "Barang masuk"],
  ["out", "Barang keluar"],
  ["adjust", "Stock opname"],
];
const kindHelp = {
  in: "Barang baru dari pemasok, alat sewa yang kembali, atau barang lain yang masuk gudang.",
  out: "Barang yang dipakai operasional, rusak atau hilang, atau dijual langsung di toko. Pesanan online Dive Shop tercatat sendiri.",
  adjust:
    "Setelah menghitung barang di gudang, isi jumlah hasil hitungnya. Selisih dengan stok tercatat disimpan sebagai koreksi.",
};
const blank = (today, kind = "in", itemId = "") => ({
  date: today,
  itemId,
  kind,
  qty: "",
  reason: Object.keys(movementReasons[kind])[0],
  note: "",
});
const groupOf = (item) =>
  !item.shop
    ? "Bukan dari Dive Shop"
    : itemMode(item) === "rental"
      ? "Barang sewa"
      : "Barang jual";
const signed = (n) => (n > 0 ? "+" : "") + n;

// Keluar masuk: every change of stock in one place. The form records
// stock coming in, going out, or a stock opname; the list shows the
// month's movements, or one item's stock card with the stock after each
// movement. Barang & stok links here with ?barang=<id>&jenis=in|out to
// fill the form, and ?kartu=<id> to open an item's stock card.
export default function MovementsEditor({ request, today }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [items, setItems] = useState(null);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState(null);
  const [card, setCard] = useState(null);
  const [cardItem, setCardItem] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [form, setForm] = useState(blank(today));
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const qtyRef = useRef(null);
  const wantFocus = useRef(false);
  async function loadItems() {
    const result = await request("/api/admin/inventory/items");
    setProducts(result.products ?? []);
    setItems(result.items);
  }
  async function load(which = month, item = cardItem) {
    try {
      if (item) {
        setCard(
          await request(
            `/api/admin/inventory/movements?month=${which}&item=${encodeURIComponent(item)}`,
          ),
        );
        setMovements(null);
      } else {
        setMovements(
          (await request(`/api/admin/inventory/movements?month=${which}`))
            .movements,
        );
        setCard(null);
      }
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  // Links from Barang & stok fill the form or open a stock card.
  useEffect(() => {
    loadItems().catch((e) => setError(e.message));
    const url = new URL(window.location.href);
    const item = url.searchParams.get("barang");
    const kind = url.searchParams.get("jenis");
    const shown = url.searchParams.get("kartu");
    if (item) {
      setForm(blank(today, kind in movementKinds ? kind : "in", item));
      wantFocus.current = true;
    }
    if (shown || item) setCardItem(shown || item);
    if (item || shown) window.history.replaceState(null, "", url.pathname);
  }, []);
  useEffect(() => {
    load(month, cardItem);
  }, [month, cardItem]);
  // Once the items are in, the quantity of the item from the link gets
  // the focus, ready for the number.
  useEffect(() => {
    if (!items || !wantFocus.current) return;
    wantFocus.current = false;
    qtyRef.current?.focus();
  }, [items]);
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
  const byId = new Map((items ?? []).map((i) => [i.id, i]));
  const chosen = byId.get(form.itemId);
  const counted = form.kind === "adjust" && form.qty !== "";
  const change = counted && chosen ? opnameChange(form.qty, chosen.stock) : 0;
  const setKind = (kind) =>
    setForm((f) => ({
      ...f,
      kind,
      qty: "",
      reason: Object.keys(movementReasons[kind])[0],
    }));
  const set = (name) => (event) =>
    setForm((f) => ({ ...f, [name]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    if (form.kind === "adjust" && chosen && change === 0) {
      setError(
        `Stok ${itemLine(chosen)} sudah ${chosen.stock} ${chosen.unit}, sama dengan hasil hitung. Tidak ada yang perlu dicatat.`,
      );
      return;
    }
    const qty = form.kind === "adjust" ? change : Number(form.qty);
    return act(
      async () => {
        await request("/api/admin/inventory/movements", "POST", {
          ...form,
          qty,
        });
        if (form.date.slice(0, 7) !== month) setMonth(form.date.slice(0, 7));
        setForm((f) => ({ ...blank(today, f.kind, f.itemId) }));
      },
      form.kind === "adjust"
        ? `Stock opname ${itemLine(chosen)} tercatat, stok kini ${form.qty} ${chosen?.unit ?? ""} (${signed(change)}).`
        : `${movementKinds[form.kind]} ${qty} ${chosen?.unit ?? ""} ${itemLine(chosen)} tercatat. Stok kini ${(chosen?.stock ?? 0) + (form.kind === "in" ? qty : -qty)} ${chosen?.unit ?? ""}.`,
    );
  };
  const remove = (m) =>
    act(async () => {
      await request(`/api/admin/inventory/movements/${m.id}`, "DELETE");
      setRemoving(null);
    }, "Mutasi dihapus, stok dihitung ulang.");
  // Items to pick from, grouped as in Barang & stok and in the catalog's
  // order, each product's sizes in their order.
  const order = {
    "Barang jual": 0,
    "Barang sewa": 1,
    "Bukan dari Dive Shop": 2,
  };
  const placeOf = (id) => {
    const item = byId.get(id);
    const at = products.findIndex((p) => p.id === item?.shop?.productId);
    if (at < 0) return [Infinity, 0];
    return [at, (products[at].sizes ?? []).indexOf(item.shop.size)];
  };
  const byPlace = (a, b) => {
    const [x, y] = [placeOf(a.value), placeOf(b.value)];
    return (
      order[a.group] - order[b.group] ||
      x[0] - y[0] ||
      x[1] - y[1] ||
      a.label.localeCompare(b.label, "id", { numeric: true })
    );
  };
  const options = (items ?? [])
    .filter((i) => i.active !== false || i.id === form.itemId)
    .map((i) => ({
      value: i.id,
      label: itemLine(i),
      note: `stok ${i.stock} ${i.unit}`,
      group: groupOf(i),
    }))
    .sort(byPlace);
  const filterOptions = [
    { value: "", label: "Semua barang" },
    ...(items ?? []).map((i) => ({
      value: i.id,
      label: itemLine(i),
      group: groupOf(i),
    })),
  ].sort((a, b) => (!a.value ? -1 : !b.value ? 1 : byPlace(a, b)));
  const rows = (card ? card.movements : (movements ?? [])).filter(
    (m) => kindFilter === "all" || m.kind === kindFilter,
  );
  const unitOf = (id) => byId.get(id)?.unit ?? "";
  const shownItem = byId.get(cardItem);
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
      <section className="admin-card admin-move-card" id="movement-form">
        <h2>Catat mutasi stok</h2>
        <div
          className="admin-month-views admin-move-kinds"
          role="group"
          aria-label="Jenis mutasi"
        >
          {kinds.map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              aria-pressed={form.kind === kind}
              onClick={() => setKind(kind)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="admin-subtle">{kindHelp[form.kind]}</p>
        {items && !options.length ? (
          <p className="admin-empty">
            Belum ada barang. Tambahkan produk di Dive Shop, barangnya muncul di
            sini.
          </p>
        ) : (
          <form onSubmit={submit} className="admin-hr-form">
            <div className="admin-form-grid">
              <Field
                label="Barang"
                hint={
                  chosen
                    ? `Stok tercatat ${chosen.stock} ${chosen.unit}.`
                    : "Ketik nama, ukuran, atau Jual dan Sewa untuk mencari."
                }
              >
                <SearchSelect
                  required
                  value={form.itemId}
                  options={options}
                  placeholder="Cari barang…"
                  onChange={(itemId) => {
                    setForm((f) => ({ ...f, itemId }));
                    setTimeout(() => qtyRef.current?.focus(), 0);
                  }}
                />
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
                    ? `Jumlah hasil hitung${chosen ? ` (${chosen.unit})` : ""}`
                    : `Jumlah${chosen ? ` (${chosen.unit})` : ""}`
                }
                hint={
                  form.kind === "adjust" && chosen && counted
                    ? change === 0
                      ? "Sama dengan stok tercatat."
                      : `Selisih ${signed(change)} ${chosen.unit} dari stok tercatat ${chosen.stock}.`
                    : ""
                }
              >
                <input
                  ref={qtyRef}
                  type="number"
                  step={1}
                  min={form.kind === "adjust" ? 0 : 1}
                  required
                  value={form.qty}
                  onChange={set("qty")}
                />
              </Field>
              <Field label="Alasan">
                <select value={form.reason} onChange={set("reason")}>
                  {Object.entries(movementReasons[form.kind]).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Catatan (opsional)" className="is-wide">
                <input
                  maxLength={inventoryLimits.note}
                  placeholder="Nama pemasok, nomor nota, alasan rusak…"
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

      <section className="admin-card" id="daftar-mutasi">
        <MonthNav month={month} onChange={setMonth}>
          <a
            className="admin-button secondary admin-hr-export"
            href={`/api/admin/inventory/export?kind=movements&month=${month}`}
          >
            Unduh Excel
          </a>
        </MonthNav>
        <div className="admin-toolbar admin-move-tools">
          <div className="admin-move-item">
            <SearchSelect
              label="Saring barang"
              value={cardItem}
              options={filterOptions}
              placeholder="Semua barang"
              onChange={(value) => setCardItem(value)}
            />
          </div>
          <div
            className="admin-month-views"
            role="group"
            aria-label="Saring jenis mutasi"
          >
            {[["all", "Semua"], ...kinds].map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                aria-pressed={kindFilter === kind}
                onClick={() => setKindFilter(kind)}
              >
                {kind === "all" ? label : movementKinds[kind]}
              </button>
            ))}
          </div>
        </div>
        {card && shownItem && (
          <div className="admin-stock-card-head">
            <h3>Kartu stok {itemLine(shownItem)}</h3>
            <p>
              <span>
                Stok awal bulan{" "}
                <b>
                  {card.opening} {shownItem.unit}
                </b>
              </span>
              <span>
                Stok akhir bulan{" "}
                <b>
                  {card.closing} {shownItem.unit}
                </b>
              </span>
              <span>
                Stok sekarang{" "}
                <b>
                  {shownItem.stock} {shownItem.unit}
                </b>
              </span>
            </p>
          </div>
        )}
        {!movements && !card ? (
          <p className="admin-empty">Memuat mutasi…</p>
        ) : !rows.length ? (
          <p className="admin-empty">
            {card
              ? "Barang ini tidak bergerak bulan ini."
              : "Belum ada barang masuk atau keluar bulan ini."}
          </p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table admin-hr-table admin-moves">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  {!card && <th>Barang</th>}
                  <th>Jenis</th>
                  <th>Perubahan</th>
                  {card && <th>Sisa stok</th>}
                  <th>Alasan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const item = byId.get(m.itemId);
                  return (
                    <tr key={m.id} className={"move-" + m.kind}>
                      <td>{shortDay(m.date)}</td>
                      {!card && (
                        <td>
                          {item ? (
                            <button
                              type="button"
                              className="admin-text-button"
                              onClick={() => setCardItem(item.id)}
                            >
                              {itemLine(item)}
                            </button>
                          ) : (
                            <strong>Barang sudah dihapus</strong>
                          )}
                        </td>
                      )}
                      <td>{movementKinds[m.kind]}</td>
                      <td className="is-amount">
                        <strong>
                          {signed(delta(m))} {unitOf(m.itemId)}
                        </strong>
                      </td>
                      {card && (
                        <td className="is-amount">
                          {m.balance} {unitOf(m.itemId)}
                        </td>
                      )}
                      <td>
                        {movementReasons[m.kind]?.[m.reason]}
                        {m.note && <small>{m.note}</small>}
                      </td>
                      <td className="admin-user-actions">
                        {m.bookingId ? (
                          <small>Otomatis dari pesanan</small>
                        ) : removing === m.id ? (
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
