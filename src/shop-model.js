import { dictionary, formatIDR } from "./i18n.js";
import { cleanWhatsApp, cleanEmail } from "./contact-fields.js";
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
  stock: "Ikuti stok gudang",
  request: "Konfirmasi ketersediaan",
  available: "Tersedia",
  unavailable: "Tidak tersedia",
};
// Sizes a product comes in, such as S, M, L or 38–39. A product with sizes
// is ordered per size, and the warehouse keeps stock per size.
export const sizeLimit = 12;
export function cleanSizes(input) {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input) || input.length > sizeLimit)
    throw new Error(`Ukuran produk maksimal ${sizeLimit}.`);
  const seen = new Set();
  return input.map((value) => {
    const size =
      typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
    if (!size || size.length > 16 || /[<>]|::/.test(size))
      throw new Error("Setiap ukuran 1–16 karakter, tanpa < atau >.");
    const key = size.toLocaleLowerCase("id");
    if (seen.has(key)) throw new Error(`Ukuran ${size} tertulis dua kali.`);
    seen.add(key);
    return size;
  });
}
const hasSizes = (product) => Boolean(product?.sizes?.length);
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
        sizes: ["fins", "suit", "bcd"].includes(category)
          ? ["S", "M", "L", "XL"]
          : [],
      }),
    ),
  };
}
// How many units a guest may take of a product (and size) in this mode:
// the warehouse's free units for products that follow it (null while the
// stock cannot be read), else 10.
export function unitsLeft(product, stock, mode, size = "") {
  if (product.availability !== "stock") return 10;
  const entry = stock?.[product.id];
  const left = size ? entry?.sizes?.[size]?.[mode] : entry?.[mode];
  return Number.isInteger(left) ? Math.min(10, left) : null;
}
// The badge on a product card: its availability, or the stock left.
export function stockBadge(product, stock, mode, labels) {
  if (product.availability !== "stock")
    return {
      state: product.availability,
      label: labels[product.availability],
    };
  const left = stock?.[product.id]?.[mode];
  if (!Number.isInteger(left))
    return { state: "request", label: labels.request };
  if (left <= 0) return { state: "unavailable", label: labels.out };
  return {
    state: "available",
    label: left <= 3 ? labels.left(left) : labels.available,
  };
}
// Existing CMS documents acquire the new section without losing saved content.
export function withShop(content, fallback = emptyShop) {
  return { ...content, shop: content.shop ?? structuredClone(fallback) };
}
export const rupiah = (amount, locale = "id") => formatIDR(amount, locale);

function validDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return false;
  const value = new Date(date + "T12:00:00Z");
  return (
    !Number.isNaN(value.valueOf()) && value.toISOString().slice(0, 10) === date
  );
}
export function quoteOrder(products, cart, days = 1, locale = "id") {
  const t = dictionary(locale).order;
  if (!Array.isArray(cart) || !cart.length || cart.length > 40)
    throw new Error(t.pickGear);
  if (
    cart.some((item) => item.mode === "rental") &&
    (!Number.isInteger(days) || days < 1 || days > 30)
  )
    throw new Error(t.rentalDays);
  const seen = new Set();
  const lines = cart.map((item) => {
    const product = products.find((p) => p.id === item.id);
    const key = item.id + ":" + item.mode + ":" + (item.size ?? "");
    if (
      !product?.enabled ||
      product.availability === "unavailable" ||
      !["sale", "rental"].includes(item.mode) ||
      !product[item.mode === "sale" ? "saleEnabled" : "rentalEnabled"] ||
      seen.has(key)
    )
      throw new Error(t.unavailable);
    // Gear with sizes is ordered in one of its sizes.
    if (
      hasSizes(product)
        ? !product.sizes.includes(item.size)
        : Boolean(item.size)
    )
      throw new Error(t.pickSize);
    seen.add(key);
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 10
    )
      throw new Error(t.quantity);
    const price = product[item.mode === "sale" ? "salePrice" : "rentalPrice"];
    if (
      price !== null &&
      (!Number.isSafeInteger(price) || price <= 0 || price > 1e9)
    )
      throw new Error(t.price);
    return {
      ...item,
      name: product.name,
      size: item.size ?? "",
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
export function orderMessage(
  products,
  cart,
  details,
  demo = false,
  locale = "id",
) {
  const t = dictionary(locale).order;
  const quote = quoteOrder(products, cart, details.days, locale);
  const name = details.name?.trim();
  if (!name || name.length > 80) throw new Error(t.name);
  const whatsapp = cleanWhatsApp(details.whatsapp);
  if (!whatsapp) throw new Error(t.whatsapp);
  const email = cleanEmail(details.email);
  if (email === null) throw new Error(t.email);
  if (quote.hasRental && !validDate(details.startDate))
    throw new Error(t.startDate);
  const notes = details.notes?.trim() || "";
  if (notes.length > 500) throw new Error(t.notes);
  return [
    t.greeting(name),
    `WhatsApp ${whatsapp}`,
    ...(email ? [`Email ${email}`] : []),
    "",
    ...quote.lines.map(
      (line) =>
        `${line.mode === "sale" ? t.sale : t.rental} · ${line.name}${line.size ? " " + t.size(line.size) : ""} × ${line.quantity} · ${line.total === null ? t.askPrice : rupiah(line.total, locale)}`,
    ),
    ...(quote.hasRental
      ? ["", t.rentalPeriod(details.startDate, details.days)]
      : []),
    // The fare picked for the rentals, with its increase in the estimate.
    ...(details.fare?.text ? [details.fare.text] : []),
    "",
    t.estimate(
      quote.needsQuote,
      rupiah(quote.total + (details.fare?.markup ?? 0), locale),
    ),
    ...(notes ? [`${t.notesLabel} ${notes}`] : []),
    t.closing,
  ].join("\n");
}
