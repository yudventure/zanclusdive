import { requireAdmin, apiFailure } from "../../../../../src/server/auth.js";
import { listRecords, listBookings } from "../../../../../src/server/store.js";
import {
  createHandler,
  headers,
  bad,
  monthParam,
} from "../../../../../src/server/records.js";
import {
  validateTransaction,
  midtransIncome,
  monthTotals,
  validMonth,
} from "../../../../../src/finance-model.js";

export const dynamic = "force-dynamic";
// ?month=YYYY-MM: the month's cash book, typed lines plus paid online
// orders, newest first, with the month's totals.
export async function GET(request) {
  const denied = await requireAdmin(request, "finance");
  if (denied) return denied;
  const month = monthParam(request);
  if (!validMonth(month)) return bad("Bulan tidak valid.");
  try {
    const [stored, bookings] = await Promise.all([
      listRecords("transaction"),
      listBookings(),
    ]);
    const transactions = [...stored, ...midtransIncome(bookings)]
      .filter((tx) => tx.date.startsWith(month + "-"))
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      );
    return Response.json(
      { month, transactions, totals: monthTotals(transactions, month) },
      { headers },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
export const POST = createHandler({
  area: "finance",
  kind: "transaction",
  prefix: "tx",
  validate: validateTransaction,
});
