// Discount vouchers for Dive Shop orders: a code the team shares (on
// Instagram, with a returning guest), worth a share of the order or an
// amount of rupiah, from a minimum spend, between two dates, for a number
// of uses. They live in content.shop.vouchers, but the codes never reach
// a public page: publicContent (src/server/store.js) keeps only whether
// any voucher is on. Every discount is priced on the server, in
// priceOrder (src/order-pricing.js), as one negative line of the order.
import { formatIDR } from "./i18n.js";

export const voucherLimit = 30;
export const voucherScopes = {
  all: "Semua alat",
  sale: "Barang jual saja",
  rental: "Barang sewa saja",
};
export const voucherKinds = {
  percent: "Persen",
  amount: "Rupiah",
};
// A code as the guest types it: no spaces, capitals.
export const cleanCode = (value) =>
  typeof value === "string"
    ? value.replace(/\s+/g, "").toUpperCase().slice(0, 40)
    : "";
const codePattern = /^[A-Z0-9-]{4,20}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const newVoucher = (id) => ({
  id,
  code: "",
  enabled: true,
  kind: "percent",
  value: 10,
  maxDiscount: null,
  minSpend: 0,
  scope: "all",
  start: "",
  end: "",
  limit: null,
  oncePerGuest: false,
  note: "",
});

function rupiahField(value, label, { optional = false, min = 0 } = {}) {
  if (value === null || value === undefined || value === "") {
    if (optional) return null;
    return min > 0 ? fail(`${label} harus diisi.`) : 0;
  }
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > 1e9)
    fail(`${label} harus rupiah bulat, maksimal 1 miliar.`);
  return n;
}
function fail(message) {
  throw new Error(message);
}

// The vouchers as saved by the admin, checked: unique codes of 4–20
// letters, digits or dashes, a share of 1–90% (with an optional cap) or an
// amount of rupiah, a minimum spend, optional first and last days, an
// optional number of uses and whether each guest may use it once.
export function validateVouchers(input) {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input) || input.length > voucherLimit)
    fail(`Kupon maksimal ${voucherLimit}.`);
  const ids = new Set();
  const codes = new Set();
  return input.map((v) => {
    if (!v || typeof v.id !== "string" || !/^[a-z0-9-]{1,40}$/.test(v.id))
      fail("Kupon tidak valid. Muat ulang halaman admin.");
    if (ids.has(v.id)) fail("Kupon tertulis dua kali. Muat ulang halaman.");
    ids.add(v.id);
    const code = cleanCode(v.code);
    if (!codePattern.test(code))
      fail(
        `Kode kupon ${code || "baru"} harus 4–20 huruf, angka, atau tanda hubung, tanpa spasi.`,
      );
    if (codes.has(code)) fail(`Kode kupon ${code} dipakai dua kali.`);
    codes.add(code);
    const kind = Object.hasOwn(voucherKinds, v.kind)
      ? v.kind
      : fail(`Jenis potongan kupon ${code} tidak valid.`);
    const value = Number(v.value);
    if (
      !Number.isSafeInteger(value) ||
      (kind === "percent"
        ? value < 1 || value > 90
        : value < 1000 || value > 1e9)
    )
      fail(
        kind === "percent"
          ? `Potongan kupon ${code} harus 1–90 persen.`
          : `Potongan kupon ${code} minimal Rp 1.000.`,
      );
    const scope = Object.hasOwn(voucherScopes, v.scope) ? v.scope : "all";
    const start = typeof v.start === "string" ? v.start : "";
    const end = typeof v.end === "string" ? v.end : "";
    if ((start && !datePattern.test(start)) || (end && !datePattern.test(end)))
      fail(`Tanggal kupon ${code} tidak valid.`);
    if (start && end && end < start)
      fail(`Tanggal akhir kupon ${code} sebelum tanggal mulainya.`);
    const limit =
      v.limit === null || v.limit === undefined || v.limit === ""
        ? null
        : Number(v.limit);
    if (
      limit !== null &&
      (!Number.isSafeInteger(limit) || limit < 1 || limit > 100000)
    )
      fail(`Kuota kupon ${code} harus 1–100.000 kali, atau kosong.`);
    const note = typeof v.note === "string" ? v.note.trim() : "";
    if (note.length > 120 || /[<>]/.test(note))
      fail(`Catatan kupon ${code} maksimal 120 karakter, tanpa < atau >.`);
    return {
      id: v.id,
      code,
      enabled: v.enabled !== false,
      kind,
      value,
      maxDiscount:
        kind === "percent"
          ? rupiahField(v.maxDiscount, `Potongan maksimal kupon ${code}`, {
              optional: true,
              min: 1000,
            })
          : null,
      minSpend: rupiahField(v.minSpend, `Belanja minimal kupon ${code}`),
      scope,
      start,
      end,
      limit,
      oncePerGuest: v.oncePerGuest === true,
      note,
    };
  });
}

