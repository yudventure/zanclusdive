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
  weight: "Pemberat",
  vest: "Pelampung",
  camera: "Kamera",
};
// Products in the catalog: gear for sale and rental gear.
export const shopProductLimit = 80;
// The homepage shows rental gear in tabs by kind.
export const rentalTabs = [
  "rentalBasics",
  "rentalScuba",
  "rentalTank",
  "rentalTools",
  "rentalCamera",
];
export const rentalTabOf = {
  mask: "rentalBasics",
  fins: "rentalBasics",
  suit: "rentalScuba",
  bcd: "rentalScuba",
  regulator: "rentalScuba",
  weight: "rentalScuba",
  cylinder: "rentalTank",
  computer: "rentalTools",
  light: "rentalTools",
  vest: "rentalTools",
  camera: "rentalCamera",
};
// Rental gear an activity page can offer beside its packages: rented for
// the activity's day, without a size to pick.
export const rentalAddOn = (p) =>
  Boolean(
    p?.enabled &&
    p.rentalEnabled &&
    p.availability !== "unavailable" &&
    Number.isSafeInteger(p.rentalPrice) &&
    p.rentalPrice > 0 &&
    !p.sizes?.length,
  );
// An add-on that is Dive Shop rental gear: "shop:" and the product id.
export const shopAddOn = "shop:";

// Gear sold new and gear rented out are different units: one leaves in its
// box, the other is the dive center's own gear, lent out and brought back.
// So a product is for sale or for rent, never both, each with its own
// photos, price and stock, and rental gear has its dates in the reservation
// calendar. Rental gear may name the same model for sale in "pair", which
// links the two in the editor and in the product window.
export const pairOf = (products, product) =>
  product?.rentalEnabled
    ? products.find((p) => p.saleEnabled && p.id === product.pair)
    : products.find((p) => p.rentalEnabled && p.pair === product?.id);

// Catalogs saved when one product could be both split it in two: the
// product keeps its id for sale, and its rental side becomes rental gear
// "<id>-sewa" right after it, with the rental price, photos and stock
// counts, the same name, texts, sizes and availability, and the product for
// sale as its pair. Returns the products and, per product split, the id of
// its rental gear.
export function splitProducts(products) {
  const ids = new Set(products.map((p) => p?.id));
  const rentals = new Map();
  const out = [];
  for (const p of products) {
    if (!p?.saleEnabled || !p.rentalEnabled) {
      out.push(p);
      continue;
    }
    const { rentalImages, stockCounts, ...shared } = p;
    out.push({
      ...shared,
      rentalEnabled: false,
      rentalPrice: null,
      rentalImages: [],
      ...(stockCounts?.sale ? { stockCounts: { sale: stockCounts.sale } } : {}),
    });
    // Rental gear split from it before (an older admin page saved it whole
    // again) is used, not copied.
    const twin = products.find(
      (q) => q?.rentalEnabled && !q.saleEnabled && q.pair === p.id,
    );
    if (twin) {
      rentals.set(p.id, twin.id);
      continue;
    }
    let id = `${p.id.slice(0, 45)}-sewa`;
    for (let n = 2; ids.has(id); n++) id = `${p.id.slice(0, 40)}-sewa-${n}`;
    ids.add(id);
    rentals.set(p.id, id);
    out.push({
      ...shared,
      id,
      pair: p.id,
      saleEnabled: false,
      salePrice: null,
      image: "",
      images: [],
      rentalImages: Array.isArray(rentalImages) ? rentalImages : [],
      ...(stockCounts?.rental
        ? { stockCounts: { rental: stockCounts.rental } }
        : {}),
    });
  }
  return { products: out, rentals };
}
// The same for a whole CMS document: the English texts, the activities
// offering the gear as an add-on and the developer locks follow the rental
// gear too. The warehouse items and the bookings keep the product for sale
// and find the rental gear through its pair (src/shop-stock.js).
export function withSplitProducts(content) {
  const products = content?.shop?.products;
  if (
    !Array.isArray(products) ||
    !products.some((p) => p?.saleEnabled && p?.rentalEnabled)
  )
    return content;
  const { products: split, rentals } = splitProducts(products);
  const out = { ...content, shop: { ...content.shop, products: split } };
  const addOns = content.priceList?.addOns;
  if (addOns && typeof addOns === "object")
    out.priceList = {
      ...content.priceList,
      addOns: Object.fromEntries(
        Object.entries(addOns).map(([activity, chosen]) => [
          activity,
          Array.isArray(chosen)
            ? chosen.map((id) =>
                typeof id === "string" &&
                id.startsWith(shopAddOn) &&
                rentals.has(id.slice(shopAddOn.length))
                  ? shopAddOn + rentals.get(id.slice(shopAddOn.length))
                  : id,
              )
            : chosen,
        ]),
      ),
    };
  const english = content.en?.shop?.products;
  if (english && typeof english === "object") {
    const copies = [...rentals]
      .filter(([from, to]) => english[from] && !english[to])
      .map(([from, to]) => [to, structuredClone(english[from])]);
    out.en = {
      ...content.en,
      shop: {
        ...content.en.shop,
        products: { ...english, ...Object.fromEntries(copies) },
      },
    };
  }
  const locked = content.developer?.items;
  if (Array.isArray(locked)) {
    const more = [...rentals]
      .filter(
        ([from, to]) =>
          locked.includes(`product:${from}`) &&
          !locked.includes(`product:${to}`),
      )
      .map(([, to]) => `product:${to}`);
    if (more.length)
      out.developer = { ...content.developer, items: [...locked, ...more] };
  }
  return out;
}

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

