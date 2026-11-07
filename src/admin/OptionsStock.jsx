"use client";
import { useId, useState } from "react";
import ProductVisual from "../shop/ProductVisual.jsx";
import {
  availabilityLabels,
  productAs,
  rupiah,
  sizeLimit,
} from "../shop-model.js";
import { sizesOf, unitForProduct, variantKey } from "../shop-stock.js";
import { sameText, valueChoices } from "../spec-suggest.js";
import { OptionValues } from "./VariantTable.jsx";

const modeOf = (product) => (product.saleEnabled ? "sale" : "rental");
const priceKey = (product) =>
  product.saleEnabled ? "salePrice" : "rentalPrice";
const words = {
  sale: { title: "Pilihan & stok jual", stock: "Stok jual" },
  rental: { title: "Pilihan & stok sewa", stock: "Stok sewa" },
};

// The sizes of a product, or of every variant of it at once: typed (one
// or several, "S, M, L") and removed as chips.
function SizeOption({ sizes, onChange }) {
  const id = useId();
  const [draft, setDraft] = useState("");
  function add() {
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
    onChange(next);
    setDraft("");
  }
  return (
    <div className="admin-field">
      <label htmlFor={id}>Ukuran</label>
      <div className="admin-size-row">
        <input
          id={id}
          maxLength={120}
          placeholder="Contoh S, M, L, XL, lalu Enter"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          className="admin-button secondary"
          disabled={!draft.trim() || sizes.length >= sizeLimit}
          onClick={add}
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
                onClick={() => onChange(sizes.filter((s) => s !== size))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <small className="admin-subtle">
          Tanpa ukuran. Tambahkan ukuran kalau tamu perlu memilih, misalnya
          wetsuit, fin, atau BCD.
        </small>
      )}
    </div>
  );
}

// What waits on a unit of stock: orders not paid yet, or rental gear out
// today and booked for later.
function heldNote(item, mode) {
  const held = item?.shop;
  return (
    mode === "rental"
      ? [
          held?.rentedToday && `${held.rentedToday} disewa hari ini`,
          held?.bookedLater && `${held.bookedLater} dipesan untuk nanti`,
        ]
      : [held?.waiting && `${held.waiting} menunggu pembayaran`]
  )
    .filter(Boolean)
    .join(", ");
}

