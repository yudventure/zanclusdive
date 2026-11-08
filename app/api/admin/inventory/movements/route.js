import { requireAdmin, apiFailure } from "../../../../../src/server/auth.js";
import { listRecords } from "../../../../../src/server/store.js";
import {
  createHandler,
  headers,
  bad,
  monthParam,
} from "../../../../../src/server/records.js";
import {
  validateMovement,
  stockCard,
} from "../../../../../src/inventory-model.js";
import { validMonth } from "../../../../../src/money.js";

export const dynamic = "force-dynamic";
// ?month=YYYY-MM: the month's movements, newest first. With &item=<id>,
// that item's stock card: its stock at the start of the month and its
// movements oldest first, each with the stock after it.
export async function GET(request) {
  const denied = await requireAdmin(request, "gudang");
  if (denied) return denied;
  const month = monthParam(request);
  if (!validMonth(month)) return bad("Bulan tidak valid.");
  const item = new URL(request.url).searchParams.get("item");
  try {
    const all = await listRecords("movement");
    if (item)
      return Response.json(
        { month, item, ...stockCard(all, item, month) },
        { headers },
      );
    const movements = all
      .filter((m) => m.date.startsWith(month + "-"))
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      );
    return Response.json({ month, movements }, { headers });
  } catch (error) {
    return apiFailure(error);
  }
}
export const POST = createHandler({
  area: "gudang",
  kind: "movement",
  prefix: "mv",
  validate: (input, _current, { items }) => validateMovement(input, items),
  context: async () => ({ items: await listRecords("item") }),
});
