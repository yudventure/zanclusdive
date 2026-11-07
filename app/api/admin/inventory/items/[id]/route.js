import { itemHandlers } from "../../../../../../src/server/records.js";
import { validateItem } from "../../../../../../src/inventory-model.js";
import { shopCatalog } from "../../../../../../src/server/shop-stock.js";

export const dynamic = "force-dynamic";
// Movements of a deleted item stay; the stock list skips them. A Dive Shop
// product whose item is deleted gets a new empty one on the next visit.
export const { PUT, DELETE } = itemHandlers({
  area: "gudang",
  kind: "item",
  prefix: "item",
  validate: validateItem,
  label: "Barang",
  context: shopCatalog,
});
