import { requireAdmin, apiFailure } from "../../../../src/server/auth.js";
import { headers } from "../../../../src/server/records.js";
import {
  rentalGear,
  syncShopStock,
} from "../../../../src/server/shop-stock.js";

export const dynamic = "force-dynamic";
// For the reservation calendar and the booking form: the rental gear and
// its stock, so the team sees what is left on each day.
export async function GET(request) {
  const denied = await requireAdmin(request, "bookings");
  if (denied) return denied;
  try {
    try {
      // New rental gear gets its warehouse item first.
      await syncShopStock();
    } catch (error) {
      console.error("Dive Shop items not synced:", error?.message);
    }
    return Response.json({ gear: await rentalGear() }, { headers });
  } catch (error) {
    return apiFailure(error);
  }
}
