import { itemHandlers } from "../../../../../../src/server/records.js";
import { validateTransaction } from "../../../../../../src/finance-model.js";

export const dynamic = "force-dynamic";
// Typed lines only: paid online orders are read from the bookings.
export const { PUT, DELETE } = itemHandlers({
  area: "finance",
  kind: "transaction",
  prefix: "tx",
  validate: validateTransaction,
  label: "Transaksi",
});
