import { itemHandlers } from "../../../../../../src/server/records.js";
import { validateItem } from "../../../../../../src/inventory-model.js";

export const dynamic = "force-dynamic";
// Movements of a deleted item stay; the stock list skips them.
export const { PUT, DELETE } = itemHandlers({
  area: "gudang",
  kind: "item",
  prefix: "item",
  validate: validateItem,
  label: "Barang",
});
