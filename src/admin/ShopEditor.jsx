"use client";
import Thumb from "./Thumb.jsx";
import ImageUpload from "./ImageUpload.jsx";
import { cloneElement, useEffect, useId, useState } from "react";
import ProductVisual from "../shop/ProductVisual.jsx";
import {
  shopCategories,
  availabilityLabels,
  rupiah,
  sizeLimit,
  productImages,
  productAs,
  productLimits,
  shopProductLimit,
  pairOf,
  deliveryOf,
  deliveryZoneLimit,
  familyId,
  familyOf,
  variantLimit,
  discountOf,
} from "../shop-model.js";
import { videoPlatforms, videoSource } from "../gallery.js";
import {
  productMdExample,
  readProductMd,
  storyBlocks,
} from "../product-story.js";
import ProductStory from "../shop/ProductStory.jsx";
import SpecTable from "./SpecTable.jsx";
import OptionsStock from "./OptionsStock.jsx";
import { sizesOf, unitForProduct, variantKey } from "../shop-stock.js";
import {
  cleanCode,
  newVoucher,
  voucherKinds,
  voucherLimit,
  voucherPlaces,
  voucherPlaceText,
  placesOf,
  voucherSummary,
  voucherUses,
} from "../voucher-model.js";

function Field({ label, hint, children }) {
  const id = useId();
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
      {hint && <small className="admin-subtle">{hint}</small>}
    </div>
  );
}
// Gear for sale and rental gear are kept apart: each has its own list,
// with its own products, photos, prices and stock. Rental gear is the dive
// center's own, lent out and brought back, so its stock is counted per day
// in the reservation calendar.
const kinds = {
  sale: {
    title: "Barang jual",
    text: "Barang baru untuk dibeli tamu. Stoknya berkurang saat terjual.",
    add: "+ Tambah barang jual",
    detail: "Detail barang jual",
    name: "Barang jual baru",
    empty: "Belum ada barang jual. Tambahkan barang pertama.",
    remove: "Hapus barang jual ini",
  },
  rental: {
    title: "Barang sewa",
    text: "Alat milik dive center yang disewakan lalu kembali. Terhubung ke Kalender reservasi.",
    add: "+ Tambah barang sewa",
    detail: "Detail barang sewa",
    name: "Alat sewa baru",
    empty: "Belum ada barang sewa. Tambahkan alat pertama.",
    remove: "Hapus barang sewa ini",
  },
};
const kindOf = (product) => (product.saleEnabled ? "sale" : "rental");
const priceText = (product) => {
  const sale = product.saleEnabled;
  const price = sale ? product.salePrice : product.rentalPrice;
  if (price === null) return "Harga lewat penawaran";
  const off = discountOf(product, sale ? "sale" : "rental");
  return (
    (sale ? rupiah(price) : `${rupiah(price)} per hari`) +
    (off ? `, hemat ${off.percent}%` : "")
  );
};

