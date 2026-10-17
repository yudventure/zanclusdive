import {
  requireAdmin,
  currentAdmin,
  apiFailure,
} from "../../../../src/server/auth.js";
import {
  getContent,
  listBookings,
  listMedia,
  listAgents,
} from "../../../../src/server/store.js";
import { cmsMode } from "../../../../src/cms-mode.js";
import { hasArea } from "../../../../src/roles.js";
import { siteUrl } from "../../../../src/seo.js";
import {
  midtransConfigured,
  midtransProduction,
  keyIssues,
  lastMidtransError,
  midtransKeyEnding,
} from "../../../../src/server/midtrans.js";
import {
  paymentsBlockedByDemo,
  paymentsReady,
} from "../../../../src/server/payments.js";
import { mailConfigured, mailSender } from "../../../../src/server/mailer.js";
import { demoStorageDirectory } from "../../../../src/server/demo-store.js";
export const dynamic = "force-dynamic";
// The admin's working data. Site content is what the website shows, so
// every role gets it; bookings, media, agents and the payment settings
// only go to the roles whose areas cover them.
export async function GET(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const admin = await currentAdmin();
    const can = (area) => hasArea(admin.role, area);
    const [site, bookings, media, agents] = await Promise.all([
      getContent(),
      can("bookings") || can("payments") ? listBookings() : [],
      can("website") ? listMedia() : [],
      can("agents") ? listAgents() : [],
    ]);
    return Response.json(
      {
        ...site,
        // Finance sees the online payments, not the other reservations.
        bookings: can("bookings")
          ? bookings
          : bookings.filter((booking) => booking.payment),
        media,
        agents,
        mode: cmsMode(),
        site: { url: siteUrl() },
        account: {
          email: admin.email,
          name: admin.name,
          role: admin.role,
          areas: admin.areas,
        },
        // Whether guest emails can go out, for the reservation and payment
        // pages.
        mail:
          can("bookings") || can("payments")
            ? { configured: mailConfigured(), from: mailSender() }
            : null,
        // Whether the reservation form can bill by Midtrans link.
        billing: can("bookings")
          ? { midtrans: paymentsReady(site.content) }
          : null,
        payments: can("payments")
          ? {
              configured: midtransConfigured(),
              production: midtransProduction(),
              blockedByDemo: paymentsBlockedByDemo(),
              // Where bookings and payments are kept without MySQL.
              demoFolder: cmsMode() === "demo" ? demoStorageDirectory() : null,
              issues: keyIssues(),
              keyEnding: midtransKeyEnding(),
              lastError: lastMidtransError(),
            }
          : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
