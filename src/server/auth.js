import "server-only";
import {
  createHmac,
  createHash,
  timingSafeEqual,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { cookies } from "next/headers";
import { configurationIssues } from "../cms-config.js";
import { databaseFailure } from "../database-error.js";
import { isDemo } from "../cms-mode.js";
import { demoAccount } from "../demo-data.js";
import { operatorAccount } from "./operator-account.js";
import { adminCookie } from "../developer.js";
import { listPasswords, savePassword } from "./store.js";
export const COOKIE = adminCookie;
// The public demo login only works when CMS_DEMO_LOGIN=true (local tests).
export const demoLoginEnabled = () =>
  isDemo() && process.env.CMS_DEMO_LOGIN === "true";
const envAccount = () =>
  process.env.ADMIN_EMAIL?.trim() && process.env.ADMIN_PASSWORD
    ? { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }
    : null;
function secret() {
  if (process.env.SESSION_SECRET?.trim()) return process.env.SESSION_SECRET;
  globalThis.__zanclusSessionSecret ||= randomBytes(48).toString("base64url");
  return globalThis.__zanclusSessionSecret;
}
// Accounts that may sign in. MySQL mode uses the environment account only.
function baseAccounts() {
  if (!isDemo()) return [envAccount()].filter(Boolean);
  // The operator account always works; an ADMIN_EMAIL/ADMIN_PASSWORD pair
  // left in the hosting panel is accepted as well, not instead.
  const own = [operatorAccount, envAccount()].filter(
    (account, i, list) =>
      account &&
      list.findIndex(
        (other) =>
          other?.email.trim().toLowerCase() ===
          account.email.trim().toLowerCase(),
      ) === i,
  );
  return demoLoginEnabled() ? [...own, demoAccount] : own;
}
const emailKey = (email) => String(email).trim().toLowerCase();
// A password changed in the admin replaces the account's original one.
async function accounts() {
  const changed = await listPasswords();
  return baseAccounts().map((account) => {
    const record = changed[emailKey(account.email)];
    return record
      ? { email: account.email, salt: record.salt, hash: record.hash }
      : account;
  });
}
export function authConfigured() {
  return isDemo() || configurationIssues().length === 0;
}
// Each account's secret part, so a password change ends its sessions.
const fingerprint = (account) => account.hash ?? account.password;
function sign(account, value) {
  return createHmac("sha256", secret())
    .update(fingerprint(account) + "|" + value)
    .digest("base64url");
}
function equal(a, b) {
  const aa = createHash("sha256").update(a).digest(),
    bb = createHash("sha256").update(b).digest();
  return timingSafeEqual(aa, bb);
}
function passwordOf(account, password) {
  if (!account.hash) return equal(String(password), account.password);
  const actual = scryptSync(String(password), account.salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return timingSafeEqual(actual, Buffer.from(account.hash, "base64url"));
}
// Spaces picked up when a password is pasted are forgiven.
const passwordMatchesAccount = (account, password) =>
  passwordOf(account, password) ||
  (String(password).trim() !== String(password) &&
    passwordOf(account, String(password).trim()));
const sameEmail = (account, email) =>
  equal(String(email).trim().toLowerCase(), account.email.trim().toLowerCase());
// Returns the matching account, or null.
export async function passwordMatches(email, password) {
  const account = (await accounts()).find((a) => sameEmail(a, email));
  return account && passwordMatchesAccount(account, password) ? account : null;
}
// The hosting-panel password, for the database check only: it must work
// while the database holding a changed password is unreachable.
export function basePasswordMatches(email, password) {
  const account = baseAccounts().find((a) => sameEmail(a, email));
  return account && passwordMatchesAccount(account, password) ? account : null;
}
// The account with this email, or null.
export async function findAccount(email) {
  return (await accounts()).find((a) => sameEmail(a, email)) ?? null;
}
// New passwords: 10–200 characters, not the email address.
export function passwordProblem(email, password) {
  if (typeof password !== "string" || password.length < 10)
    return "Password baru minimal 10 karakter.";
  if (password.length > 200) return "Password baru maksimal 200 karakter.";
  if (password.trim() !== password)
    return "Password baru tidak boleh diawali atau diakhiri spasi.";
  if (emailKey(password) === emailKey(email))
    return "Password baru tidak boleh sama dengan email.";
  return "";
}
// Saves a new password for the account and returns the account as it now
// signs in. Its earlier sessions stop working.
export async function changePassword(account, password) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  }).toString("base64url");
  await savePassword(account.email, {
    salt,
    hash,
    changedAt: new Date().toISOString(),
  });
  return { email: account.email, salt, hash };
}
// A session for the account returned by passwordMatches.
export function sessionToken(account) {
  const data = Buffer.from(
    JSON.stringify({
      email: account.email,
      expires: Date.now() + 8 * 3600000,
    }),
  ).toString("base64url");
  return data + "." + sign(account, data);
}
export async function currentAdmin() {
  if (!authConfigured()) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 1500) return null;
  try {
    const [data, sig, ...rest] = token.split(".");
    if (rest.length || !sig) return null;
    const value = JSON.parse(Buffer.from(data, "base64url").toString());
    const account = (await accounts()).find((a) => a.email === value.email);
    return account &&
      equal(sign(account, data), sig) &&
      Number.isFinite(value.expires) &&
      value.expires > Date.now()
      ? { email: value.email }
      : null;
  } catch {
    return null;
  }
}
export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure:
      process.env.CMS_COOKIE_SECURE === "false"
        ? false
        : process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 3600,
  };
}
export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const host = new URL(origin).host;
    const allowed = [
      request.headers.get("host"),
      request.headers.get("x-forwarded-host")?.split(",")[0].trim(),
    ];
    return allowed.includes(host);
  } catch {
    return false;
  }
}
export async function requireAdmin(request) {
  if (!(await currentAdmin()))
    return Response.json(
      { error: "Silakan login sebagai admin." },
      { status: 401 },
    );
  if (request.method !== "GET" && !sameOrigin(request))
    return Response.json(
      { error: "Permintaan dari origin lain ditolak." },
      { status: 403 },
    );
  return null;
}
export async function jsonBody(request, limit = 64000) {
  if (Number(request.headers.get("content-length") || 0) > limit)
    throw new Error("Data terlalu besar.");
  const text = await request.text();
  if (Buffer.byteLength(text) > limit) throw new Error("Data terlalu besar.");
  return JSON.parse(text);
}
export function apiFailure(error) {
  if (isDemo()) {
    const limit = error?.message === "DEMO_MEDIA_LIMIT";
    return Response.json(
      {
        error: limit
          ? "Ruang foto penuh (maksimal 400 MB)."
          : "Penyimpanan belum dapat diakses. Coba lagi sebentar lagi.",
      },
      { status: limit ? 413 : 503 },
    );
  }
  const failure = databaseFailure(error);
  console.error("CMS database failure:", failure.code);
  return Response.json(failure, { status: 503 });
}
