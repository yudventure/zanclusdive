"use client";
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
} from "../shop-model.js";
import { videoPlatforms, videoSource } from "../gallery.js";
import {
  productMdExample,
  readProductMd,
  storyBlocks,
} from "../product-story.js";
import ProductStory from "../shop/ProductStory.jsx";
import { sizesOf, unitForProduct, variantKey } from "../shop-stock.js";

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
  return sale ? rupiah(price) : `${rupiah(price)} per hari`;
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
}) {
  const [kind, setKind] = useState(() =>
    shop.products[0] ? kindOf(shop.products[0]) : "sale",
  );
  const [selectedID, setSelectedID] = useState(shop.products[0]?.id);
  // The list of one kind, searched by name.
  const [find, setFind] = useState("");
  const ofKind = shop.products.filter((p) => kindOf(p) === kind);
  const listed = ofKind.filter((p) =>
    p.name.toLowerCase().includes(find.trim().toLowerCase()),
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
    if (toRent) copy.pair = product.id;
    update("products", (products) => [
      ...products.map((p) =>
        !toRent && p.id === product.id ? { ...p, pair: id } : p,
      ),
      copy,
    ]);
    onCopyTexts?.(product.id, id);
    show(toRent ? "rental" : "sale", id);
  }
  function remove() {
    if (
      !confirm(
        `Hapus ${product.name} dari ${t.title.toLowerCase()}? Tekan Simpan katalog untuk menerapkan perubahan.`,
      )
    )
      return;
    const remaining = shop.products.filter((p) => p.id !== product.id);
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
                "admin-shop-item " + (product?.id === p.id ? "selected" : "")
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
                  {priceText(p)} · {p.enabled ? "Tampil" : "Draft"}
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
            <SizesAndAvailability
              mode={kind}
              product={product}
              canStock={canStock}
              edit={edit}
            />
            <ModeSection
              mode={kind}
              product={product}
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
            <SpecRows
              rows={product.specs ?? []}
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

// The sizes and how the website follows the stock. The stock of each size
// is typed below.
function SizesAndAvailability({ mode, product, canStock, edit }) {
  const [draft, setDraft] = useState("");
  const sizes = product.sizes ?? [];
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
  return (
    <section className="admin-shop-stock" aria-label="Ukuran dan ketersediaan">
      <h3>Ukuran & ketersediaan</h3>
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
        {product.availability !== "stock"
          ? "Stok tetap tercatat di Gudang, tapi website tidak memeriksanya. Pilih Ikuti stok gudang supaya website menampilkan sisa stok."
          : mode === "sale"
            ? "Website menampilkan sisa stok, dan pesanan online tidak bisa melebihinya. Penjualan online mengurangi stoknya."
            : "Website menampilkan sisa alat, dan sewa online tidak bisa melebihinya pada tanggal sewanya. Sewa yang dicatat di Kalender reservasi ikut dihitung, lalu alatnya kembali."}
      </p>
      {canStock && (
        <a className="admin-inline" href="/admin/stock">
          Buka Barang & stok
        </a>
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
      <ModeStock
        mode={mode}
        product={product}
        items={items}
        error={error}
        editMany={editMany}
      />
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
function ModeStock({ mode, product, items, error, editMany }) {
  const t = modeText[mode];
  const sizes = product.sizes ?? [];
  const byVariant = new Map(
    (items ?? [])
      .filter((item) => item.productId)
      .map((item) => [variantKey(item.productId, item.mode, item.size), item]),
  );
  const unit = (size) =>
    byVariant.get(variantKey(product.id, mode, size))?.unit ??
    unitForProduct(product);
  // An item without a size that this product leaves behind when it gets
  // sizes, so its stock is not lost from sight.
  const before = sizes.length
    ? byVariant.get(variantKey(product.id, mode))
    : null;
  function setCount(size, value) {
    editMany({
      stockCounts: {
        ...product.stockCounts,
        [mode]: { ...product.stockCounts?.[mode], [size]: value },
      },
      // Typing the stock means the website should follow it.
      ...(["request", "available"].includes(product.availability)
        ? { availability: "stock" }
        : {}),
    });
  }
  if (error)
    return (
      <p className="admin-error" role="alert">
        {error}
      </p>
    );
  if (!items) return <p className="admin-subtle">Memuat stok…</p>;
  return (
    <div className="admin-stock-rows">
      {sizesOf(product).map((size) => {
        const item = byVariant.get(variantKey(product.id, mode, size));
        const held = item?.shop;
        const typed = product.stockCounts?.[mode]?.[size];
        const notes = (
          mode === "rental"
            ? [
                held?.rentedToday && `${held.rentedToday} disewa hari ini`,
                held?.bookedLater && `${held.bookedLater} dipesan untuk nanti`,
              ]
            : [held?.waiting && `${held.waiting} menunggu pembayaran`]
        ).filter(Boolean);
        return (
          <div className="admin-stock-row" key={size || "all"}>
            <Field label={size ? `${t.stock} ukuran ${size}` : t.stock}>
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
      {before && before.stock > 0 && (
        <p className="admin-subtle is-warn">
          {t.stock} lama tanpa ukuran ({before.stock} {before.unit}) tetap di
          Gudang sebagai barang biasa. Isi stok tiap ukuran di atas.
        </p>
      )}
    </div>
  );
}

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
              <img src={src} alt={`Foto ${index + 1} ${product.name}`} />
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
function SpecRows({ rows, onChange }) {
  const set = (index, key, value) =>
    onChange(
      rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );
  return (
    <section className="admin-shop-specs" aria-label="Tabel spesifikasi">
      <h3>Tabel spesifikasi</h3>
      {rows.map((row, index) => (
        <div className="admin-spec-row" key={index}>
          <Field label={`Nama ${index + 1}`}>
            <input
              maxLength={40}
              placeholder="Merek"
              value={row.label}
              onChange={(e) => set(index, "label", e.target.value)}
            />
          </Field>
          <Field label={`Isi ${index + 1}`}>
            <input
              maxLength={160}
              placeholder="Scubapro"
              value={row.value}
              onChange={(e) => set(index, "value", e.target.value)}
            />
          </Field>
          <button
            type="button"
            className="admin-inline danger"
            aria-label={`Hapus baris spesifikasi ${index + 1}`}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
          >
            Hapus
          </button>
        </div>
      ))}
      <button
        type="button"
        className="admin-button secondary"
        disabled={rows.length >= productLimits.specs}
        onClick={() => onChange([...rows, { label: "", value: "" }])}
      >
        + Tambah baris spesifikasi
      </button>
      <p className="admin-subtle">
        Contoh Merek, Bahan, Ukuran lensa, Berat, Garansi. Baris kosong
        diabaikan.
      </p>
    </section>
  );
}

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
