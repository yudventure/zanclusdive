import {
  requireAdmin,
  currentAdmin,
  passwordProblem,
  changePassword,
  jsonBody,
  apiFailure,
} from "../../../../../src/server/auth.js";
import {
  listUsers,
  saveUser,
  deleteUser,
  deletePassword,
} from "../../../../../src/server/store.js";
import {
  validateUser,
  publicUser,
  emailKey,
} from "../../../../../src/users-model.js";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const notFound = () =>
  Response.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
const validId = (id) => /^user:[0-9a-f]{16}$/.test(id);
const self = (admin, user) => emailKey(admin.email) === emailKey(user.email);

// Name, role, active state, or a new password set by the superadmin. The
// signed-in account cannot lock itself out.
export async function PUT(request, { params }) {
  const denied = await requireAdmin(request, "users");
  if (denied) return denied;
  const { id } = await params;
  if (!validId(id)) return notFound();
  let data;
  try {
    data = await jsonBody(request, 4000);
  } catch {
    return Response.json({ error: "Data tidak valid." }, { status: 400 });
  }
  try {
    const [admin, users] = await Promise.all([currentAdmin(), listUsers()]);
    const current = users.find((user) => user.id === id);
    if (!current) return notFound();
    let changes, password;
    try {
      changes = validateUser(data, current);
      password = typeof data.password === "string" ? data.password : "";
      if (password) {
        const problem = passwordProblem(current.email, password);
        if (problem) throw new Error(problem);
      }
      if (
        self(admin, current) &&
        (changes.active === false || changes.role !== current.role)
      )
        throw new Error(
          "Akun yang sedang dipakai tidak bisa dinonaktifkan atau diubah perannya.",
        );
    } catch (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    const record = {
      ...current,
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    await saveUser(record);
    if (password) await changePassword({ email: current.email }, password);
    return Response.json(publicUser(record), { headers });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(request, { params }) {
  const denied = await requireAdmin(request, "users");
  if (denied) return denied;
  const { id } = await params;
  if (!validId(id)) return notFound();
  try {
    const [admin, users] = await Promise.all([currentAdmin(), listUsers()]);
    const current = users.find((user) => user.id === id);
    if (!current) return notFound();
    if (self(admin, current))
      return Response.json(
        { error: "Akun yang sedang dipakai tidak bisa dihapus." },
        { status: 400 },
      );
    await deleteUser(id);
    await deletePassword(current.email);
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    return apiFailure(error);
  }
}
