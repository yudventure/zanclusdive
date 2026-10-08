import { requireAdmin, apiFailure } from "../../../../src/server/auth.js";
import {
  getContent,
  listBookings,
  listMedia,
} from "../../../../src/server/store.js";
import { cmsMode } from "../../../../src/cms-mode.js";
export const dynamic = "force-dynamic";
export async function GET(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const [site, bookings, media] = await Promise.all([
      getContent(),
      listBookings(),
      listMedia(),
    ]);
    return Response.json(
      { ...site, bookings, media, mode: cmsMode() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
