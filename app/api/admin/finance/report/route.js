import {
  requireAdmin,
  jsonBody,
  apiFailure,
} from "../../../../../src/server/auth.js";
import { saveRecord } from "../../../../../src/server/store.js";
import { reportFor } from "../../../../../src/server/finance.js";
import { headers, bad } from "../../../../../src/server/records.js";
import {
  validYear,
  validateFinanceSettings,
} from "../../../../../src/finance-model.js";

export const dynamic = "force-dynamic";
// ?year=YYYY: twelve months of profit and loss with the tax recap.
export async function GET(request) {
  const denied = await requireAdmin(request, "finance");
  if (denied) return denied;
  const year =
    new URL(request.url).searchParams.get("year") ||
    new Date()
      .toLocaleDateString("en-CA", { timeZone: "Asia/Jayapura" })
      .slice(0, 4);
  if (!validYear(year)) return bad("Tahun tidak valid.");
  try {
    return Response.json(await reportFor(year), { headers });
  } catch (error) {
    return apiFailure(error);
  }
}
// { taxRate, taxLabel } for the recap.
export async function PUT(request) {
  const denied = await requireAdmin(request, "finance");
  if (denied) return denied;
  let settings;
  try {
    settings = validateFinanceSettings(await jsonBody(request, 2000));
  } catch (error) {
    return bad(error.message || "Pengaturan tidak valid.");
  }
  try {
    await saveRecord("setting", { id: "finance", ...settings });
    return Response.json(settings, { headers });
  } catch (error) {
    return apiFailure(error);
  }
}
