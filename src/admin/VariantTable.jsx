"use client";
import { useId, useState } from "react";
import ProductVisual from "../shop/ProductVisual.jsx";
import { productAs, rupiah } from "../shop-model.js";
import { sizesOf, unitForProduct, variantKey } from "../shop-stock.js";
import { matching, sameText, valueChoices } from "../spec-suggest.js";
import { useOutsideClose } from "./useOutsideClose.js";

const modeOf = (product) => (product.saleEnabled ? "sale" : "rental");
const priceKey = (product) =>
  product.saleEnabled ? "salePrice" : "rentalPrice";

// The values of the choice (Merah, Putih), as chips: one per variant. A
// value typed or picked from the ones the catalog uses for the same
// choice becomes a new variant; a chip opens its variant.
function OptionValues({
  id,
  label,
  family,
  current,
  choices,
  canAdd,
  onAdd,
  onOpen,
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const names = family.map((p) => p.variant || "");
  const typed = text.trim();
  const shown = matching(
    choices.filter((c) => !names.some((n) => sameText(n, c))),
    typed,
  ).slice(0, 12);
  const isNew =
    typed &&
    !names.some((n) => sameText(n, typed)) &&
    !shown.some((c) => sameText(c, typed));
  function add(value) {
    if (!value || names.some((n) => sameText(n, value)) || !canAdd) return;
    onAdd(value);
    setText("");
  }
  return (
    <div className="admin-field">
      <label htmlFor={id}>Pilihan {label.toLocaleLowerCase("id")}</label>
      <div className="admin-combo" ref={ref}>
        <div className="admin-chips">
          {family
            .filter((p) => p.variant)
            .map((p) => (
              <button
                type="button"
                key={p.id}
                className={
                  "admin-chip is-link" + (p.id === current ? " is-current" : "")
                }
                aria-current={p.id === current ? "true" : undefined}
                onClick={() => onOpen(p.id)}
              >
                {p.variant}
              </button>
            ))}
          <input
            id={id}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && (shown.length > 0 || Boolean(isNew))}
            aria-controls={`${id}-list`}
            autoComplete="off"
            maxLength={40}
            disabled={!canAdd}
            placeholder={
              names.some(Boolean)
                ? "Tambah pilihan, lalu Enter"
                : "Misalnya Merah, lalu Enter"
            }
            value={text}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              if (/,\s?$/.test(e.target.value) && typed) {
                add(typed.replace(/,$/, "").trim());
                return;
              }
              setText(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(typed);
              } else if (e.key === "Escape") setOpen(false);
            }}
          />
        </div>
        {open && (shown.length > 0 || isNew) && (
          <ul className="admin-combo-list" id={`${id}-list`} role="listbox">
            {shown.map((choice) => (
              <li
                key={choice}
                role="option"
                aria-selected="false"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => add(choice)}
              >
                {choice}
              </li>
            ))}
            {isNew && (
              <li
                role="option"
                aria-selected="false"
                className="is-new"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => add(typed)}
              >
                Tambah “{typed}”
              </li>
            )}
          </ul>
        )}
      </div>
      <small className="admin-subtle">
        {names.some(Boolean)
          ? "Pilihan baru langsung jadi varian baru di tabel bawah, dengan harga dan ukuran yang sama. Klik pilihan untuk membuka variannya."
          : "Pilihan pertama menjadi nama varian produk ini, berikutnya jadi varian baru."}
      </small>
    </div>
  );
}

