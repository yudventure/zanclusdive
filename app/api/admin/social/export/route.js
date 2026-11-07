import { requireAdmin, apiFailure } from "../../../../../src/server/auth.js";
import { listRecords } from "../../../../../src/server/store.js";
import { bad } from "../../../../../src/server/records.js";
import {
  platforms,
  formats,
  postStatuses,
  metricKeys,
  monthSummary,
} from "../../../../../src/content-plan-model.js";
import { validMonth } from "../../../../../src/money.js";
import { workbook } from "../../../../../src/server/xlsx.js";

export const dynamic = "force-dynamic";
// ?month=YYYY-MM: the month's content with its metrics, and the summary.
export async function GET(request) {
  const denied = await requireAdmin(request, "social");
  if (denied) return denied;
  const month = new URL(request.url).searchParams.get("month") || "";
  if (!validMonth(month)) return bad("Bulan tidak valid.");
  try {
    const posts = (await listRecords("post"))
      .filter((p) => p.date.startsWith(month + "-"))
      .sort((a, b) => a.date.localeCompare(b.date));
    const summary = monthSummary(posts, month);
    const metrics = Object.keys(metricKeys);
    return new Response(
      workbook([
        {
          name: "Konten",
          widths: [12, 8, 12, 14, 36, 12, 16, ...metrics.map(() => 11), 40],
          rows: [
            [
              "Tanggal",
              "Jam",
              "Platform",
              "Format",
              "Judul",
              "Status",
              "PIC",
              ...metrics.map((k) => metricKeys[k]),
              "Evaluasi",
            ],
            ...posts.map((p) => [
              p.date,
              p.time,
              platforms[p.platform],
              formats[p.format],
              p.title,
              postStatuses[p.status],
              p.pic,
              ...metrics.map((k) => p.metrics?.[k] ?? 0),
              p.evaluation,
            ]),
          ],
        },
        {
          name: "Ringkasan",
          widths: [20, 12, 12],
          rows: [
            ["Platform", "Direncanakan", "Tayang"],
            ...Object.keys(platforms).map((key) => [
              platforms[key],
              summary.byPlatform[key].planned,
              summary.byPlatform[key].live,
            ]),
            [],
            ["Metrik", "Total"],
            ...metrics.map((k) => [metricKeys[k], summary.metrics[k]]),
          ],
        },
      ]),
      {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="zanclus-konten-${month}.xlsx"`,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
