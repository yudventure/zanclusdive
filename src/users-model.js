import { roleKeys, roleLabel } from "./roles.js";

// Staff accounts made in the admin: { id, email, name, role, active,
// createdAt, updatedAt }. Their passwords live with the other changed
// passwords, never on the record.
export const userLimit = 50;
export const emailKey = (email) => String(email).trim().toLowerCase();
const emailPattern = /^[^\s@]{1,64}@[^\s@]{1,120}\.[^\s@]{2,24}$/;

function cleanName(value, fallback) {
  const name =
    typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!name) return fallback;
  if (name.length > 60) throw new Error("Nama maksimal 60 karakter.");
  if (/[<>]/.test(name)) throw new Error("Nama tidak boleh berisi < atau >.");
  return name;
}
// Checks a new or changed user. "current" is the stored record when
// editing; the email cannot change then.
export function validateUser(input, current = null) {
  if (!input || typeof input !== "object")
    throw new Error("Data pengguna tidak valid.");
  const email = current ? current.email : emailKey(input.email ?? "");
  if (!emailPattern.test(email))
    throw new Error("Isi alamat email yang benar.");
  const role = input.role ?? current?.role;
  if (!roleKeys.includes(role)) throw new Error("Pilih peran pengguna.");
  const fallback = email.split("@")[0].replace(/[._+-]+/g, " ");
  const name = cleanName(
    input.name ?? current?.name,
    fallback[0].toUpperCase() + fallback.slice(1),
  );
  const active =
    typeof input.active === "boolean"
      ? input.active
      : (current?.active ?? true);
  return { email, name, role, active };
}
// What the admin shows about a user; nothing secret is on the record.
export const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  roleLabel: roleLabel(user.role),
  active: user.active !== false,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
