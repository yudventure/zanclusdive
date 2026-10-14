import { randomBytes } from "node:crypto";
import {
  requireAdmin,
  currentAdmin,
  jsonBody,
  apiFailure,
} from "../../../../../src/server/auth.js";
import {
  listEmployees,
  saveEmployee,
} from "../../../../../src/server/store.js";
import { validateEmployee, hrLimits } from "../../../../../src/hr-model.js";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET(request) {
  const denied = await requireAdmin(request, "hrd");
  if (denied) return denied;
  try {
    return Response.json({ employees: await listEmployees() }, { headers });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request) {
  const denied = await requireAdmin(request, "hrd");
  if (denied) return denied;
  let employee;
  try {
    employee = validateEmployee(await jsonBody(request, 20000));
  } catch (error) {
    return Response.json(
      { error: error.message || "Data pegawai tidak valid." },
      { status: 400 },
    );
  }
  try {
    const [admin, employees] = await Promise.all([
      currentAdmin(),
      listEmployees(),
    ]);
    if (employees.length >= hrLimits.employees)
      return Response.json(
        { error: `Maksimal ${hrLimits.employees} pegawai.` },
        { status: 400 },
      );
    const now = new Date().toISOString();
    const record = {
      id: "emp:" + randomBytes(6).toString("hex"),
      ...employee,
      createdAt: now,
      updatedAt: now,
      createdBy: admin.email,
    };
    await saveEmployee(record);
    return Response.json(record, { status: 201, headers });
  } catch (error) {
    return apiFailure(error);
  }
}
