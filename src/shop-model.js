export const shopCategories = {
  mask: "Mask & snorkel",
  fins: "Fins",
  suit: "Wetsuit",
  bcd: "BCD",
  regulator: "Regulator",
  cylinder: "Tabung",
  computer: "Dive computer",
  light: "Lampu & aksesori",
};
export const availabilityLabels = {
  request: "Konfirmasi ketersediaan",
  available: "Tersedia",
  unavailable: "Tidak tersedia",
};
export const emptyShop = {
  heading: "Perlengkapan untuk cerita berikutnya.",
  description:
    "Temukan alat diving untuk dimiliki atau disewa. Tim Zanclus membantu memilih perlengkapan yang sesuai dengan rencana menyelammu.",
  products: [],
};
export function demoShop() {
  const examples = [
    [
      "mask",
      "Mask & snorkel set",
      "Mask silikon dengan snorkel untuk melihat lebih dekat kehidupan laut.",
      "Mask + snorkel · ukuran dikonfirmasi tim",
      650000,
      50000,
    ],
    [
      "fins",
      "Open heel fins",
      "Fin dengan strap yang dapat disesuaikan untuk menemani setiap kayuhan.",
      "Open heel · pilihan ukuran dikonfirmasi tim",
      1250000,
      75000,
    ],
    [
      "suit",
      "Wetsuit 3 mm",
      "Perlindungan dan kenyamanan untuk menjelajahi perairan tropis.",
      "Ketebalan 3 mm · ukuran S–XL",
      1850000,
      100000,
    ],
    [
      "bcd",
      "BCD jacket",
      "Buoyancy compensator dengan kantong dan pengaturan ukuran.",
      "Jacket style · ukuran dikonfirmasi tim",
      5500000,
      150000,
    ],
    [
      "regulator",
      "Regulator set",
      "Set regulator untuk kebutuhan scuba diving bersama tim Zanclus.",
      "First stage + second stage + octopus · koneksi dikonfirmasi",
      6500000,
      150000,
    ],
    [
      "computer",
      "Dive computer",
      "Pantau informasi penyelaman dengan perangkat yang sesuai kebutuhanmu.",
      "Wrist style · model dikonfirmasi tim",
      4200000,
      125000,
    ],
    [
      "cylinder",
      "Tabung scuba 12 L",
      "Ajukan kebutuhan tabung untuk rencana diving yang sudah kamu susun.",
      "12 liter · isi dan koneksi dikonfirmasi tim",
      null,
      100000,
    ],
    [
      "light",
      "Dive torch",
      "Penerangan tambahan untuk menikmati detail dunia bawah laut.",
      "Lampu genggam · baterai dikonfirmasi tim",
      950000,
      75000,
    ],
  ];
  return {
    ...structuredClone(emptyShop),
    products: examples.map(
      ([
        category,
        name,
        description,
        specification,
        salePrice,
        rentalPrice,
      ]) => ({
        id: "demo-" + category,
        category,
        name,
        description,
        specification,
        image: "",
        saleEnabled: category !== "cylinder",
        rentalEnabled: true,
        salePrice,
        rentalPrice,
        enabled: true,
        availability: "request",
      }),
    ),
  };
}
// Existing CMS documents acquire the new section without losing saved content.
export function withShop(content, fallback = emptyShop) {
  return { ...content, shop: content.shop ?? structuredClone(fallback) };
}
export const rupiah = (amount) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

function validDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return false;
  const value = new Date(date + "T12:00:00Z");
  return (
    !Number.isNaN(value.valueOf()) && value.toISOString().slice(0, 10) === date
  );
}
export function quoteOrder(products, cart, days = 1) {
  if (!Array.isArray(cart) || !cart.length || cart.length > 40)
    throw new Error("Pilih perlengkapan terlebih dahulu.");
  if (
    cart.some((item) => item.mode === "rental") &&
    (!Number.isInteger(days) || days < 1 || days > 30)
  )
    throw new Error("Durasi rental harus 1–30 hari.");
  const seen = new Set();
  const lines = cart.map((item) => {
    const product = products.find((p) => p.id === item.id);
    const key = item.id + ":" + item.mode;
    if (
      !product?.enabled ||
      product.availability === "unavailable" ||
      !["sale", "rental"].includes(item.mode) ||
      !product[item.mode === "sale" ? "saleEnabled" : "rentalEnabled"] ||
      seen.has(key)
    )
      throw new Error(
        "Pilihan perlengkapan tidak tersedia. Perbarui pesananmu.",
      );
    seen.add(key);
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 10
    )
      throw new Error("Jumlah setiap perlengkapan harus 1–10.");
    const price = product[item.mode === "sale" ? "salePrice" : "rentalPrice"];
    if (
      price !== null &&
      (!Number.isSafeInteger(price) || price <= 0 || price > 1e9)
    )
      throw new Error("Harga perlengkapan belum valid.");
    return {
      ...item,
      name: product.name,
      price,
      total:
        price === null
          ? null
          : price * item.quantity * (item.mode === "rental" ? days : 1),
    };
  });
  return {
    lines,
    total: lines.reduce((sum, line) => sum + (line.total ?? 0), 0),
    needsQuote: lines.some((line) => line.total === null),
    hasRental: lines.some((line) => line.mode === "rental"),
  };
}
export function orderMessage(products, cart, details, demo = false) {
  const quote = quoteOrder(products, cart, details.days);
  const name = details.name?.trim();
  if (!name || name.length > 80)
    throw new Error("Isi nama, maksimal 80 karakter.");
  if (quote.hasRental && !validDate(details.startDate))
    throw new Error("Pilih tanggal mulai rental yang valid.");
  const notes = details.notes?.trim() || "";
  if (notes.length > 500) throw new Error("Catatan maksimal 500 karakter.");
  return [
    `Halo Zanclus! Saya ${name}, ingin konfirmasi pesanan Dive Shop${demo ? " (contoh demo)" : ""}.`,
    "",
    ...quote.lines.map(
      (line) =>
        `${line.mode === "sale" ? "BELI" : "RENTAL"} · ${line.name} × ${line.quantity} — ${line.total === null ? "minta harga" : rupiah(line.total)}`,
    ),
    ...(quote.hasRental
      ? ["", `Rental mulai ${details.startDate}, selama ${details.days} hari.`]
      : []),
    "",
    `Estimasi ${quote.needsQuote ? "harga yang tercantum" : "total"}: ${rupiah(quote.total)}${quote.needsQuote ? " + alat yang perlu penawaran" : ""}.`,
    ...(notes ? [`Catatan / ukuran: ${notes}`] : []),
    "Mohon konfirmasi stok, ukuran, harga final, serta pengambilan/pengiriman dan ketentuan rental.",
  ].join("\n");
}
