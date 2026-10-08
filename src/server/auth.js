import "server-only";
import { createHmac, createHash, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { configurationIssues } from "../cms-config.js";
import { databaseFailure } from "../database-error.js";
import { isDemo } from "../cms-mode.js";
import { demoAccount } from "../demo-data.js";
export const COOKIE = "zanclus_admin_session";
function account() {
  if (!isDemo()) return { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, secret: process.env.SESSION_SECRET };
  globalThis.__zanclusDemoSecret ||= randomBytes(48).toString("base64url");
  return { ...demoAccount, secret: globalThis.__zanclusDemoSecret };
}
export function authConfigured() {
  return isDemo() || configurationIssues().length === 0;
}
function sign(value) {
  const credentials = account();
  return createHmac("sha256", credentials.secret)
    .update(credentials.password + "|" + value)
    .digest("base64url");
}
function equal(a, b) {
  const aa = createHash("sha256").update(a).digest(),
    bb = createHash("sha256").update(b).digest();
  return timingSafeEqual(aa, bb);
}
export function passwordMatches(email, password) {
  return (
    equal(
      String(email).trim().toLowerCase(),
      account().email.trim().toLowerCase(),
    ) && equal(String(password), account().password)
  );
}
export function sessionToken() {
  const data = Buffer.from(
    JSON.stringify({
      email: account().email,
      expires: Date.now() + 8 * 3600000,
    }),
  ).toString("base64url");
  return data + "." + sign(data);
}
export async function currentAdmin() {
  if (!authConfigured()) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 1500) return null;
  try {
    const [data, sig, ...rest] = token.split(".");
    if (rest.length || !sig || !equal(sign(data), sig)) return null;
    const value = JSON.parse(Buffer.from(data, "base64url").toString());
    return value.email === account().email &&
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
export async function jsonBody(request) {
  if (Number(request.headers.get("content-length") || 0) > 64000)
    throw new Error("Data terlalu besar.");
  const text = await request.text();
  if (Buffer.byteLength(text) > 64000) throw new Error("Data terlalu besar.");
  return JSON.parse(text);
}
export function apiFailure(error) {
  if (isDemo()) {
    const limit = error?.message === "DEMO_MEDIA_LIMIT";
    return Response.json({ error: limit ? "Total gambar demo maksimal 24 MB." : "Penyimpanan demo belum dapat diakses. Coba lagi atau restart aplikasi demo." }, { status: limit ? 413 : 503 });
  }
  const failure = databaseFailure(error);
  console.error("CMS database failure:", failure.code);
  return Response.json(failure, { status: 503 });
}
