import { requireAdmin, apiFailure } from "../../../../../src/server/auth.js";
import { listRecords } from "../../../../../src/server/store.js";
import {
  createHandler,
  headers,
  bad,
  monthParam,
} from "../../../../../src/server/records.js";
import {
  validatePost,
  monthSummary,
} from "../../../../../src/content-plan-model.js";
import { validMonth } from "../../../../../src/money.js";

export const dynamic = "force-dynamic";
// ?month=YYYY-MM: the month's planned and published content, by date.
export async function GET(request) {
  const denied = await requireAdmin(request, "social");
  if (denied) return denied;
  const month = monthParam(request);
  if (!validMonth(month)) return bad("Bulan tidak valid.");
  try {
    const posts = (await listRecords("post"))
      .filter((p) => p.date.startsWith(month + "-"))
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.time ?? "").localeCompare(b.time ?? ""),
      );
    return Response.json(
      { month, posts, summary: monthSummary(posts, month) },
      { headers },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
export const POST = createHandler({
  area: "social",
  kind: "post",
  prefix: "post",
  validate: validatePost,
});
