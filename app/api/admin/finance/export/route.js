import { requireAdmin, apiFailure } from "../../../../../src/server/auth.js";
import { listRecords, listBookings } from "../../../../../src/server/store.js";
import { bad } from "../../../../../src/server/records.js";
import {
  midtransIncome,
  monthTotals,
  txKinds,
  categoriesOf,
  paymentMethods,
  incomeCategories,
  expenseCategories,
  validMonth,
  validYear,
} from "../../../../../src/finance-model.js";
import { workbook } from "../../../../../src/server/xlsx.js";
import { reportFor } from "../../../../../src/server/finance.js";

export const dynamic = "force-dynamic";
const file = (name, sheets) =>
  new Response(workbook(sheets), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="zanclus-${name}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
// ?kind=cashbook&month=YYYY-MM or ?kind=report&year=YYYY.
export async function GET(request) {
  const denied = await requireAdmin(request, "finance");
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") || "cashbook";
  try {
    if (kind === "cashbook") {
      const month = params.get("month") || "";
      if (!validMonth(month)) return bad("Bulan tidak valid.");
      const [stored, bookings] = await Promise.all([
        listRecords("transaction"),
        listBookings(),
      ]);
      const rows = [...stored, ...midtransIncome(bookings)]
        .filter((tx) => tx.date.startsWith(month + "-"))
        .sort((a, b) => a.date.localeCompare(b.date));
      const totals = monthTotals(rows, month);
      return file(`buku-kas-${month}`, [
        {
          name: "Buku kas",
          widths: [12, 14, 26, 40, 14, 14, 16, 20, 30],
          rows: [
            [
              "Tanggal",
              "Jenis",
              "Kategori",
              "Keterangan",
              "Masuk",
              "Keluar",
              "Cara bayar",
              "Referensi",
              "Catatan",
            ],
            ...rows.map((tx) => [
              tx.date,
              txKinds[tx.kind],
              categoriesOf(tx.kind)[tx.category] ?? tx.category,
              tx.description,
              tx.kind === "in" ? tx.amount : "",
              tx.kind === "out" ? tx.amount : "",
              paymentMethods[tx.method] ?? tx.method,
              tx.reference,
              tx.note,
            ]),
            [
              "Total",
              "",
              "",
              "",
              totals.income,
              totals.expense,
              "",
              "Bersih",
              totals.net,
            ],
          ],
        },
      ]);
    }
    if (kind === "report") {
      const year = params.get("year") || "";
      if (!validYear(year)) return bad("Tahun tidak valid.");
      const report = await reportFor(year);
      const names = report.months.map((m) => m.month);
      const line = (label, pick) => [label, ...report.months.map(pick)];
      return file(`laba-rugi-${year}`, [
        {
          name: "Laba rugi",
          widths: [30, ...names.map(() => 14), 16],
          rows: [
            ["", ...names, "Total"],
            ...Object.entries(incomeCategories).map(([key, label]) => [
              "Pemasukan · " + label,
              ...report.months.map((m) => m.in[key]),
              report.months.reduce((t, m) => t + m.in[key], 0),
            ]),
            [...line("Total pemasukan", (m) => m.income), report.income],
            ...Object.entries(expenseCategories).map(([key, label]) => [
              "Pengeluaran · " + label,
              ...report.months.map((m) => m.out[key]),
              report.months.reduce((t, m) => t + m.out[key], 0),
            ]),
            [...line("Total pengeluaran", (m) => m.expense), report.expense],
            [...line("Laba bersih", (m) => m.net), report.net],
            [
              ...line(
                `${report.taxLabel} (${report.taxRate}% dari pemasukan)`,
                (m) => m.tax,
              ),
              report.tax,
            ],
          ],
        },
      ]);
    }
    return bad("Permintaan tidak valid.");
  } catch (error) {
    return apiFailure(error);
  }
}