// The options of a product and its stock in one place, like a
// marketplace: a choice such as Warna with its values (each value is a
// variant, its own product with its own photos and price), the sizes, and
// one stock table that splits by variant and size as soon as there are
// any. Then how the website follows the stock.
export default function OptionsStock({
  mode,
  product,
  family,
  catalog,
  others,
  items,
  itemsError,
  canStock,
  canAddVariant,
  disabled,
  editProduct,
  setStock,
  setFamilySizes,
  onAddValue,
  onOpen,
  onJoin,
  onLeave,
}) {
  const id = useId();
  const t = words[mode];
  const lead = family[0];
  const many = family.length > 1;
  const choice = lead.variantLabel || "";
  const byVariant = new Map(
    (items ?? [])
      .filter((item) => item.productId)
      .map((item) => [variantKey(item.productId, item.mode, item.size), item]),
  );
  const itemOf = (p, size) => byVariant.get(variantKey(p.id, modeOf(p), size));
  const stockOf = (p, size) => {
    const typed = p.stockCounts?.[modeOf(p)]?.[size];
    if (typed !== undefined && typed !== "") return typed;
    return itemOf(p, size)?.stock ?? "";
  };
  const sizes = [...new Set(family.flatMap((p) => p.sizes ?? []))];
  const total = family.reduce(
    (sum, p) =>
      sum +
      sizesOf(p).reduce((n, size) => n + (Number(stockOf(p, size)) || 0), 0),
    0,
  );
  // Values the catalog already uses for this choice: other families'
  // variants and spec rows with the same name.
  const choices = [
    ...new Set([
      ...catalog
        .filter(
          (p) =>
            p.variant &&
            sameText(
              (catalog.find((q) => q.id === (p.variantOf || p.id)) ?? p)
                .variantLabel ?? "",
              choice,
            ),
        )
        .map((p) => p.variant),
      ...valueChoices(catalog, choice),
    ]),
  ];
  // An item without a size that this product leaves behind when it gets
  // sizes, so its stock is not lost from sight.
  const before = (product.sizes ?? []).length ? itemOf(product, "") : null;
  const name = (p) => p.variant || p.name;
  const stockInputs = (p) =>
    sizesOf(p).map((size) => {
      const note = heldNote(itemOf(p, size), mode);
      return (
        <label key={size || "all"} className="admin-stock-cell">
          {size && <span>{size}</span>}
          <input
            type="number"
            min={0}
            max={100000}
            step={1}
            placeholder="0"
            aria-label={
              many
                ? `Stok ${name(p)}${size ? ` ukuran ${size}` : ""}`
                : `${t.stock}${size ? ` ukuran ${size}` : ""}`
            }
            value={stockOf(p, size)}
            onChange={(e) => setStock(p, size, e.target.value)}
          />
          {note && <small>{note}</small>}
        </label>
      );
    });
  return (
    <section
      className="admin-shop-stock admin-options-stock"
      aria-label={t.title}
    >
      <h3>{t.title}</h3>
      <p className="admin-subtle">
        Ada warna, tipe, atau ukuran berbeda? Isi pilihannya di sini, lalu
        stoknya langsung terpecah per pilihan di tabel bawah.
      </p>
      <div className="admin-option-rows">
        <div className="admin-option-row">
          <div className="admin-field">
            <label htmlFor={`${id}-choice`}>Jenis pilihan</label>
            <input
              id={`${id}-choice`}
              maxLength={30}
              placeholder="Warna atau Tipe"
              value={choice}
              onChange={(e) =>
                editProduct(lead.id, { variantLabel: e.target.value })
              }
            />
          </div>
          <OptionValues
            id={`${id}-values`}
            label={choice || "Varian"}
            family={family}
            current={product.id}
            choices={choices}
            canAdd={!disabled && canAddVariant}
            onAdd={onAddValue}
            onOpen={onOpen}
          />
        </div>
        <SizeOption sizes={sizes} onChange={setFamilySizes} />
      </div>
      {itemsError ? (
        <p className="admin-error" role="alert">
          {itemsError}
        </p>
      ) : !items ? (
        <p className="admin-subtle">Memuat stok…</p>
      ) : (
        <div
          className={"admin-variant-table" + (many ? "" : " is-single")}
          role="table"
          aria-label={
            many
              ? "Harga dan stok varian"
              : `Tabel ${t.stock.toLocaleLowerCase("id")}`
          }
        >
          {many && (
            <div className="admin-variant-row is-head" role="row">
              <span role="columnheader">{choice || "Varian"}</span>
              <span role="columnheader">Harga (Rp)</span>
              <span role="columnheader">
                {sizes.length ? "Stok per ukuran" : "Stok"}
              </span>
              <span role="columnheader">Tampil</span>
            </div>
          )}
          {many ? (
            family.map((p) => (
              <div
                key={p.id}
                role="row"
                className={
                  "admin-variant-row" +
                  (p.id === product.id ? " is-current" : "")
                }
              >
                <span role="cell" className="admin-variant-name">
                  <button
                    type="button"
                    className="admin-shop-thumbnail"
                    aria-label={`Buka varian ${name(p)}`}
                    onClick={() => onOpen(p.id)}
                  >
                    <ProductVisual product={productAs(p, modeOf(p))} />
                  </button>
                  <input
                    aria-label={`Nama varian ${p.name}`}
                    maxLength={40}
                    placeholder="Nama varian"
                    value={p.variant ?? ""}
                    onChange={(e) =>
                      editProduct(p.id, { variant: e.target.value })
                    }
                  />
                </span>
                <span role="cell">
                  <input
                    type="number"
                    min={1}
                    max={1e9}
                    step={1}
                    aria-label={`Harga ${name(p)}`}
                    placeholder="Penawaran"
                    value={p[priceKey(p)] ?? ""}
                    onChange={(e) =>
                      editProduct(p.id, {
                        [priceKey(p)]:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </span>
                <span role="cell" className="admin-variant-stock">
                  {stockInputs(p)}
                </span>
                <span role="cell">
                  <input
                    type="checkbox"
                    aria-label={`Tampilkan ${name(p)} di website`}
                    checked={p.enabled}
                    onChange={(e) =>
                      editProduct(p.id, { enabled: e.target.checked })
                    }
                  />
                </span>
              </div>
            ))
          ) : (
            <div className="admin-variant-row" role="row">
              <span role="cell" className="admin-variant-stock">
                {stockInputs(product)}
              </span>
            </div>
          )}
          <p className="admin-variant-total">
            Total stok {total} {unitForProduct(lead)}
            {many
              ? `. Harga ${[...new Set(family.map((p) => p[priceKey(p)]))]
                  .map((n) =>
                    n === null || n === undefined ? "penawaran" : rupiah(n),
                  )
                  .join(", ")}.`
              : "."}
          </p>
        </div>
      )}
      {before && before.stock > 0 && (
        <p className="admin-subtle is-warn">
          {t.stock} lama tanpa ukuran ({before.stock} {before.unit}) tetap di
          Gudang sebagai barang biasa. Isi stok tiap ukuran di atas.
        </p>
      )}
      <div className="admin-field">
        <label htmlFor={`${id}-availability`}>Ketersediaan di website</label>
        <select
          id={`${id}-availability`}
          value={product.availability}
          onChange={(e) =>
            family.forEach((p) =>
              editProduct(p.id, { availability: e.target.value }),
            )
          }
        >
          {Object.entries(availabilityLabels).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <p className="admin-subtle">
        {product.availability !== "stock"
          ? "Stok tetap tercatat di Gudang, tapi website tidak memeriksanya. Pilih Ikuti stok gudang supaya website menampilkan sisa stok."
          : mode === "sale"
            ? "Website menampilkan sisa stok, dan pesanan online tidak bisa melebihinya. Penjualan online mengurangi stoknya."
            : "Website menampilkan sisa alat, dan sewa online tidak bisa melebihinya pada tanggal sewanya. Sewa yang dicatat di Kalender reservasi ikut dihitung, lalu alatnya kembali."}
      </p>
      <div className="admin-shop-variant-actions">
        {canStock && (
          <a className="admin-inline" href="/admin/stock">
            Buka Barang & stok
          </a>
        )}
        {!many && others.length > 0 && (
          <select
            aria-label="Jadikan varian dari produk lain"
            value=""
            disabled={disabled}
            onChange={(e) => e.target.value && onJoin(e.target.value)}
          >
            <option value="">Jadikan varian dari produk lain…</option>
            {others.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {many && (
          <button
            type="button"
            className="admin-inline"
            disabled={disabled}
            onClick={onLeave}
          >
            Lepas produk ini dari varian
          </button>
        )}
      </div>
      {many && (
        <p className="admin-subtle">
          Tiap {choice ? choice.toLocaleLowerCase("id") : "varian"} punya foto
          dan nama produknya sendiri, dibuka dengan mengklik pilihannya atau
          fotonya. Varian baru masih Draft sampai dicentang Tampil.
        </p>
      )}
    </section>
  );
}
