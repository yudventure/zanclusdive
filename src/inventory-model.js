import { parseAmount, cleanText, validDate } from "./money.js";

// Gudang: items and the movements that give their stock.
export const itemCategories = {
  alat: "Alat selam",
  sparepart: "Suku cadang",
  consumable: "Bahan habis pakai",
  merch: "Merchandise",
  perahu: "Perahu & mesin",
  lainnya: "Lainnya",
};
export const units = ["pcs", "set", "pasang", "botol", "liter", "kg", "lusin"];
export const movementKinds = {
  in: "Masuk",
  out: "Keluar",
  adjust: "Koreksi stok",
};
export const movementReasons = {
  in: { beli: "Pembelian", kembali: "Sewa kembali", lainnya: "Lainnya" },
  out: {
    jual: "Penjualan",
    sewa: "Sewa keluar",
    pakai: "Dipakai operasional",
    rusak: "Rusak atau hilang",
    lainnya: "Lainnya",
  },
  adjust: { opname: "Stock opname", koreksi: "Koreksi data" },
};
export const inventoryLimits = { note: 300, items: 2000 };

// "products" (the Dive Shop catalog) checks the product an item is linked
// to; without it the link is kept as given.
export function validateItem(input, current = null, { products } = {}) {
  if (!input || typeof input !== "object")
    throw new Error("Data barang tidak valid.");
  const pick = (key) => (key in input ? input[key] : current?.[key]);
  const name = cleanText(pick("name"), 80, "Nama barang");
  if (!name) throw new Error("Isi nama barang.");
  const sku = cleanText(pick("sku"), 30, "Kode barang").toUpperCase();
  if (sku && !/^[A-Z0-9-]+$/.test(sku))
    throw new Error("Kode barang hanya huruf, angka, dan tanda hubung.");
  const category = pick("category") ?? "alat";
  if (!(category in itemCategories)) throw new Error("Pilih kategori barang.");
  const unit = cleanText(pick("unit"), 12, "Satuan") || "pcs";
  const minStock = parseAmount(pick("minStock"), "Stok minimum", {
    max: 1e6,
  });
  const cost = parseAmount(pick("cost"), "Harga beli");
  const active = typeof pick("active") === "boolean" ? pick("active") : true;
  const productId =
    typeof pick("productId") === "string" ? pick("productId") : "";
  const size =
    productId && typeof pick("size") === "string" ? pick("size") : "";
  // Stock for sale and stock for rent are separate items.
  const mode = productId ? (pick("mode") ?? "sale") : "";
  const product = products?.find((p) => p.id === productId);
  if (
    productId &&
    (!/^[a-z0-9-]{1,50}$/.test(productId) ||
      !["sale", "rental"].includes(mode) ||
      (products &&
        (!product ||
          !product[mode === "sale" ? "saleEnabled" : "rentalEnabled"] ||
          (product.sizes?.length ? !product.sizes.includes(size) : size))))
  )
    throw new Error(
      "Produk, jual atau sewa, atau ukuran Dive Shop tidak ditemukan.",
    );
  const before = [current?.productId, current?.mode, current?.size].join("::");
  return {
    name,
    sku,
    category,
    unit,
    minStock,
    cost,
    location: cleanText(pick("location"), 60, "Lokasi simpan"),
    note: cleanText(pick("note"), inventoryLimits.note, "Catatan"),
    active,
    productId,
    mode,
    size,
    // The latest link wins when two items name the same product, way and
    // size.
    ...(productId && [productId, mode, size].join("::") !== before
      ? { linkedAt: new Date().toISOString() }
      : {}),
  };
}
// One movement. Adjustments carry a signed quantity.
export function validateMovement(input, items) {
  if (!input || typeof input !== "object")
    throw new Error("Data mutasi tidak valid.");
  if (!validDate(input.date)) throw new Error("Isi tanggal mutasi.");
  const item = items.find((i) => i.id === input.itemId);
  if (!item) throw new Error("Barang tidak ditemukan.");
  const kind = input.kind ?? "in";
  if (!(kind in movementKinds)) throw new Error("Pilih jenis mutasi.");
  const qty = Number(input.qty);
  if (!Number.isInteger(qty) || Math.abs(qty) > 1e6)
    throw new Error("Jumlah harus bilangan bulat.");
  if (kind !== "adjust" && qty <= 0)
    throw new Error("Jumlah masuk atau keluar harus lebih dari 0.");
  if (kind === "adjust" && qty === 0)
    throw new Error(
      "Koreksi harus bukan nol: plus menambah, minus mengurangi.",
    );
  const reasons = movementReasons[kind];
  const reason = input.reason ?? Object.keys(reasons)[0];
  if (!(reason in reasons)) throw new Error("Pilih alasan mutasi.");
  return {
    date: input.date,
    itemId: item.id,
    kind,
    qty,
    reason,
    note: cleanText(input.note, inventoryLimits.note, "Catatan"),
  };
}
// Stock is the sum of the movements: in adds, out takes, adjust is signed.
export const delta = (m) =>
  m.kind === "in" ? m.qty : m.kind === "out" ? -m.qty : m.qty;
export function stockOf(movements, itemId) {
  return movements
    .filter((m) => m.itemId === itemId)
    .reduce((total, m) => total + delta(m), 0);
}
// Items with their stock and whether it is at or under the minimum.
export function stockTable(items, movements) {
  return items.map((item) => {
    const stock = stockOf(movements, item.id);
    return {
      ...item,
      stock,
      empty: item.active !== false && stock <= 0,
      low:
        item.active !== false &&
        stock > 0 &&
        item.minStock > 0 &&
        stock <= item.minStock,
      value: stock * (item.cost ?? 0),
    };
  });
}
