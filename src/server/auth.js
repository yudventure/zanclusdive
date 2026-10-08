import "server-only";
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { configurationIssues } from "../cms-config.js";
import { databaseFailure } from "../database-error.js";
export const COOKIE = "zanclus_admin_session";
export function authConfigured() {
  return configurationIssues().length === 0;
}
function sign(value) {
  return createHmac("sha256", process.env.SESSION_SECRET)
    .update(process.env.ADMIN_PASSWORD + "|" + value)
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
      process.env.ADMIN_EMAIL.trim().toLowerCase(),
    ) && equal(String(password), process.env.ADMIN_PASSWORD)
  );
}
export function sessionToken() {
  const data = Buffer.from(
    JSON.stringify({
      email: process.env.ADMIN_EMAIL,
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
    return value.email === process.env.ADMIN_EMAIL &&
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
  const failure = databaseFailure(error);
  console.error("CMS database failure:", failure.code);
  return Response.json(failure, { status: 503 });
}
