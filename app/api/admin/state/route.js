import { requireAdmin, apiFailure } from "../../../../src/server/auth.js";
import {
  getContent,
  listBookings,
  listMedia,
  listAgents,
} from "../../../../src/server/store.js";
import { cmsMode } from "../../../../src/cms-mode.js";
import {
  midtransConfigured,
  midtransProduction,
} from "../../../../src/server/midtrans.js";
import { paymentsBlockedByDemo } from "../../../../src/server/payments.js";
export const dynamic = "force-dynamic";
export async function GET(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const [site, bookings, media, agents] = await Promise.all([
      getContent(),
      listBookings(),
      listMedia(),
      listAgents(),
    ]);
    return Response.json(
      {
        ...site,
        bookings,
        media,
        agents,
        mode: cmsMode(),
        payments: {
          configured: midtransConfigured(),
          production: midtransProduction(),
          blockedByDemo: paymentsBlockedByDemo(),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
