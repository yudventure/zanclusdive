import {
  requireAdmin,
  jsonBody,
  apiFailure,
} from "../../../../../../src/server/auth.js";
import {
  listEmployees,
  saveEmployee,
  deleteEmployee,
} from "../../../../../../src/server/store.js";
import { validateEmployee } from "../../../../../../src/hr-model.js";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const notFound = () =>
  Response.json({ error: "Pegawai tidak ditemukan." }, { status: 404 });
const validId = (id) => /^emp:[0-9a-f]{12}$/.test(id);

export async function PUT(request, { params }) {
  const denied = await requireAdmin(request, "hrd");
  if (denied) return denied;
  const { id } = await params;
  if (!validId(id)) return notFound();
  let data;
  try {
    data = await jsonBody(request, 20000);
  } catch {
    return Response.json({ error: "Data tidak valid." }, { status: 400 });
  }
  try {
    const current = (await listEmployees()).find((e) => e.id === id);
    if (!current) return notFound();
    let changes;
    try {
      changes = validateEmployee(data, current);
    } catch (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    const record = {
      ...current,
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    await saveEmployee(record);
    return Response.json(record, { headers });
  } catch (error) {
    return apiFailure(error);
  }
}

// Attendance and locked payslips stay; the lists skip employees that are
// gone.
export async function DELETE(request, { params }) {
  const denied = await requireAdmin(request, "hrd");
  if (denied) return denied;
  const { id } = await params;
  if (!validId(id)) return notFound();
  try {
    return (await deleteEmployee(id))
      ? Response.json({ ok: true }, { headers })
      : notFound();
  } catch (error) {
    return apiFailure(error);
  }
}
