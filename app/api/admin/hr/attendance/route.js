import {
  requireAdmin,
  jsonBody,
  apiFailure,
} from "../../../../../src/server/auth.js";
import {
  listEmployees,
  listAttendance,
  saveAttendance,
} from "../../../../../src/server/store.js";
import {
  validateAttendance,
  validMonth,
  validDate,
} from "../../../../../src/hr-model.js";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const currentMonth = () =>
  new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Jayapura" })
    .slice(0, 7);

// ?month=YYYY-MM: the month's records for every employee.
export async function GET(request) {
  const denied = await requireAdmin(request, "hrd");
  if (denied) return denied;
  const month =
    new URL(request.url).searchParams.get("month") || currentMonth();
  if (!validMonth(month))
    return Response.json({ error: "Bulan tidak valid." }, { status: 400 });
  try {
    return Response.json(
      { month, records: await listAttendance(month) },
      { headers },
    );
  } catch (error) {
    return apiFailure(error);
  }
}

// { date, rows: [{ employeeId, status, timeIn, timeOut, note }] } saves
// one day for several employees at once.
export async function POST(request) {
  const denied = await requireAdmin(request, "hrd");
  if (denied) return denied;
  let data;
  try {
    data = await jsonBody(request, 60000);
    if (!validDate(data.date)) throw new Error("Tanggal absensi tidak valid.");
    if (
      !Array.isArray(data.rows) ||
      !data.rows.length ||
      data.rows.length > 300
    )
      throw new Error("Isi absensi minimal satu pegawai.");
  } catch (error) {
    return Response.json(
      { error: error.message || "Data absensi tidak valid." },
      { status: 400 },
    );
  }
  try {
    const employees = await listEmployees();
    let records;
    try {
      records = data.rows.map((row) =>
        validateAttendance({ ...row, date: data.date }, employees),
      );
    } catch (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    const savedAt = new Date().toISOString();
    await saveAttendance(records.map((record) => ({ ...record, savedAt })));
    return Response.json({ ok: true, records }, { headers });
  } catch (error) {
    return apiFailure(error);
  }
}
