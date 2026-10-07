import {
  authConfigured,
  sameOrigin,
  jsonBody,
  passwordMatches,
  sessionToken,
  COOKIE,
  cookieOptions,
  apiFailure,
} from "../../../../src/server/auth.js";
import {
  loginBlocked,
  failLogin,
  clearLoginFailures,
} from "../../../../src/server/store.js";
import { cookies } from "next/headers";
export async function POST(request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Origin tidak valid." }, { status: 403 });
  if (!authConfigured())
    return Response.json(
      { error: "Login belum dikonfigurasi. Ikuti panduan CMS Hostinger." },
      { status: 503 },
    );
  let data;
  try {
    data = await jsonBody(request);
  } catch {
    return Response.json({ error: "Data login tidak valid." }, { status: 400 });
  }
  if (
    typeof data.email !== "string" ||
    typeof data.password !== "string" ||
    data.email.length > 250 ||
    data.password.length > 500
  )
    return Response.json({ error: "Data login tidak valid." }, { status: 400 });
  try {
    if (await loginBlocked())
      return Response.json(
        { error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." },
        { status: 429, headers: { "Retry-After": "900" } },
      );
    if (!passwordMatches(data.email, data.password)) {
      await failLogin();
      return Response.json(
        { error: "Email atau password tidak sesuai." },
        { status: 401 },
      );
    }
    await clearLoginFailures();
    (await cookies()).set(COOKIE, sessionToken(), cookieOptions());
    return Response.json({ ok: true });
  } catch {
    return apiFailure();
  }
}
