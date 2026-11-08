// Rupiah without decimals, as the admin shows every amount.
export const money = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
// A whole rupiah amount from form input; "" counts as 0.
export function parseAmount(value, label, { min = 0, max = 1e12 } = {}) {
  if (value === "" || value === null || value === undefined) return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max)
    throw new Error(`${label} harus angka ${min} atau lebih.`);
  return Math.round(n);
}
export const cleanText = (value, max, label) => {
  const out =
    typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (out.length > max) throw new Error(`${label} maksimal ${max} karakter.`);
  if (/[<>]/.test(out))
    throw new Error(`${label} tidak boleh berisi < atau >.`);
  return out;
};
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
export const validDate = (value) =>
  typeof value === "string" &&
  datePattern.test(value) &&
  !Number.isNaN(Date.parse(value + "T12:00:00Z")) &&
  new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value;
export const validMonth = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}$/.test(value) &&
  validDate(value + "-01");