const texts = {
  id: {
    unknown: "Kode kupon tidak ditemukan atau sudah tidak berlaku.",
    sale: (code) => `Kupon ${code} hanya untuk barang jual.`,
    rental: (code) => `Kupon ${code} hanya untuk sewa alat.`,
    minSpend: (code, amount) =>
      `Kupon ${code} berlaku untuk belanja minimal ${amount}.`,
    used: (code) => `Kuota kupon ${code} sudah habis.`,
    once: (code) => `Kupon ${code} sudah pernah kamu pakai.`,
    priced:
      "Kupon bisa dipakai setelah harga semua alat tertera. Tanyakan harganya ke tim lewat WhatsApp.",
  },
  en: {
    unknown: "This voucher code was not found or is no longer valid.",
    sale: (code) => `Voucher ${code} is for gear to buy only.`,
    rental: (code) => `Voucher ${code} is for rental gear only.`,
    minSpend: (code, amount) =>
      `Voucher ${code} needs a minimum spend of ${amount}.`,
    used: (code) => `Voucher ${code} has been fully used.`,
    once: (code) => `You have already used voucher ${code}.`,
    priced:
      "A voucher works once every item has a price. Ask the team for the price on WhatsApp.",
  },
};
export const voucherText = (locale) => texts[locale === "en" ? "en" : "id"];

// The voucher for a code on a date (a WIT date), or null: an enabled
// voucher within its first and last days.
export function findVoucher(vouchers, code, today) {
  const wanted = cleanCode(code);
  return (
    (Array.isArray(vouchers) ? vouchers : []).find(
      (v) =>
        v.enabled &&
        v.code === wanted &&
        (!v.start || today >= v.start) &&
        (!v.end || today <= v.end),
    ) ?? null
  );
}

// The discount a voucher gives on an order's priced lines
// ({ price, quantity, rent, extra, fare }): it covers the gear in its
// scope, never the delivery fee or the fare's increase, from its minimum
// spend, at most its cap and never more than the gear it covers. Returns
// { discount, covered, rentals } (rentals is the part of the covered gear
// that is rented, for the fare's refund) or throws a message for the guest.
export function voucherDiscount(voucher, lines, locale = "id") {
  const t = voucherText(locale);
  const covered = lines.filter(
    (line) =>
      !line.extra &&
      !line.fare &&
      !line.discount &&
      (voucher.scope === "all" ||
        (voucher.scope === "rental") === Boolean(line.rent)),
  );
  if (!covered.length)
    fail(
      voucher.scope === "rental"
        ? t.rental(voucher.code)
        : t.sale(voucher.code),
    );
  const sum = (list) =>
    list.reduce((total, line) => total + line.price * line.quantity, 0);
  const subtotal = sum(covered);
  if (subtotal < voucher.minSpend)
    fail(t.minSpend(voucher.code, formatIDR(voucher.minSpend, locale)));
  let discount =
    voucher.kind === "percent"
      ? Math.floor((subtotal * voucher.value) / 100)
      : voucher.value;
  if (voucher.kind === "percent" && voucher.maxDiscount)
    discount = Math.min(discount, voucher.maxDiscount);
  discount = Math.min(discount, subtotal);
  const rentals = sum(covered.filter((line) => line.rent));
  return {
    discount,
    covered: subtotal,
    // The rented part of the discount, shared by price.
    rentals: subtotal ? Math.round((discount * rentals) / subtotal) : 0,
  };
}

// How often a voucher has been used: orders that carry it and were not
// cancelled, and of those the ones by this guest (same WhatsApp number
// or email).
export function voucherUses(bookings, voucher, guest = {}) {
  const using = (Array.isArray(bookings) ? bookings : []).filter(
    (b) =>
      b?.status !== "cancelled" &&
      (b?.payment?.voucher?.id === voucher.id ||
        b?.payment?.voucher?.code === voucher.code),
  );
  const mine = using.filter(
    (b) =>
      (guest.phone && b.phone === guest.phone) ||
      (guest.email && b.email && b.email === guest.email),
  );
  return { used: using.length, byGuest: mine.length };
}

// Whether a voucher may still be used, and by this guest; throws a
// message for the guest when not.
export function checkVoucherUses(voucher, uses, locale = "id") {
  const t = voucherText(locale);
  if (voucher.limit !== null && uses.used >= voucher.limit)
    fail(t.used(voucher.code));
  if (voucher.oncePerGuest && uses.byGuest > 0) fail(t.once(voucher.code));
}

// The voucher as the admin list describes it: "10%, maks Rp 50.000" or
// "Rp 25.000", with its minimum spend.
export function voucherSummary(v) {
  const off =
    v.kind === "percent"
      ? `${v.value}%${v.maxDiscount ? `, maks ${formatIDR(v.maxDiscount)}` : ""}`
      : formatIDR(v.value);
  return v.minSpend ? `${off}, belanja minimal ${formatIDR(v.minSpend)}` : off;
}
