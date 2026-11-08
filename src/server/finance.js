import "server-only";
import { listRecords, listBookings } from "./store.js";
import {
  midtransIncome,
  yearReport,
  defaultFinanceSettings,
} from "../finance-model.js";

// The tax recap settings, saved as the "finance" setting record.
export async function financeSettings() {
  const saved = (await listRecords("setting")).find((r) => r.id === "finance");
  return { ...defaultFinanceSettings, ...(saved ?? {}) };
}
// Twelve months of typed lines and paid online orders.
export async function reportFor(year) {
  const [stored, bookings, settings] = await Promise.all([
    listRecords("transaction"),
    listBookings(),
    financeSettings(),
  ]);
  return yearReport([...stored, ...midtransIncome(bookings)], year, settings);
}
