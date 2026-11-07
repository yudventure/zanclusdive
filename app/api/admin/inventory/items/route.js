import { requireAdmin, apiFailure } from "../../../../../src/server/auth.js";
import { listRecords } from "../../../../../src/server/store.js";
import { createHandler, headers } from "../../../../../src/server/records.js";
import {
  validateItem,
  stockTable,
  inventoryLimits,
} from "../../../../../src/inventory-model.js";
import {
  syncShopStock,
  shopStockUse,
  shopCatalog,
} from "../../../../../src/server/shop-stock.js";

export const dynamic = "force-dynamic";
// Every item with its stock from all movements. Dive Shop products get
// their items first, and each linked item says what the shop holds of it.
export async function GET(request) {
  const denied = await requireAdmin(request, "gudang");
  if (denied) return denied;
  try {
    let created = 0;
    try {
      ({ created } = await syncShopStock());
    } catch (error) {
      console.error("Dive Shop items not synced:", error?.message);
    }
    const [items, movements, shop] = await Promise.all([
      listRecords("item"),
      listRecords("movement"),
      shopStockUse(),
    ]);
    return Response.json(
      {
        items: stockTable(items, movements).map((item) => ({
          ...item,
          shop: shop.use[item.id] ?? null,
        })),
        products: shop.products,
        created,
      },
      { headers },
    );
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
  context: shopCatalog,
});
