import {
  requireAdmin,
  COOKIE,
  cookieOptions,
} from "../../../../src/server/auth.js";
import { cookies } from "next/headers";
export async function POST(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  (await cookies()).set(COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  return Response.json({ ok: true });
}
