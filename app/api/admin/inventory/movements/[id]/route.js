import { itemHandlers } from "../../../../../../src/server/records.js";
import { listRecords } from "../../../../../../src/server/store.js";
import { validateMovement } from "../../../../../../src/inventory-model.js";

export const dynamic = "force-dynamic";
// A wrong movement is deleted and typed again; editing keeps the history
// honest.
export const { DELETE } = itemHandlers({
  area: "gudang",
  kind: "movement",
  prefix: "mv",
  validate: (input, _current, { items }) => validateMovement(input, items),
  context: async () => ({ items: await listRecords("item") }),
  label: "Mutasi",
});
