import { itemHandlers } from "../../../../../../src/server/records.js";
import { validatePost } from "../../../../../../src/content-plan-model.js";

export const dynamic = "force-dynamic";
export const { PUT, DELETE } = itemHandlers({
  area: "social",
  kind: "post",
  prefix: "post",
  validate: validatePost,
  label: "Konten",
});
