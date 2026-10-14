import {
  money,
  parseAmount,
  cleanText,
  validDate,
  validMonth,
} from "./money.js";
export { money, validMonth };

// Finance: the cash book, the month and year reports and the tax recap.
export const txKinds = { in: "Pemasukan", out: "Pengeluaran" };
export const incomeCategories = {
  diving: "Diving",
  snorkeling: "Snorkeling",
  trip: "Trip laut",
  course: "Kursus selam",
  shop: "Dive Shop",
  rental: "Sewa alat",
  service: "Servis alat",
  other: "Lainnya",
};
export const expenseCategories = {
  gaji: "Gaji & honor",
  operasional: "Operasional: BBM, perahu, tangki",
  perlengkapan: "Perlengkapan & suku cadang",
  sewa: "Sewa, listrik, internet",
  pemasaran: "Pemasaran",
  konsumsi: "Konsumsi",
  pajak: "Pajak & retribusi",
  lainnya: "Lainnya",
};
export const paymentMethods = {
  tunai: "Tunai",
  transfer: "Transfer bank",
  qris: "QRIS",
  midtrans: "Midtrans",
  lainnya: "Lainnya",
};
export const categoriesOf = (kind) =>
  kind === "out" ? expenseCategories : incomeCategories;
export const financeLimits = { note: 300, description: 120 };
export const defaultFinanceSettings = {
  taxRate: 0.5,
  taxLabel: "PPh final UMKM 0,5%",
};

// A cash book line typed in the admin.
export function validateTransaction(input, current = null) {
  if (!input || typeof input !== "object")
    throw new Error("Data transaksi tidak valid.");
  const pick = (key) => (key in input ? input[key] : current?.[key]);
  const date = pick("date");
  if (!validDate(date)) throw new Error("Isi tanggal transaksi.");
  const kind = pick("kind") ?? "in";
  if (!(kind in txKinds)) throw new Error("Pilih pemasukan atau pengeluaran.");
  const category = pick("category") ?? Object.keys(categoriesOf(kind))[0];
  if (!(category in categoriesOf(kind))) throw new Error("Pilih kategori.");
  const amount = parseAmount(pick("amount"), "Jumlah", { min: 1 });
  const description = cleanText(
    pick("description"),
    financeLimits.description,
    "Keterangan",
  );
  if (!description) throw new Error("Isi keterangan transaksi.");
  const method = pick("method") ?? "tunai";
  if (!(method in paymentMethods)) throw new Error("Pilih cara bayar.");
  return {
    date,
    kind,
    category,
    amount,
    description,
    method,
    reference: cleanText(pick("reference"), 60, "Referensi"),
    note: cleanText(pick("note"), financeLimits.note, "Catatan"),
  };
}
export function validateFinanceSettings(input) {
  if (!input || typeof input !== "object")
    throw new Error("Pengaturan tidak valid.");
  const rate = Number(input.taxRate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100)
    throw new Error("Tarif pajak antara 0 dan 100 persen.");
  return {
    taxRate: Math.round(rate * 100) / 100,
    taxLabel:
      cleanText(input.taxLabel, 60, "Nama pajak") ||
      defaultFinanceSettings.taxLabel,
  };
}

// Paid online orders become income lines without being typed: one per
// paid booking, dated when it was paid.
const programCategory = {
  beginner: "diving",
  explorer: "diving",
  specialty: "diving",
  diving: "diving",
  snorkeling: "snorkeling",
  trip: "trip",
  course: "course",
  shop: "shop",
  service: "service",
};
export function midtransIncome(bookings) {
  return (
    bookings
      // Payments recorded by hand (transfer, cash) are entered in the
      // cashbook by the finance team, so only Midtrans is added here.
      .filter(
        (b) => b.payment?.status === "paid" && b.payment.provider !== "manual",
      )
      .map((b) => ({
        id: "tx:mt:" + b.id,
        date: (
          b.payment.paidAt ??
          b.payment.updatedAt ??
          b.updatedAt ??
          b.createdAt ??
          b.startDate
        ).slice(0, 10),
        kind: "in",
        category: programCategory[b.experience] ?? "other",
        amount: Number(b.payment.amount ?? b.amount) || 0,
        description: `${b.guestName || "Tamu"} · pembayaran online`,
        method: "midtrans",
        reference: b.payment.orderId ?? "",
        note: "",
        source: "midtrans",
        bookingId: b.id,
      }))
  );
}
const inMonth = (tx, month) => tx.date.startsWith(month + "-");
const sum = (list) => list.reduce((total, tx) => total + tx.amount, 0);
// Totals for one month, by category.
export function monthTotals(transactions, month) {
  const rows = transactions.filter((tx) => inMonth(tx, month));
  const by = (kind) =>
    Object.fromEntries(
      Object.keys(categoriesOf(kind)).map((key) => [
        key,
        sum(rows.filter((tx) => tx.kind === kind && tx.category === key)),
      ]),
    );
  const income = sum(rows.filter((tx) => tx.kind === "in"));
  const expense = sum(rows.filter((tx) => tx.kind === "out"));
  return {
    month,
    income,
    expense,
    net: income - expense,
    in: by("in"),
    out: by("out"),
  };
}
// Twelve months of profit and loss with the tax on gross income.
export function yearReport(
  transactions,
  year,
  settings = defaultFinanceSettings,
) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, "0")}`;
    const totals = monthTotals(transactions, month);
    return {
      ...totals,
      tax: Math.round((totals.income * settings.taxRate) / 100),
    };
  });
  const total = (key) => months.reduce((t, m) => t + m[key], 0);
  return {
    year,
    months,
    income: total("income"),
    expense: total("expense"),
    net: total("net"),
    tax: total("tax"),
    taxRate: settings.taxRate,
    taxLabel: settings.taxLabel,
  };
}
export const validYear = (value) => /^\d{4}$/.test(String(value));