// A product page like a marketplace: several photos (the first is the
// cover on cards), video links, a full description in Markdown (often the
// maker's own, so it is long) and spec rows.
export const productLimits = {
  images: 8,
  videos: 4,
  details: 20000,
  specs: 16,
};
// Gear for sale and gear for rent are different units, so each way has its
// own photos: "images" for sale (with "image", its cover, from before the
// gallery) and "rentalImages" for rent. A way without photos shows the
// drawing of the gear, not the other way's photos.
export const productImages = (product, mode = "sale") =>
  mode === "rental"
    ? Array.isArray(product?.rentalImages)
      ? product.rentalImages
      : []
    : Array.isArray(product?.images) && product.images.length
      ? product.images
      : product?.image
        ? [product.image]
        : [];
// The product as its card shows it in one way: that way's cover photo.
export const productAs = (product, mode) => ({
  ...product,
  image: productImages(product, mode)[0] ?? "",
});

// How a Dive Shop order reaches the guest: picked up at the dive center,
// or delivered to an address in one of the zones, each with its fee.
export const deliveryZoneLimit = 12;
export const defaultDelivery = {
  pickup: true,
  pickupNote: {
    id: "Ambil di Zanclus Dive Center, Waisai, pada jam buka.",
    en: "Pick up at Zanclus Dive Center, Waisai, during opening hours.",
  },
  enabled: false,
  zones: [],
  note: {
    id: "Diantar tim kami ke alamatmu. Waktu antar dikonfirmasi lewat WhatsApp.",
    en: "Our team brings it to your address. We confirm the time on WhatsApp.",
  },
};
export const deliveryOf = (shop) => shop?.delivery ?? defaultDelivery;
// The delivery a guest picked, checked against the settings: the method,
// the zone and fee, and the address. Throws a message for the guest.
export function deliveryChoice(delivery, choice, locale = "id") {
  const t = dictionary(locale).order;
  const settings = delivery ?? defaultDelivery;
  const method = choice?.method === "delivery" ? "delivery" : "pickup";
  if (method === "pickup") {
    if (!settings.pickup) throw new Error(t.pickDelivery);
    return { method, zone: null, fee: 0, address: "" };
  }
  const zone = settings.enabled
    ? settings.zones.find((z) => z.id === choice?.zone)
    : null;
  if (!zone) throw new Error(t.pickZone);
  const address =
    typeof choice?.address === "string"
      ? choice.address.trim().replace(/\s+/g, " ")
      : "";
  if (address.length < 5 || address.length > 300 || /[<>]/.test(address))
    throw new Error(t.address);
  return { method, zone, fee: zone.fee, address };
}
// The delivery picked, as lines of a WhatsApp order: picked up, or the
// zone with its fee and the address.
export function deliveryLines(choice, locale = "id") {
  if (!choice) return [];
  const t = dictionary(locale).shop.delivery;
  return choice.method === "delivery"
    ? [
        t.lineDeliver(
          choice.zone.name,
          choice.fee ? rupiah(choice.fee, locale) : t.free,
        ),
        t.lineAddress(choice.address),
      ]
    : [t.linePickup];
}
export const emptyShop = {
  delivery: defaultDelivery,
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
  // Each example is sold new and rented out, as two products.
  return {
    ...structuredClone(emptyShop),
    products: splitProducts(
      examples.map(
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
          images: [],
          rentalImages: [],
          videos: [],
          details: "",
          specs: [],
        }),
      ),
    ).products,
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
  const shop = content.shop ?? structuredClone(fallback);
  // Catalogs saved before delivery settings get pick-up only.
  return {
    ...content,
    shop: shop.delivery
      ? shop
      : { ...shop, delivery: structuredClone(defaultDelivery) },
  };
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
    ...deliveryLines(details.delivery, locale),
    "",
    t.estimate(
      quote.needsQuote,
      rupiah(
        quote.total +
          (details.fare?.markup ?? 0) +
          (details.delivery?.fee ?? 0),
        locale,
      ),
    ),
    ...(notes ? [`${t.notesLabel} ${notes}`] : []),
    t.closing,
  ].join("\n");
}
