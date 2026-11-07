import { randomBytes } from "node:crypto";
import {
  requireAdmin,
  currentAdmin,
  builtInAccounts,
  passwordProblem,
  changePassword,
  jsonBody,
  apiFailure,
} from "../../../../src/server/auth.js";
import { listUsers, saveUser } from "../../../../src/server/store.js";
import {
  validateUser,
  publicUser,
  userLimit,
  emailKey,
} from "../../../../src/users-model.js";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

// Staff accounts and the built-in superadmin accounts, for Pengguna & peran.
export async function GET(request) {
  const denied = await requireAdmin(request, "users");
  if (denied) return denied;
  try {
    const users = await listUsers();
    return Response.json(
      { users: users.map(publicUser), builtIn: builtInAccounts() },
      { headers },
    );
  } catch (error) {
    return apiFailure(error);
  }
}

// A new staff account with its first password. The person changes it
// later with a code sent to their own email.
export async function POST(request) {
  const denied = await requireAdmin(request, "users");
  if (denied) return denied;
  let user, password;
  try {
    const data = await jsonBody(request, 4000);
    user = validateUser(data);
    password = data.password;
    if (typeof password !== "string" || !password)
      throw new Error("Isi password awal untuk pengguna ini.");
    const problem = passwordProblem(user.email, password);
    if (problem) throw new Error(problem);
  } catch (error) {
    return Response.json(
      { error: error.message || "Data pengguna tidak valid." },
      { status: 400 },
    );
  }
  try {
    const [admin, users] = await Promise.all([currentAdmin(), listUsers()]);
    const taken = [...users, ...builtInAccounts()].some(
      (other) => emailKey(other.email) === user.email,
    );
    if (taken)
      return Response.json(
        { error: "Email ini sudah dipakai akun lain." },
        { status: 409 },
      );
    if (users.length >= userLimit)
      return Response.json(
        { error: `Maksimal ${userLimit} pengguna.` },
        { status: 400 },
      );
    const now = new Date().toISOString();
    const record = {
      id: "user:" + randomBytes(8).toString("hex"),
      ...user,
      createdAt: now,
      updatedAt: now,
      createdBy: admin.email,
    };
    await saveUser(record);
    await changePassword({ email: user.email }, password);
    return Response.json(publicUser(record), { status: 201, headers });
  } catch (error) {
    return apiFailure(error);
  }
}
