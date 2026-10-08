"use client";
import { cloneElement, useId, useState } from "react";
import ProductVisual from "../shop/ProductVisual.jsx";
import { shopCategories, availabilityLabels, rupiah } from "../shop-model.js";

function Field({ label, children }) {
  const id = useId();
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
export default function ShopEditor({ shop, update, onSave, busy, media }) {
  const [selectedID, setSelectedID] = useState(shop.products[0]?.id);
  const product =
    shop.products.find((p) => p.id === selectedID) || shop.products[0];
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
        availability: "request",
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
              permintaan penawaran; rental dihitung per unit per hari.
            </p>
            <Field label="Ketersediaan produk">
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
            <div className="admin-shop-image-editor">
              <div className="admin-shop-preview">
                <ProductVisual product={product} />
              </div>
              <div>
                <Field label="URL foto produk (opsional)">
                  <input
                    placeholder="URL HTTPS atau /api/media/…"
                    maxLength={1200}
                    value={product.image}
                    onChange={(e) => edit("image", e.target.value)}
                  />
                </Field>
                <Field label="Pilih foto dari media">
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
                  Upload foto di menu Foto & media, lalu pilih di sini. Tanpa
                  foto, website menampilkan ilustrasi alat.
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
                `Jual: ${product.salePrice === null ? "Minta penawaran" : rupiah(product.salePrice)}`}
              {product.saleEnabled && product.rentalEnabled && " · "}
              {product.rentalEnabled &&
                `Rental: ${product.rentalPrice === null ? "Minta penawaran" : rupiah(product.rentalPrice) + " / hari"}`}
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
