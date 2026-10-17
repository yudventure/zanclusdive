import { requireAdmin, apiFailure } from "../../../../src/server/auth.js";
import { listRecords } from "../../../../src/server/store.js";
import { headers } from "../../../../src/server/records.js";
import { stockTable } from "../../../../src/inventory-model.js";
import {
  syncShopStock,
  shopStockUse,
} from "../../../../src/server/shop-stock.js";

export const dynamic = "force-dynamic";
// For the Dive Shop editor: the warehouse item of each product and size,
// with its stock and what the shop holds of it.
export async function GET(request) {
  const denied = await requireAdmin(request, "website");
  if (denied) return denied;
  try {
    try {
      await syncShopStock();
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
          id: item.id,
          name: item.name,
          unit: item.unit,
          stock: item.stock,
          active: item.active !== false,
          productId: shop.use[item.id]?.productId ?? "",
          size: shop.use[item.id]?.size ?? "",
          shop: shop.use[item.id] ?? null,
        })),
      },
      { headers },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
