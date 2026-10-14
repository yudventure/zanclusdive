import { requireAdmin, apiFailure } from "../../../../../src/server/auth.js";
import { listRecords } from "../../../../../src/server/store.js";
import { createHandler, headers } from "../../../../../src/server/records.js";
import {
  validateItem,
  stockTable,
  inventoryLimits,
} from "../../../../../src/inventory-model.js";

export const dynamic = "force-dynamic";
// Every item with its stock from all movements.
export async function GET(request) {
  const denied = await requireAdmin(request, "gudang");
  if (denied) return denied;
  try {
    const [items, movements] = await Promise.all([
      listRecords("item"),
      listRecords("movement"),
    ]);
    return Response.json({ items: stockTable(items, movements) }, { headers });
  } catch (error) {
    return apiFailure(error);
  }
}
export const POST = createHandler({
  area: "gudang",
  kind: "item",
  prefix: "item",
  validate: validateItem,
  limit: inventoryLimits.items,
});