// Every variant on one table, like a marketplace: its photo and name, its
// price and its stock (per size when it has sizes), and whether the
// website shows it. The rest of a variant (photos, texts) is edited by
// opening it.
function VariantStock({
  family,
  current,
  items,
  itemsError,
  editProduct,
  setStock,
  onOpen,
}) {
  const byVariant = new Map(
    (items ?? [])
      .filter((item) => item.productId)
      .map((item) => [variantKey(item.productId, item.mode, item.size), item]),
  );
  const stockOf = (p, size) => {
    const typed = p.stockCounts?.[modeOf(p)]?.[size];
    if (typed !== undefined && typed !== "") return typed;
    return byVariant.get(variantKey(p.id, modeOf(p), size))?.stock ?? "";
  };
  const total = family.reduce(
    (sum, p) =>
      sum +
      sizesOf(p).reduce((n, size) => n + (Number(stockOf(p, size)) || 0), 0),
    0,
  );
  return (
    <div
      className="admin-variant-table"
      role="table"
      aria-label="Harga dan stok varian"
    >
      <div className="admin-variant-row is-head" role="row">
        <span role="columnheader">Varian</span>
        <span role="columnheader">Harga (Rp)</span>
        <span role="columnheader">Stok</span>
        <span role="columnheader">Tampil</span>
      </div>
      {family.map((p) => (
        <div
          key={p.id}
          role="row"
          className={
            "admin-variant-row" + (p.id === current ? " is-current" : "")
          }
        >
          <span role="cell" className="admin-variant-name">
            <button
              type="button"
              className="admin-shop-thumbnail"
              aria-label={`Buka varian ${p.variant || p.name}`}
              onClick={() => onOpen(p.id)}
            >
              <ProductVisual product={productAs(p, modeOf(p))} />
            </button>
            <input
              aria-label={`Nama varian ${p.name}`}
              maxLength={40}
              placeholder="Nama varian"
              value={p.variant ?? ""}
              onChange={(e) => editProduct(p.id, { variant: e.target.value })}
            />
          </span>
          <span role="cell">
            <input
              type="number"
              min={1}
              max={1e9}
              step={1}
              aria-label={`Harga ${p.variant || p.name}`}
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
            {itemsError ? (
              <small className="admin-subtle">Stok belum bisa dibaca.</small>
            ) : !items ? (
              <small className="admin-subtle">Memuat stok…</small>
            ) : (
              sizesOf(p).map((size) => (
                <label key={size || "all"}>
                  {size && <span>{size}</span>}
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    step={1}
                    placeholder="0"
                    aria-label={`Stok ${p.variant || p.name}${size ? ` ukuran ${size}` : ""}`}
                    value={stockOf(p, size)}
                    onChange={(e) => setStock(p, size, e.target.value)}
                  />
                </label>
              ))
            )}
          </span>
          <span role="cell">
            <input
              type="checkbox"
              aria-label={`Tampilkan ${p.variant || p.name} di website`}
              checked={p.enabled}
              onChange={(e) => editProduct(p.id, { enabled: e.target.checked })}
            />
          </span>
        </div>
      ))}
      <p className="admin-variant-total">
        Total stok {total} {unitForProduct(family[0])}. Harga{" "}
        {[...new Set(family.map((p) => p[priceKey(p)]))]
          .map((n) => (n === null || n === undefined ? "penawaran" : rupiah(n)))
          .join(", ")}
        .
      </p>
    </div>
  );
}

// One model in several variants, such as colours: each variant is its own
// product with its own photos, price, stock and sizes, and the website
// shows the family as one card with the variants to pick.
export default function ProductVariants({
  product,
  family,
  others,
  catalog,
  disabled,
  canAdd,
  items,
  itemsError,
  editProduct,
  setStock,
  onOpen,
  onAddValue,
  onJoin,
  onLeave,
}) {
  const id = useId();
  const lead = family[0];
  const many = family.length > 1;
  const label = lead.variantLabel || "Varian";
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
              lead.variantLabel ?? "",
            ),
        )
        .map((p) => p.variant),
      ...valueChoices(catalog, lead.variantLabel),
    ]),
  ];
  return (
    <section className="admin-shop-variants" aria-label="Varian">
      <h3>{many ? `Varian (${family.length})` : "Varian"}</h3>
      <p>
        {many
          ? "Tampil sebagai satu kartu di website. Harga dan stok tiap varian diisi di tabel ini, foto dan teksnya dengan membuka variannya."
          : "Satu model dalam beberapa warna atau tipe? Isi jenis pilihannya, lalu ketik pilihannya satu per satu. Tiap pilihan jadi varian dengan foto, harga, dan stoknya sendiri."}
      </p>
      <div className="admin-form-grid">
        <div className="admin-field">
          <label htmlFor={`${id}-label`}>Jenis pilihan</label>
          <input
            id={`${id}-label`}
            maxLength={30}
            placeholder="Warna"
            value={lead.variantLabel ?? ""}
            onChange={(e) =>
              editProduct(lead.id, { variantLabel: e.target.value })
            }
          />
          <small className="admin-subtle">
            Judul di atas tombol varian, misalnya Warna, Tipe, atau Ketebalan.
          </small>
        </div>
        <OptionValues
          id={`${id}-values`}
          label={lead.variantLabel || "Varian"}
          family={family}
          current={product.id}
          choices={choices}
          canAdd={!disabled && canAdd}
          onAdd={onAddValue}
          onOpen={onOpen}
        />
      </div>
      {many && (
        <VariantStock
          family={family}
          current={product.id}
          items={items}
          itemsError={itemsError}
          editProduct={editProduct}
          setStock={setStock}
          onOpen={onOpen}
        />
      )}
      <div className="admin-shop-variant-actions">
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
          Nama produk tiap varian harus berbeda, misalnya Masker Poseidon Red
          Line dan Masker Poseidon Black Line, supaya pesanan tidak tertukar.
          Varian baru masih Draft sampai dicentang Tampil.
        </p>
      )}
    </section>
  );
}
