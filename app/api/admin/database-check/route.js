import { authConfigured, sameOrigin, jsonBody, passwordMatches } from "../../../../src/server/auth.js";
import { checkDatabase } from "../../../../src/server/database-check.js";
import { isDemo } from "../../../../src/cms-mode.js";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const respond = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (!sameOrigin(request)) return respond({ error: "Origin tidak valid." }, 403);
  if (isDemo()) return respond({ error: "Mode demo berjalan tanpa MySQL. Pemeriksaan database tersedia pada mode MySQL." }, 400);
  if (!authConfigured()) return respond({ error: "Lengkapi konfigurasi CMS terlebih dahulu." }, 503);
  // This limit works even when MySQL is unreachable. No persistent login is issued.
  const now = Date.now();
  if (!globalThis.__zanclusDBChecks || now - globalThis.__zanclusDBChecks.start >= 900000)
    globalThis.__zanclusDBChecks = { start: now, attempts: 0 };
  const limit = globalThis.__zanclusDBChecks;
  if (limit.attempts >= 8) return respond({ error: "Terlalu banyak pemeriksaan. Coba lagi dalam 15 menit." }, 429);
  limit.attempts++;
  let data;
  try { data = await jsonBody(request); } catch { return respond({ error: "Data tidak valid." }, 400); }
  if (typeof data.email !== "string" || typeof data.password !== "string" || data.email.length > 250 || data.password.length > 500)
    return respond({ error: "Data tidak valid." }, 400);
  if (!passwordMatches(data.email, data.password)) return respond({ error: "Email atau password admin tidak sesuai." }, 401);
  if (data.mysqlPassword !== undefined && (typeof data.mysqlPassword !== "string" || data.mysqlPassword.length > 500))
    return respond({ error: "Password uji MySQL tidak valid." }, 400);
  const result = await checkDatabase(data.mysqlPassword || undefined);
  return respond(result, result.ok ? 200 : 503);
}