export default function ShopEditor({
  shop,
  update,
  onSave,
  busy,
  media,
  placePhoto,
  request,
  canStock = false,
  canCalendar = false,
  locale = "id",
  onImport,
  onCopyTexts,
  bookings,
}) {
  const [kind, setKind] = useState(() =>
    shop.products[0] ? kindOf(shop.products[0]) : "sale",
  );
  const [selectedID, setSelectedID] = useState(shop.products[0]?.id);
  // The list of one kind, searched by name.
  const [find, setFind] = useState("");
  const ofKind = shop.products.filter((p) => kindOf(p) === kind);
  // Variants listed right under their family's lead.
  const ordered = ofKind.flatMap((p) =>
    p.variantOf && ofKind.some((q) => q.id === p.variantOf)
      ? []
      : [p, ...ofKind.filter((q) => q.variantOf === p.id)],
  );
  const listed = ordered.filter((p) =>
    [p.name, p.variant ?? ""].some((text) =>
      text.toLowerCase().includes(find.trim().toLowerCase()),
    ),
  );
  const count = (k) => shop.products.filter((p) => kindOf(p) === k).length;
  const t = kinds[kind];
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
  const product = ofKind.find((p) => p.id === selectedID) || ofKind[0];
  const pair = product && pairOf(shop.products, product);
  const family = product ? familyOf(ofKind, product) : [];
  const full = shop.products.length >= shopProductLimit;
  function show(next, id) {
    setKind(next);
    setFind("");
    setSelectedID(id ?? shop.products.find((p) => kindOf(p) === next)?.id);
  }
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
        name: t.name,
        category: "mask",
        description: "Isi deskripsi perlengkapan ini.",
        specification: "",
        image: "",
        saleEnabled: kind === "sale",
        rentalEnabled: kind === "rental",
        salePrice: null,
        rentalPrice: null,
        enabled: false,
        availability: "stock",
        sizes: [],
        images: [],
        rentalImages: [],
        videos: [],
        details: "",
        specs: [],
      },
    ]);
    setFind("");
    setSelectedID(id);
  }
  // The same model the other way: its name, texts, specs, videos and
  // sizes, without the photos, price and stock, which belong to each way.
  function copyOther() {
    const id = crypto.randomUUID();
    const toRent = kind === "sale";
    const copy = {
      ...product,
      id,
      saleEnabled: !toRent,
      rentalEnabled: toRent,
      salePrice: null,
      rentalPrice: null,
      image: "",
      images: [],
      rentalImages: [],
      enabled: false,
      availability: "stock",
    };
    delete copy.pair;
    delete copy.stockCounts;
    // The other way has its own price, so no crossed-out price yet.
    delete copy.comparePrice;
    // The other way has its own variants.
    delete copy.variantOf;
    delete copy.variant;
    delete copy.variantLabel;
    if (toRent) copy.pair = product.id;
    update("products", (products) => [
      ...products.map((p) =>
        !toRent && p.id === product.id ? { ...p, pair: id } : p,
      ),
      copy,
    ]);
    onCopyTexts?.(product.id, id, ["variant", "variantLabel"]);
    show(toRent ? "rental" : "sale", id);
  }
  // Any product of the catalog changed in place: a patch, or a function of
  // the product as it is now.
  function editProduct(id, patch) {
    update("products", (products) =>
      products.map((p) =>
        p.id === id
          ? { ...p, ...(typeof patch === "function" ? patch(p) : patch) }
          : p,
      ),
    );
  }
  // A variant's stock typed in the variants table, as in its own editor.
  function setVariantStock(target, size, value) {
    const mode = kindOf(target);
    editProduct(target.id, (p) => ({
      stockCounts: {
        ...p.stockCounts,
        [mode]: { ...p.stockCounts?.[mode], [size]: value },
      },
      ...(["request", "available"].includes(p.availability)
        ? { availability: "stock" }
        : {}),
    }));
  }
  // A value of the choice typed in the Varian section. The first names
  // this product; each next one becomes a new variant: a copy of the lead
  // (texts, price, sizes, specs and videos) without its photos and stock,
  // kept as a draft right after the family, named after the lead with the
  // value in place of the lead's own.
  function addVariantValue(value) {
    if (family.length < 2 && !product.variant) {
      edit("variant", value);
      return;
    }
    const lead = family[0];
    const leadId = lead.id;
    const id = crypto.randomUUID();
    const base =
      lead.variant &&
      lead.name
        .toLocaleLowerCase("id")
        .includes(lead.variant.toLocaleLowerCase("id"))
        ? lead.name.replace(
            new RegExp(
              lead.variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              "i",
            ),
            value,
          )
        : `${lead.name} ${value}`;
    let name = base.slice(0, 100);
    for (let n = 2; shop.products.some((p) => p.name === name); n++)
      name = `${base.slice(0, 95)} ${n}`;
    const copy = {
      ...lead,
      id,
      variantOf: leadId,
      variant: value,
      name,
      image: "",
      images: [],
      rentalImages: [],
      enabled: false,
    };
    delete copy.pair;
    delete copy.stockCounts;
    delete copy.variantLabel;
    update("products", (products) => {
      const last = products.reduce(
        (at, p, index) => (familyId(p) === leadId ? index : at),
        -1,
      );
      return [
        ...products.slice(0, last + 1),
        copy,
        ...products.slice(last + 1),
      ];
    });
    onCopyTexts?.(leadId, id, ["name", "variant", "variantLabel"]);
  }
  // This product joins another product's family as one of its variants.
  function joinFamily(otherId) {
    const other = shop.products.find((p) => p.id === otherId);
    if (!other) return;
    editMany({ variantOf: familyId(other) });
  }
  // This product stands alone again. A lead hands its family to its first
  // variant.
  function leaveFamily() {
    update("products", (products) =>
      handOver(products, product).map((p) => {
        if (p.id !== product.id) return p;
        const { variantOf, variantLabel, ...rest } = p;
        return rest;
      }),
    );
  }
  function remove() {
    if (
      !confirm(
        `Hapus ${product.name} dari ${t.title.toLowerCase()}? Tekan Simpan katalog untuk menerapkan perubahan.`,
      )
    )
      return;
    const remaining = handOver(shop.products, product).filter(
      (p) => p.id !== product.id,
    );
    update("products", remaining);
    setSelectedID(remaining.find((p) => kindOf(p) === kind)?.id);
  }
  return (
    <form className="admin-shop-form" onSubmit={onSave}>
      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <h2>Barang jual & barang sewa</h2>
            <p className="admin-subtle">
              Barang jual dan barang sewa dikelola terpisah, masing-masing
              dengan foto, harga, dan stoknya sendiri, sampai {shopProductLimit}{" "}
              produk. Pengunjung menyusun pesanan, membayar online, atau
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
        <DeliverySettings
          delivery={deliveryOf(shop)}
          onChange={(delivery) => update("delivery", delivery)}
        />
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
      <VoucherSettings
        vouchers={shop.vouchers ?? []}
        bookings={bookings}
        disabled={busy}
        onChange={(vouchers) => update("vouchers", vouchers)}
      />
      <div
        className="admin-shop-kinds"
        role="tablist"
        aria-label="Jenis barang"
      >
        {Object.entries(kinds).map(([k, info]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            className={"is-" + k + (kind === k ? " is-active" : "")}
            onClick={() => kind !== k && show(k)}
          >
            <strong>
              {info.title} <span>{count(k)}</span>
            </strong>
            <small>{info.text}</small>
          </button>
        ))}
      </div>
      <div className={"admin-shop-layout is-" + kind}>
        <section
          className="admin-card admin-shop-list"
          role="tabpanel"
          aria-label={t.title}
        >
          <div className="admin-card-heading">
            <h2>
              {t.title} ({ofKind.length})
            </h2>
            <button
              className="admin-button secondary"
              type="button"
              disabled={busy || full}
              onClick={add}
            >
              {t.add}
            </button>
          </div>
          {ofKind.length > 6 && (
            <div className="admin-shop-find">
              <input
                type="search"
                aria-label="Cari produk"
                placeholder="Cari produk…"
                value={find}
                onChange={(e) => setFind(e.target.value)}
              />
            </div>
          )}
          {listed.map((p) => (
            <button
              type="button"
              className={
                "admin-shop-item " +
                (product?.id === p.id ? "selected" : "") +
                (p.variantOf ? " is-variant" : "")
              }
              key={p.id}
              onClick={() => setSelectedID(p.id)}
              aria-pressed={product?.id === p.id}
            >
              <div className="admin-shop-thumbnail">
                <ProductVisual product={productAs(p, kind)} />
              </div>
              <span>
                <strong>{p.name}</strong>
                <small>
                  {p.variantOf ? `Varian ${p.variant || "tanpa nama"} · ` : ""}
                  {priceText(p)} · {p.enabled ? "Tampil" : "Draft"}
                  {!p.variantOf && ofKind.some((q) => q.variantOf === p.id)
                    ? ` · ${ofKind.filter((q) => q.variantOf === p.id).length + 1} varian`
                    : ""}
                </small>
              </span>
            </button>
          ))}
          {!ofKind.length ? (
            <p className="admin-subtle">{t.empty}</p>
          ) : (
            !listed.length && (
              <p className="admin-subtle">Tidak ada produk yang cocok.</p>
            )
          )}
        </section>
        {product && (
          <section className="admin-card admin-shop-detail" key={product.id}>
            <div className="admin-card-heading">
              <h2>{t.detail}</h2>
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
              <Field
                label="Deskripsi singkat"
                hint="Tampil di kartu produk, satu sampai dua kalimat."
              >
                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  value={product.description}
                  onChange={(e) => edit("description", e.target.value)}
                />
              </Field>
              <Field
                label="Ringkasan spesifikasi"
                hint="Satu baris di kartu, misalnya Mask + snorkel, lensa tempered."
              >
                <textarea
                  rows={3}
                  maxLength={300}
                  value={product.specification}
                  onChange={(e) => edit("specification", e.target.value)}
                />
              </Field>
            </div>
            <ModeSection
              mode={kind}
              product={product}
              stockPanel={
                <OptionsStock
                  mode={kind}
                  product={product}
                  family={family}
                  catalog={shop.products}
                  others={ordered.filter(
                    (p) => !p.variantOf && familyId(p) !== familyId(product),
                  )}
                  items={stock}
                  itemsError={stockError}
                  canStock={canStock}
                  canAddVariant={!full && family.length < variantLimit}
                  disabled={busy}
                  editProduct={editProduct}
                  setStock={setVariantStock}
                  setFamilySizes={(sizes) =>
                    family.forEach((p) => editProduct(p.id, { sizes }))
                  }
                  onAddValue={addVariantValue}
                  onOpen={setSelectedID}
                  onJoin={joinFamily}
                  onLeave={leaveFamily}
                />
              }
              items={stock}
              error={stockError}
              media={media}
              edit={edit}
              editMany={editMany}
              canCalendar={canCalendar}
              // Uploads land one after another, so each adds to the list
              // as it is now, not as it was when the upload started.
              onAddPhoto={(file) =>
                placePhoto(file, (url) =>
                  update("products", (products) =>
                    products.map((p) =>
                      p.id === product.id
                        ? withPhotos(p, kind, [...productImages(p, kind), url])
                        : p,
                    ),
                  ),
                )
              }
            />
            <ProductStoryField
              product={product}
              locale={locale}
              edit={edit}
              onImport={(texts, shared) =>
                onImport?.(product.id, texts, shared)
              }
            />
            <SpecTable
              rows={product.specs ?? []}
              catalog={shop.products}
              onChange={(rows) => edit("specs", rows)}
            />
            <ProductVideos
              videos={product.videos ?? []}
              onChange={(videos) => edit("videos", videos)}
            />
            <ProductPair
              mode={kind}
              pair={pair}
              disabled={busy || full}
              onOpen={() => show(kindOf(pair), pair.id)}
              onCopy={copyOther}
            />
            <button
              type="button"
              className="admin-inline danger"
              disabled={busy}
              onClick={remove}
            >
              {t.remove}
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

// A lead leaving its family, or deleted, hands it to its first variant:
// the others name that variant as their lead, and it keeps the name of the
// choice.
function handOver(products, lead) {
  const members = products.filter((p) => p.variantOf === lead.id);
  if (!members.length) return products;
  const next = members[0].id;
  return products.map((p) => {
    if (p.id === next) {
      const { variantOf, ...rest } = p;
      return lead.variantLabel
        ? { ...rest, variantLabel: lead.variantLabel }
        : rest;
    }
    return p.variantOf === lead.id ? { ...p, variantOf: next } : p;
  });
}

// The same model the other way, as its own product: open it, or make it
// from this one.
function ProductPair({ mode, pair, disabled, onOpen, onCopy }) {
  const sale = mode === "sale";
  return (
    <section
      className="admin-shop-pair"
      aria-label={sale ? "Versi sewa" : "Versi jual"}
    >
      {pair ? (
        <>
          <p>
            <strong>{sale ? "Juga disewakan" : "Juga dijual"}</strong>
            {`${pair.name}, ${priceText(pair)}, ${pair.enabled ? "tampil" : "draft"}. Foto, harga, dan stoknya diatur di ${sale ? "Barang sewa" : "Barang jual"}.`}
          </p>
          <button
            type="button"
            className="admin-button secondary"
            onClick={onOpen}
          >
            {sale ? "Buka barang sewanya" : "Buka barang jualnya"}
          </button>
        </>
      ) : (
        <>
          <p>
            <strong>
              {sale ? "Model ini juga disewakan?" : "Model ini juga dijual?"}
            </strong>
            Buat {sale ? "barang sewanya" : "barang jualnya"} dari produk ini.
            Nama, deskripsi, spesifikasi, video, dan ukuran ikut tersalin. Foto,
            harga, dan stoknya diisi sendiri.
          </p>
          <button
            type="button"
            className="admin-button secondary"
            disabled={disabled}
            onClick={onCopy}
          >
            {sale ? "+ Buat barang sewa" : "+ Buat barang jual"}
          </button>
        </>
      )}
    </section>
  );
}

// The price, stock and photos of gear for sale, or of rental gear.
const modeText = {
  sale: {
    title: "Harga, stok, dan foto barang jual",
    price: "salePrice",
    priceLabel: "Harga jual (Rp)",
    priceHint: "Kosong berarti tamu meminta penawaran.",
    photos: "Foto barang jual",
    photoHint:
      "Foto barang baru, misalnya dari pembuatnya atau saat barang datang.",
    stock: "Stok jual",
    intro:
      "Barang baru yang dibeli tamu dan tidak kembali. Stoknya berkurang sendiri saat pesanan online dibayar.",
  },
  rental: {
    title: "Harga, stok, dan foto barang sewa",
    price: "rentalPrice",
    priceLabel: "Harga sewa per hari (Rp)",
    priceHint:
      "Dihitung per alat per hari. Kosong berarti tamu meminta penawaran.",
    photos: "Foto barang sewa",
    photoHint:
      "Foto alat sewa milik dive center seperti yang diterima tamu, bukan foto barang baru.",
    stock: "Stok sewa",
    intro:
      "Alat milik dive center yang disewakan lalu kembali. Stoknya tidak berkurang. Setiap sewa memakai alatnya pada tanggal sewa, dari Dive Shop, dari add-on diving atau snorkeling, atau yang dicatat tim di Kalender reservasi.",
  },
};

function ModeSection({
  mode,
  product,
  stockPanel,
  items,
  error,
  media,
  edit,
  editMany,
  onAddPhoto,
  canCalendar,
}) {
  const t = modeText[mode];
  const images = productImages(product, mode);
  return (
    <section
      className={"admin-shop-mode is-" + mode}
      aria-label={t.title}
      data-mode={mode}
    >
      <div className="admin-shop-mode-head">
        <h3>{t.title}</h3>
        {mode === "rental" && canCalendar && (
          <a className="admin-inline" href="/admin/calendar">
            Lihat di Kalender reservasi
          </a>
        )}
      </div>
      <p className="admin-subtle">{t.intro}</p>
      <Field label={t.priceLabel} hint={t.priceHint}>
        <input
          type="number"
          min={1}
          max={1e9}
          step={1}
          placeholder="Kosong = minta penawaran"
          value={product[t.price] ?? ""}
          onChange={(e) =>
            edit(t.price, e.target.value === "" ? null : Number(e.target.value))
          }
        />
      </Field>
      <Field
        label="Harga normal, dicoret (Rp)"
        hint={
          discountOf(product, mode)
            ? `Tampil dicoret di website dengan label Hemat ${discountOf(product, mode).percent}%. Kosongkan kalau diskonnya selesai.`
            : `Untuk diskon. Isi harga sebelum diskon, lebih tinggi dari ${mode === "sale" ? "harga jual" : "harga sewa"}. Kosong berarti tanpa harga coret.`
        }
      >
        <input
          type="number"
          min={1}
          max={1e9}
          step={1}
          placeholder="Kosong = tanpa harga coret"
          value={product.comparePrice ?? ""}
          onChange={(e) =>
            edit(
              "comparePrice",
              e.target.value === "" ? null : Number(e.target.value),
            )
          }
        />
      </Field>
      {stockPanel}
      <ProductPhotos
        label={t.photos}
        hint={t.photoHint}
        product={productAs(product, mode)}
        images={images}
        media={media}
        onAdd={onAddPhoto}
        onChange={(next) => editMany(withPhotos(product, mode, next))}
      />
    </section>
  );
}

// The stock of one way, per size. Each size (or the product, without
// sizes) is an item in Gudang. A count typed here is saved with the
// catalog as a stock opname in the warehouse.
// The first photo is the cover on cards. For sale, "image" follows it for
// the parts of the site that show one photo.
const withPhotos = (product, mode, images) => {
  const list = [...new Set(images)].slice(0, productLimits.images);
  return mode === "rental"
    ? { ...product, rentalImages: list }
    : { ...product, images: list, image: list[0] ?? "" };
};

// Photos of one way like a marketplace listing: several at once from a
// computer or phone, in order, the first one as the cover.
function ProductPhotos({
  label,
  hint,
  product,
  images,
  media,
  onAdd,
  onChange,
}) {
  const [url, setUrl] = useState("");
  const move = (index, delta) => {
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };
  const full = images.length >= productLimits.images;
  return (
    <section className="admin-shop-photos" aria-label={label}>
      <h3>
        {label}{" "}
        <small>
          {images.length} dari {productLimits.images}
        </small>
      </h3>
      {images.length ? (
        <ul className="admin-shop-photo-list">
          {images.map((src, index) => (
            <li key={src}>
              <Thumb
                src={src}
                alt={`Foto ${index + 1} ${product.name}`}
                sizes="160px"
              />
              {index === 0 && <span className="admin-photo-cover">Utama</span>}
              <div>
                {index > 0 && (
                  <button
                    type="button"
                    aria-label={`Jadikan foto ${index + 1} foto utama`}
                    onClick={() =>
                      onChange([src, ...images.filter((s) => s !== src)])
                    }
                  >
                    Utama
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Geser foto ${index + 1} ke kiri`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label={`Geser foto ${index + 1} ke kanan`}
                  disabled={index === images.length - 1}
                  onClick={() => move(index, 1)}
                >
                  →
                </button>
                <button
                  type="button"
                  className="danger"
                  aria-label={`Hapus foto ${index + 1}`}
                  onClick={() => onChange(images.filter((s) => s !== src))}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="admin-shop-preview">
          <ProductVisual product={product} />
        </div>
      )}
      {!full && (
        <ImageUpload
          multiple
          guide="product"
          label={`Tambah ${label.toLowerCase()}`}
          hint={`Bisa pilih beberapa foto sekaligus, maksimal ${productLimits.images}. Langsung terpasang.`}
          onFile={onAdd}
        />
      )}
      <p className="admin-subtle">
        {hint} Foto pertama tampil di kartu. Tambahkan foto dari depan, samping,
        detail, dan saat dipakai supaya tamu melihat barang aslinya. Tanpa foto,
        website menampilkan ilustrasi alat.
      </p>
      <details className="admin-more">
        <summary>Pilih foto lain atau tempel URL</summary>
        <Field label="Tambah dari koleksi">
          <select
            value=""
            disabled={full}
            onChange={(e) =>
              e.target.value && onChange([...images, e.target.value])
            }
          >
            <option value="">Pilih foto…</option>
            {media.map((m) => (
              <option key={m.id} value={m.url}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="admin-size-row">
          <Field label="URL foto">
            <input
              placeholder="URL HTTPS atau /api/media/…"
              maxLength={1200}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>
          <button
            type="button"
            className="admin-button secondary"
            disabled={!url.trim() || full}
            onClick={() => {
              onChange([...images, url.trim()]);
              setUrl("");
            }}
          >
            Tambah foto
          </button>
        </div>
      </details>
    </section>
  );
}

// The full description in Markdown, typed here or filled in from a .md
// file: the maker's page copied as it is, with its specifications. A file
// may hold both languages, each section with "bahasa: id" or "bahasa: en"
// in its front matter; without it, the file is the language being edited.
// The preview shows what guests read in the product window.
function ProductStoryField({ product, locale, edit, onImport }) {
  const [note, setNote] = useState(null);
  const [preview, setPreview] = useState(false);
  const [example, setExample] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(
      new Blob([productMdExample], { type: "text/markdown" }),
    );
    setExample(url);
    return () => URL.revokeObjectURL(url);
  }, []);
  const words = { id: "Indonesia", en: "English" };
  async function read(file) {
    setNote(null);
    if (!file) return;
    if (file.size > 300_000) {
      setNote({ error: "Berkas .md terlalu besar, maksimal 300 KB." });
      return;
    }
    let found;
    try {
      found = readProductMd(await file.text());
    } catch (error) {
      setNote({ error: error.message });
      return;
    }
    // Sections marked with a language fill that language; a file without
    // marks fills the language being edited.
    const marked = found.filter((s) => s.lang === "id" || s.lang === "en");
    const chosen = marked.length
      ? marked
      : [{ ...found[0], lang: locale === "en" ? "en" : "id" }];
    const texts = {};
    for (const section of chosen)
      texts[section.lang] = {
        details: section.details,
        ...(section.specs.length ? { specs: section.specs } : {}),
        ...(section.name ? { name: section.name } : {}),
        ...(section.description ? { description: section.description } : {}),
        ...(section.specification
          ? { specification: section.specification }
          : {}),
      };
    const videos = [
      ...new Set([
        ...(product.videos ?? []),
        ...chosen
          .flatMap((section) => section.videos)
          .filter((url) => {
            const source = videoSource(url);
            return source && !source.short;
          }),
      ]),
    ].slice(0, productLimits.videos);
    onImport(texts, videos.length ? { videos } : {});
    const first = chosen[0];
    setNote({
      langs: chosen.map((s) => words[s.lang]).join(" dan "),
      specs: Math.max(...chosen.map((s) => s.specs.length)),
      title: !first.name && first.title !== product.name ? first.title : "",
    });
    setPreview(true);
  }
  const blocks = storyBlocks(product.details);
  return (
    <section className="admin-shop-story">
      <div className="admin-field">
        <label htmlFor={`story-${product.id}`}>Deskripsi lengkap</label>
        <textarea
          id={`story-${product.id}`}
          rows={10}
          maxLength={productLimits.details}
          value={product.details ?? ""}
          onChange={(e) => edit("details", e.target.value)}
        />
        <small className="admin-subtle">
          Ditulis dengan Markdown, sampai{" "}
          {productLimits.details.toLocaleString("id-ID")} karakter. # untuk
          judul, **teks** untuk tebal, - untuk daftar, dan | untuk tabel. Baris
          tebal yang diikuti paragraf menjadi kartu fitur, dan baris tebal
          sendirian menjadi slogan.
        </small>
      </div>
      <div className="admin-story-actions">
        <label className="admin-button secondary admin-story-file">
          Isi dari berkas .md
          <input
            type="file"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            onChange={(e) => {
              read(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {example && (
          <a
            className="admin-inline"
            href={example}
            download="contoh-produk.md"
          >
            Unduh contoh berkas .md
          </a>
        )}
        <button
          type="button"
          className="admin-inline"
          aria-pressed={preview}
          onClick={() => setPreview((on) => !on)}
        >
          {preview ? "Tutup pratinjau" : "Lihat pratinjau"}
        </button>
      </div>
      <p className="admin-subtle">
        Salin halaman produk dari situs resmi pembuatnya ke berkas .md, lalu
        unggah di sini. Tabel spesifikasi masuk ke Tabel spesifikasi di bawah,
        sisanya menjadi deskripsi lengkap. Bagian depan berkas bisa berisi nama,
        deskripsi, ringkasan, video, dan bahasa. Satu berkas bisa memuat
        Indonesia dan English. Tekan Simpan katalog setelahnya.
      </p>
      {note?.error && (
        <p className="admin-error" role="alert">
          {note.error}
        </p>
      )}
      {note && !note.error && (
        <div className="admin-success admin-story-note" role="status">
          <span>
            Terisi dari berkas untuk {note.langs}
            {note.specs > 0 ? `, ${note.specs} baris spesifikasi` : ""}.
            {note.title && ` Judul di berkas ${note.title}.`}
          </span>
          {note.title && (
            <button
              type="button"
              className="admin-inline"
              onClick={() => {
                edit("name", note.title.slice(0, 100));
                setNote({ ...note, title: "" });
              }}
            >
              Pakai sebagai nama produk
            </button>
          )}
        </div>
      )}
      {preview && (
        <div className="admin-story-preview">
          {blocks.length ? (
            <ProductStory blocks={blocks} />
          ) : (
            <p className="admin-subtle">Deskripsi lengkap masih kosong.</p>
          )}
        </div>
      )}
    </section>
  );
}

// Video links that show the real gear: YouTube, TikTok, Instagram or
// Facebook. Share links are opened on the server for their full address.
function ProductVideos({ videos, onChange }) {
  const [draft, setDraft] = useState("");
  const [state, setState] = useState("");
  async function add() {
    let url = draft.trim();
    let source = videoSource(url);
    setState("");
    if (!source) {
      setState(
        "Link belum dikenali. Tempel link video dari YouTube, TikTok, Instagram, atau Facebook.",
      );
      return;
    }
    if (source.short) {
      setState("Membuka link pendek…");
      try {
        const response = await fetch("/api/admin/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error);
        url = result.url;
        source = videoSource(url);
      } catch (error) {
        setState(error.message || "Link pendek belum bisa dibuka.");
        return;
      }
    }
    onChange([...videos, url]);
    setDraft("");
    setState("");
  }
  return (
    <section className="admin-shop-videos" aria-label="Video produk">
      <h3>
        Video produk{" "}
        <small>
          {videos.length} dari {productLimits.videos}
        </small>
      </h3>
      {videos.length > 0 && (
        <ul>
          {videos.map((url, index) => (
            <li key={url}>
              <strong>
                {videoPlatforms[videoSource(url)?.platform] ?? "Video"}
              </strong>
              <span>{url}</span>
              <button
                type="button"
                className="admin-inline danger"
                aria-label={`Hapus video ${index + 1}`}
                onClick={() => onChange(videos.filter((v) => v !== url))}
              >
                Hapus
              </button>
            </li>
          ))}
        </ul>
      )}
      {videos.length < productLimits.videos && (
        <div className="admin-size-row">
          <Field label="Link video">
            <input
              maxLength={300}
              placeholder="https://youtu.be/… atau link TikTok, Instagram, Facebook"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
            />
          </Field>
          <button
            type="button"
            className="admin-button secondary"
            disabled={!draft.trim()}
            onClick={add}
          >
            Tambah video
          </button>
        </div>
      )}
      {state && (
        <p className="admin-subtle is-warn" role="status">
          {state}
        </p>
      )}
      <p className="admin-subtle">
        Video tampil di jendela detail produk, misalnya unboxing atau alat
        dipakai di laut. Unggah videonya ke YouTube, TikTok, atau Instagram,
        lalu tempel linknya di sini.
      </p>
    </section>
  );
}

// Spec rows shown as a table in the product window, such as Merek and
// Scubapro, or Bahan and Silikon.
// Pick-up at the dive center, delivery to an address in zones with their
// fees, and what the guest reads about each.
function DeliverySettings({ delivery, onChange }) {
  const set = (patch) => onChange({ ...delivery, ...patch });
  const setZone = (index, patch) =>
    set({
      zones: delivery.zones.map((zone, i) =>
        i === index ? { ...zone, ...patch } : zone,
      ),
    });
  const note = (key, lang, value) =>
    set({ [key]: { ...delivery[key], [lang]: value } });
  return (
    <section
      className="admin-shop-delivery"
      aria-label="Pengambilan dan pengantaran"
    >
      <h3>Pengambilan & pengantaran</h3>
      <p className="admin-subtle">
        Tamu memilih saat checkout. Ongkos antar ikut ke total dan pembayaran
        Midtrans.
      </p>
      <label className="admin-toggle">
        <input
          type="checkbox"
          checked={delivery.pickup}
          onChange={(e) => set({ pickup: e.target.checked })}
        />
        Tamu bisa ambil sendiri di dive center
      </label>
      {delivery.pickup && (
        <div className="admin-form-grid">
          <Field label="Keterangan ambil sendiri">
            <input
              maxLength={300}
              value={delivery.pickupNote.id}
              onChange={(e) => note("pickupNote", "id", e.target.value)}
            />
          </Field>
          <Field label="Keterangan ambil sendiri (English)">
            <input
              maxLength={300}
              value={delivery.pickupNote.en}
              onChange={(e) => note("pickupNote", "en", e.target.value)}
            />
          </Field>
        </div>
      )}
      <label className="admin-toggle">
        <input
          type="checkbox"
          checked={delivery.enabled}
          onChange={(e) =>
            set({
              enabled: e.target.checked,
              // The first zone, ready to fill in.
              ...(e.target.checked && !delivery.zones.length
                ? {
                    zones: [
                      { id: newZoneId(), name: "Waisai kota", fee: 25000 },
                    ],
                  }
                : {}),
            })
          }
        />
        Bisa diantar sampai rumah atau penginapan
      </label>
      {delivery.enabled && (
        <>
          <div className="admin-zones">
            {delivery.zones.map((zone, index) => (
              <div className="admin-zone-row" key={zone.id}>
                <Field label={`Wilayah ${index + 1}`}>
                  <input
                    required
                    maxLength={60}
                    placeholder="Waisai kota"
                    value={zone.name}
                    onChange={(e) => setZone(index, { name: e.target.value })}
                  />
                </Field>
                <Field label={`Ongkos antar ${index + 1} (Rp)`}>
                  <input
                    type="number"
                    min={0}
                    max={10000000}
                    step={1000}
                    required
                    value={zone.fee}
                    onChange={(e) =>
                      setZone(index, {
                        fee:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <button
                  type="button"
                  className="admin-inline danger"
                  aria-label={`Hapus wilayah ${index + 1}`}
                  disabled={delivery.zones.length === 1}
                  onClick={() =>
                    set({ zones: delivery.zones.filter((_, i) => i !== index) })
                  }
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="admin-button secondary"
            disabled={delivery.zones.length >= deliveryZoneLimit}
            onClick={() =>
              set({
                zones: [
                  ...delivery.zones,
                  { id: newZoneId(), name: "", fee: 0 },
                ],
              })
            }
          >
            + Tambah wilayah antar
          </button>
          <p className="admin-subtle">
            Isi 0 untuk gratis ongkos. Contoh Waisai kota Rp 25.000, Saonek atau
            pulau terdekat Rp 150.000.
          </p>
          <div className="admin-form-grid">
            <Field label="Keterangan pengantaran">
              <input
                maxLength={300}
                value={delivery.note.id}
                onChange={(e) => note("note", "id", e.target.value)}
              />
            </Field>
            <Field label="Keterangan pengantaran (English)">
              <input
                maxLength={300}
                value={delivery.note.en}
                onChange={(e) => note("note", "en", e.target.value)}
              />
            </Field>
          </div>
        </>
      )}
    </section>
  );
}
const newZoneId = () => "zone-" + crypto.randomUUID().slice(0, 8);

const shortDate = (date) =>
  new Date(date + "T12:00:00Z").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
const rupiahInput = (value) => (value === "" ? null : Number(value));

// Discount vouchers for Dive Shop orders (src/voucher-model.js): a code,
// a share or an amount off, from a minimum spend, between two dates, for
// a number of uses. Guests type the code at checkout; the website never
// shows it. Uses are counted from orders paid online that carry it.
function VoucherSettings({ vouchers, bookings, disabled, onChange }) {
  const [open, setOpen] = useState(null);
  const edit = (id, patch) =>
    onChange(vouchers.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  function add() {
    const voucher = newVoucher("v-" + crypto.randomUUID().slice(0, 8));
    onChange([...vouchers, voucher]);
    setOpen(voucher.id);
  }
  function remove(voucher) {
    if (
      !confirm(
        `Hapus kupon ${voucher.code || "baru"}? Pesanan yang sudah memakainya tidak berubah. Tekan Simpan katalog untuk menerapkan.`,
      )
    )
      return;
    onChange(vouchers.filter((v) => v.id !== voucher.id));
  }
  return (
    <section className="admin-card admin-vouchers" aria-labelledby="vouchers">
      <div className="admin-card-heading">
        <div>
          <h2 id="vouchers">Kupon diskon</h2>
          <p className="admin-subtle">
            Kode yang tamu ketik saat checkout Dive Shop, misalnya untuk promo
            Instagram atau tamu langganan. Potongannya dihitung server dari alat
            di keranjang, tanpa ongkos antar dan kenaikan tarif. Kodenya tidak
            pernah tampil di website. Pemakaian dihitung dari pesanan yang
            dibayar online, sedangkan pesanan WhatsApp menyebut kodenya di
            pesan.
          </p>
        </div>
        <button
          type="button"
          className="admin-button secondary"
          disabled={disabled || vouchers.length >= voucherLimit}
          onClick={add}
        >
          + Tambah kupon
        </button>
      </div>
      {!vouchers.length && (
        <p className="admin-subtle">
          Belum ada kupon. Kolom kode kupon baru muncul di checkout setelah ada
          kupon yang aktif.
        </p>
      )}
      <ul className="admin-voucher-list">
        {vouchers.map((v) => {
          const used = Array.isArray(bookings)
            ? voucherUses(bookings, v).used
            : null;
          const state = [
            v.enabled ? "Aktif" : "Nonaktif",
            used !== null &&
              `terpakai ${used}${v.limit ? ` dari ${v.limit}` : ""}`,
            v.start && `mulai ${shortDate(v.start)}`,
            v.end && `sampai ${shortDate(v.end)}`,
          ]
            .filter(Boolean)
            .join(" · ");
          const shown = open === v.id;
          return (
            <li key={v.id} className={v.enabled ? "" : "is-off"}>
              <button
                type="button"
                className="admin-voucher-head"
                aria-expanded={shown}
                onClick={() => setOpen(shown ? null : v.id)}
              >
                <strong>{v.code || "Kupon baru"}</strong>
                <span>{voucherSummary(v)}</span>
                <small>
                  {state}
                  <br />
                  {voucherPlaceText(v)}
                </small>
              </button>
              {shown && (
                <div className="admin-voucher-body">
                  <div className="admin-form-grid">
                    <Field
                      label="Kode kupon"
                      hint="4–20 huruf, angka, atau tanda hubung. Tamu bisa mengetik huruf kecil."
                    >
                      <input
                        required
                        maxLength={20}
                        value={v.code}
                        placeholder="Misalnya HEMAT10"
                        onChange={(e) =>
                          edit(v.id, { code: cleanCode(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label="Jenis potongan">
                      <select
                        value={v.kind}
                        onChange={(e) =>
                          edit(v.id, {
                            kind: e.target.value,
                            value: e.target.value === "percent" ? 10 : 25000,
                            maxDiscount: null,
                          })
                        }
                      >
                        {Object.entries(voucherKinds).map(([k, label]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field
                      label={
                        v.kind === "percent" ? "Potongan (%)" : "Potongan (Rp)"
                      }
                      hint={
                        v.kind === "percent"
                          ? "1–90 persen dari alat yang dicakup kupon."
                          : "Potongan tetap, tidak lebih dari harga alat yang dicakup."
                      }
                    >
                      <input
                        type="number"
                        required
                        min={v.kind === "percent" ? 1 : 1000}
                        max={v.kind === "percent" ? 90 : 1e9}
                        step={1}
                        value={v.value ?? ""}
                        onChange={(e) =>
                          edit(v.id, { value: rupiahInput(e.target.value) })
                        }
                      />
                    </Field>
                    {v.kind === "percent" && (
                      <Field
                        label="Potongan maksimal (Rp)"
                        hint="Kosong berarti tanpa batas."
                      >
                        <input
                          type="number"
                          min={1000}
                          max={1e9}
                          step={1}
                          placeholder="Tanpa batas"
                          value={v.maxDiscount ?? ""}
                          onChange={(e) =>
                            edit(v.id, {
                              maxDiscount: rupiahInput(e.target.value),
                            })
                          }
                        />
                      </Field>
                    )}
                    <Field
                      label="Belanja minimal (Rp)"
                      hint="Dari alat yang dicakup kupon. 0 berarti tanpa minimal."
                    >
                      <input
                        type="number"
                        min={0}
                        max={1e9}
                        step={1}
                        value={v.minSpend ?? 0}
                        onChange={(e) =>
                          edit(v.id, {
                            minSpend: rupiahInput(e.target.value) ?? 0,
                          })
                        }
                      />
                    </Field>
                    <Field
                      label="Mulai tanggal"
                      hint="Kosong berarti mulai sekarang."
                    >
                      <input
                        type="date"
                        value={v.start}
                        onChange={(e) => edit(v.id, { start: e.target.value })}
                      />
                    </Field>
                    <Field
                      label="Sampai tanggal"
                      hint="Hari terakhir kupon bisa dipakai, waktu Waisai. Kosong berarti tanpa batas."
                    >
                      <input
                        type="date"
                        value={v.end}
                        min={v.start || undefined}
                        onChange={(e) => edit(v.id, { end: e.target.value })}
                      />
                    </Field>
                    <Field
                      label="Kuota pemakaian"
                      hint="Berapa pesanan boleh memakainya. Kosong berarti tanpa batas."
                    >
                      <input
                        type="number"
                        min={1}
                        max={100000}
                        step={1}
                        placeholder="Tanpa batas"
                        value={v.limit ?? ""}
                        onChange={(e) =>
                          edit(v.id, { limit: rupiahInput(e.target.value) })
                        }
                      />
                    </Field>
                    <Field
                      label="Catatan untuk tim"
                      hint="Tidak tampil ke tamu, misalnya Promo Instagram November."
                    >
                      <input
                        maxLength={120}
                        value={v.note}
                        onChange={(e) => edit(v.id, { note: e.target.value })}
                      />
                    </Field>
                  </div>
                  <fieldset className="admin-voucher-places">
                    <legend>Bisa dipakai di</legend>
                    <div>
                      {Object.entries(voucherPlaces).map(([place, label]) => {
                        const chosen = placesOf(v);
                        return (
                          <label key={place} className="admin-toggle">
                            <input
                              type="checkbox"
                              checked={chosen.includes(place)}
                              onChange={(e) =>
                                edit(v.id, {
                                  places: Object.keys(voucherPlaces).filter(
                                    (p) =>
                                      p === place
                                        ? e.target.checked
                                        : chosen.includes(p),
                                  ),
                                })
                              }
                            />
                            {label}
                          </label>
                        );
                      })}
                    </div>
                    <small className="admin-subtle">
                      Kolom kode kupon hanya muncul di checkout tempat yang
                      dicentang. Potongannya hanya untuk barang atau paket dari
                      tempat itu.
                    </small>
                  </fieldset>
                  <div className="admin-voucher-toggles">
                    <label className="admin-toggle">
                      <input
                        type="checkbox"
                        checked={v.enabled}
                        onChange={(e) =>
                          edit(v.id, { enabled: e.target.checked })
                        }
                      />
                      Kupon aktif
                    </label>
                    <label className="admin-toggle">
                      <input
                        type="checkbox"
                        checked={v.oncePerGuest}
                        onChange={(e) =>
                          edit(v.id, { oncePerGuest: e.target.checked })
                        }
                      />
                      Sekali per tamu, dicek dari nomor WhatsApp atau email
                    </label>
                  </div>
                  <button
                    type="button"
                    className="admin-inline danger"
                    disabled={disabled}
                    onClick={() => remove(v)}
                  >
                    Hapus kupon ini
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
