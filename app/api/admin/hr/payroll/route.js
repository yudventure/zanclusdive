import {
  requireAdmin,
  currentAdmin,
  jsonBody,
  apiFailure,
} from "../../../../../src/server/auth.js";
import {
  listEmployees,
  listAttendance,
  listPayslips,
  savePayslip,
  deletePayslip,
} from "../../../../../src/server/store.js";
import {
  monthPayroll,
  computePayslip,
  payslipId,
  validMonth,
  hrLimits,
} from "../../../../../src/hr-model.js";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const currentMonth = () =>
  new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Jayapura" })
    .slice(0, 7);

// ?month=YYYY-MM: a payslip per active employee, computed from the salary
// and the month's attendance; locked ones as they were saved.
export async function GET(request) {
  const denied = await requireAdmin(request, "hrd");
  if (denied) return denied;
  const month =
    new URL(request.url).searchParams.get("month") || currentMonth();
  if (!validMonth(month))
    return Response.json({ error: "Bulan tidak valid." }, { status: 400 });
  try {
    const [employees, records, locked] = await Promise.all([
      listEmployees(),
      listAttendance(month),
      listPayslips(month),
    ]);
    return Response.json(
      { month, slips: monthPayroll(employees, records, locked, month) },
      { headers },
    );
  } catch (error) {
    return apiFailure(error);
  }
}

// { month, employeeId, action: "lock" | "unlock", note } freezes a payslip
// as paid, or opens it again.
export async function POST(request) {
  const denied = await requireAdmin(request, "hrd");
  if (denied) return denied;
  let data;
  try {
    data = await jsonBody(request, 4000);
    if (!validMonth(data.month)) throw new Error("Bulan tidak valid.");
    if (!["lock", "unlock"].includes(data.action))
      throw new Error("Aksi tidak dikenal.");
    if (typeof data.employeeId !== "string")
      throw new Error("Pegawai tidak ditemukan.");
    if (data.note !== undefined && typeof data.note !== "string")
      throw new Error("Catatan tidak valid.");
    if ((data.note ?? "").length > hrLimits.note)
      throw new Error(`Catatan maksimal ${hrLimits.note} karakter.`);
  } catch (error) {
    return Response.json(
      { error: error.message || "Data tidak valid." },
      { status: 400 },
    );
  }
  try {
    const id = payslipId(data.employeeId, data.month);
    if (data.action === "unlock") {
      await deletePayslip(id);
      return Response.json({ ok: true }, { headers });
    }
    const [admin, employees, records] = await Promise.all([
      currentAdmin(),
      listEmployees(),
      listAttendance(data.month),
    ]);
    const employee = employees.find((e) => e.id === data.employeeId);
    if (!employee)
      return Response.json(
        { error: "Pegawai tidak ditemukan." },
        { status: 404 },
      );
    const slip = {
      ...computePayslip(employee, records, data.month),
      note: (data.note ?? "").trim().replace(/[<>]/g, ""),
      lockedAt: new Date().toISOString(),
      lockedBy: admin.email,
    };
    await savePayslip(slip);
    return Response.json({ ...slip, locked: true }, { headers });
  } catch (error) {
    return apiFailure(error);
  }
}
