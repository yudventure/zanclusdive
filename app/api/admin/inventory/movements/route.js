import { requireAdmin, apiFailure } from "../../../../../src/server/auth.js";
import { listRecords } from "../../../../../src/server/store.js";
import {
  createHandler,
  headers,
  bad,
  monthParam,
} from "../../../../../src/server/records.js";
import { validateMovement } from "../../../../../src/inventory-model.js";
import { validMonth } from "../../../../../src/money.js";

export const dynamic = "force-dynamic";
// ?month=YYYY-MM: the month's movements, newest first.
export async function GET(request) {
  const denied = await requireAdmin(request, "gudang");
  if (denied) return denied;
  const month = monthParam(request);
  if (!validMonth(month)) return bad("Bulan tidak valid.");
  try {
    const movements = (await listRecords("movement"))
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
