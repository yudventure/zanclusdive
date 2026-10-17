"use client";
import ImageUpload from "./ImageUpload.jsx";
import { cloneElement, useEffect, useId, useState } from "react";
import ProductVisual from "../shop/ProductVisual.jsx";
import {
  shopCategories,
  availabilityLabels,
  rupiah,
  sizeLimit,
} from "../shop-model.js";
import { sizesOf, unitForProduct, variantKey } from "../shop-stock.js";

function Field({ label, children }) {
  const id = useId();
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
export default function ShopEditor({
  shop,
  update,
  onSave,
  busy,
  media,
  placePhoto,
  request,
  canStock = false,
}) {
  const [selectedID, setSelectedID] = useState(shop.products[0]?.id);
  // The warehouse items, with their stock and the product each one serves.
  const [stock, setStock] = useState(null);
  const [stockError, setStockError] = useState("");
  useEffect(() => {
    if (busy || !request) return;
    request("/api/admin/shop-stock")
      .then((result) => {
        setStock(result.items);
        setStockError("");
      })
      .catch((e) => setStockError(e.message));
  }, [busy]);
  const product =
    shop.products.find((p) => p.id === selectedID) || shop.products[0];
  function editMany(patch) {
    update(
      "products",
      shop.products.map((p) => (p.id === product.id ? { ...p, ...patch } : p)),
    );
  }
  function edit(key, value) {
    update(
      "products",
      shop.products.map((p) =>
        p.id === product.id ? { ...p, [key]: value } : p,
      ),
    );
  }
  function add() {
    const id = crypto.randomUUID();
    update("products", [
      ...shop.products,
      {
        id,
        name: "Perlengkapan baru",
        category: "mask",
        description: "Isi deskripsi perlengkapan ini.",
        specification: "",
        image: "",
        saleEnabled: true,
        rentalEnabled: true,
        salePrice: null,
        rentalPrice: null,
        enabled: false,
        availability: "stock",
        sizes: [],
      },
    ]);
    setSelectedID(id);
  }
  function remove() {
    if (
      !confirm(
        `Hapus ${product.name} dari katalog? Tekan Simpan katalog untuk menerapkan perubahan.`,
      )
    )
      return;
    const remaining = shop.products.filter((p) => p.id !== product.id);
    update("products", remaining);
    setSelectedID(remaining[0]?.id);
  }
  return (
    <form className="admin-shop-form" onSubmit={onSave}>
      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <h2>Jual & rental perlengkapan</h2>
            <p className="admin-subtle">
              Kelola hingga 20 produk. Pengunjung menyusun pesanan dan
              menghubungi WhatsApp yang diatur pada menu Kontak.
            </p>
          </div>
          <a
            className="admin-button secondary"
            href="/dive-shop"
            target="_blank"
            rel="noopener noreferrer"
          >
            Lihat Dive Shop ↗
          </a>
        </div>
        <div className="admin-form-grid">
          <Field label="Judul Dive Shop">
            <input
              required
              maxLength={150}
              value={shop.heading}
              onChange={(e) => update("heading", e.target.value)}
            />
          </Field>
          <Field label="Deskripsi Dive Shop">
            <textarea
              required
              rows={3}
              maxLength={600}
              value={shop.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>
        </div>
      </section>
      <div className="admin-shop-layout">
        <section className="admin-card admin-shop-list">
          <div className="admin-card-heading">
            <h2>Produk ({shop.products.length})</h2>
            <button
              className="admin-button secondary"
              type="button"
              disabled={busy || shop.products.length >= 20}
              onClick={add}
            >
              + Tambah produk
            </button>
          </div>
          {shop.products.map((p) => (
            <button
              type="button"
              className={
                "admin-shop-item " + (product?.id === p.id ? "selected" : "")
              }
              key={p.id}
              onClick={() => setSelectedID(p.id)}
              aria-pressed={product?.id === p.id}
            >
              <div className="admin-shop-thumbnail">
                <ProductVisual product={p} />
              </div>
              <span>
                <strong>{p.name}</strong>
                <small>
                  {p.saleEnabled ? "Beli" : ""}
                  {p.saleEnabled && p.rentalEnabled ? " + " : ""}
                  {p.rentalEnabled ? "Rental" : ""} ·{" "}
                  {p.enabled ? "Tampil" : "Draft"}
                </small>
              </span>
            </button>
          ))}
          {!shop.products.length && (
            <p className="admin-subtle">
              Belum ada produk. Tambahkan perlengkapan pertama.
            </p>
          )}
        </section>
        {product && (
          <section className="admin-card admin-shop-detail" key={product.id}>
            <div className="admin-card-heading">
              <h2>Detail produk</h2>
              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={product.enabled}
                  onChange={(e) => edit("enabled", e.target.checked)}
                />
                Tampilkan produk di website
              </label>
            </div>
            <div className="admin-form-grid">
              <Field label="Nama produk">
                <input
                  required
                  maxLength={100}
                  value={product.name}
                  onChange={(e) => edit("name", e.target.value)}
                />
              </Field>
              <Field label="Kategori produk">
                <select
                  value={product.category}
                  onChange={(e) => edit("category", e.target.value)}
                >
                  {Object.entries(shopCategories).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Deskripsi produk">
                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  value={product.description}
                  onChange={(e) => edit("description", e.target.value)}
                />
              </Field>
              <Field label="Spesifikasi / ukuran">
                <textarea
                  rows={3}
                  maxLength={300}
                  value={product.specification}
                  onChange={(e) => edit("specification", e.target.value)}
                />
              </Field>
            </div>
            <div className="admin-shop-pricing">
              <div>
                <label className="admin-toggle">
                  <input
                    type="checkbox"
                    checked={product.saleEnabled}
                    onChange={(e) => edit("saleEnabled", e.target.checked)}
                  />
                  Dijual
                </label>
                <Field label="Harga jual (Rp)">
                  <input
                    type="number"
                    min={1}
                    max={1e9}
                    step={1}
                    disabled={!product.saleEnabled}
                    placeholder="Kosong = minta penawaran"
                    value={product.salePrice ?? ""}
                    onChange={(e) =>
                      edit(
                        "salePrice",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                  />
                </Field>
              </div>
              <div>
                <label className="admin-toggle">
                  <input
                    type="checkbox"
                    checked={product.rentalEnabled}
                    onChange={(e) => edit("rentalEnabled", e.target.checked)}
                  />
                  Disewakan
                </label>
                <Field label="Harga rental per hari (Rp)">
                  <input
                    type="number"
                    min={1}
                    max={1e9}
                    step={1}
                    disabled={!product.rentalEnabled}
                    placeholder="Kosong = minta penawaran"
                    value={product.rentalPrice ?? ""}
                    onChange={(e) =>
                      edit(
                        "rentalPrice",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                  />
                </Field>
              </div>
            </div>
            <p className="admin-subtle">
              Aktifkan minimal satu layanan. Harga kosong ditampilkan sebagai
              permintaan penawaran. Rental dihitung per unit per hari.
            </p>
            <SizesAndStock
              product={product}
              items={stock}
              error={stockError}
              canStock={canStock}
              edit={edit}
              editMany={editMany}
            />
            <div className="admin-shop-image-editor">
              <div className="admin-shop-preview">
                <ProductVisual product={product} />
              </div>
              <div>
                <ImageUpload
                  label={
                    product.image ? "Ganti foto produk" : "Upload foto produk"
                  }
                  onFile={(file) =>
                    placePhoto(file, (url) => edit("image", url))
                  }
                />
                <Field label="URL foto produk (opsional)">
                  <input
                    placeholder="URL HTTPS atau /api/media/…"
                    maxLength={1200}
                    value={product.image}
                    onChange={(e) => edit("image", e.target.value)}
                  />
                </Field>
                <Field label="Atau pilih dari koleksi">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) edit("image", e.target.value);
                    }}
                  >
                    <option value="">Pilih foto…</option>
                    {media.map((m) => (
                      <option key={m.id} value={m.url}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="admin-subtle">
                  Foto langsung terpasang setelah diupload. Tanpa foto, website
                  menampilkan ilustrasi alat.
                </p>
                {product.image && (
                  <button
                    type="button"
                    className="admin-inline"
                    onClick={() => edit("image", "")}
                  >
                    Gunakan ilustrasi
                  </button>
                )}
              </div>
            </div>
            <p className="admin-shop-price-preview">
              {product.saleEnabled &&
                `Jual ${product.salePrice === null ? "dengan penawaran" : rupiah(product.salePrice)}`}
              {product.saleEnabled && product.rentalEnabled && " · "}
              {product.rentalEnabled &&
                `Rental ${product.rentalPrice === null ? "dengan penawaran" : rupiah(product.rentalPrice) + " per hari"}`}
            </p>
            <button
              type="button"
              className="admin-inline danger"
              disabled={busy}
              onClick={remove}
            >
              Hapus produk ini
            </button>
          </section>
        )}
      </div>
      <div className="admin-shop-save">
        <p>Perubahan diterapkan setelah menekan Simpan katalog.</p>
        <button className="admin-button" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan katalog Dive Shop"}
        </button>
      </div>
    </form>
  );
}

// Sizes, stock and availability of one product, in one place. Each size
// (or the product, without sizes) is an item in Gudang. A count typed here
// is saved with the catalog as a stock opname in the warehouse.
function SizesAndStock({ product, items, error, canStock, edit, editMany }) {
  const [draft, setDraft] = useState("");
  const sizes = product.sizes ?? [];
  const byVariant = new Map(
    (items ?? [])
      .filter((item) => item.productId)
      .map((item) => [variantKey(item.productId, item.size), item]),
  );
  const unit = (size) =>
    byVariant.get(variantKey(product.id, size))?.unit ??
    unitForProduct(product);
  // An item without a size that this product leaves behind when it gets
  // sizes, so its stock is not lost from sight.
  const before = sizes.length ? byVariant.get(product.id) : null;
  function addSizes() {
    const next = [...sizes];
    for (const raw of draft.split(",")) {
      const size = raw.trim().replace(/\s+/g, " ").slice(0, 16);
      if (
        size &&
        !/[<>]|::/.test(size) &&
        next.length < sizeLimit &&
        !next.some((s) => s.toLowerCase() === size.toLowerCase())
      )
        next.push(size);
    }
    edit("sizes", next);
    setDraft("");
  }
  function setCount(size, value) {
    editMany({
      stockCounts: { ...product.stockCounts, [size]: value },
      // Typing the stock means the website should follow it.
      ...(product.availability === "request" ? { availability: "stock" } : {}),
    });
  }
  return (
    <section className="admin-shop-stock" aria-label="Ukuran dan stok">
      <h3>Ukuran & stok</h3>
      <div className="admin-size-row">
        <Field label="Ukuran">
          <input
            maxLength={120}
            placeholder="Contoh S, M, L, XL"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSizes();
              }
            }}
          />
        </Field>
        <button
          type="button"
          className="admin-button secondary"
          disabled={!draft.trim() || sizes.length >= sizeLimit}
          onClick={addSizes}
        >
          Tambah ukuran
        </button>
      </div>
      {sizes.length ? (
        <ul className="admin-size-chips" aria-label="Ukuran produk">
          {sizes.map((size) => (
            <li key={size}>
              {size}
              <button
                type="button"
                aria-label={`Hapus ukuran ${size}`}
                onClick={() =>
                  edit(
                    "sizes",
                    sizes.filter((s) => s !== size),
                  )
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="admin-subtle">
          Tanpa ukuran. Tambahkan ukuran kalau tamu perlu memilih, misalnya
          wetsuit, fin, atau BCD.
        </p>
      )}
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : !items ? (
        <p className="admin-subtle">Memuat stok…</p>
      ) : (
        <div className="admin-stock-rows">
          {sizesOf(product).map((size) => {
            const item = byVariant.get(variantKey(product.id, size));
            const held = item?.shop;
            const typed = product.stockCounts?.[size];
            const notes = [
              held?.rentedToday && `${held.rentedToday} disewa hari ini`,
              held?.bookedLater && `${held.bookedLater} dipesan untuk nanti`,
              held?.waiting && `${held.waiting} menunggu pembayaran`,
            ].filter(Boolean);
            return (
              <div className="admin-stock-row" key={size || "all"}>
                <Field label={size ? `Stok ukuran ${size}` : "Stok"}>
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    step={1}
                    placeholder="0"
                    value={typed ?? item?.stock ?? ""}
                    onChange={(e) => setCount(size, e.target.value)}
                  />
                </Field>
                <span className="admin-stock-unit">{unit(size)}</span>
                <small>
                  {notes.length
                    ? notes.join(", ")
                    : item
                      ? "Belum ada pesanan"
                      : "Baru, tersimpan saat katalog disimpan"}
                </small>
              </div>
            );
          })}
        </div>
      )}
      {before && before.stock > 0 && (
        <p className="admin-subtle is-warn">
          Stok lama tanpa ukuran ({before.stock} {before.unit}) tetap di Gudang
          sebagai barang biasa. Isi stok tiap ukuran di atas.
        </p>
      )}
      <Field label="Ketersediaan di website">
        <select
          value={product.availability}
          onChange={(e) => edit("availability", e.target.value)}
        >
          {Object.entries(availabilityLabels).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <p className="admin-subtle">
        {product.availability === "stock"
          ? "Website menampilkan sisa stok, dan pesanan online tidak bisa melebihinya. Penjualan online mengurangi stok sendiri, sewa online memakai unit pada tanggal sewanya."
          : "Stok tetap tercatat di Gudang, tapi website tidak memeriksanya. Pilih Ikuti stok gudang supaya website menampilkan sisa stok."}
      </p>
      {canStock && (
        <a className="admin-inline" href="/admin/stock">
          Buka Barang & stok
        </a>
      )}
    </section>
  );
}
