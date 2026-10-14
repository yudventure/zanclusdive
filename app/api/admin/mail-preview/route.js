import {
  requireAdmin,
  currentAdmin,
  jsonBody,
  apiFailure,
} from "../../../../src/server/auth.js";
import { getContent } from "../../../../src/server/store.js";
import {
  bookingMail,
  sampleBooking,
  mailKinds,
} from "../../../../src/booking-mail.js";
import {
  sendMail,
  mailConfigured,
  mailFailure,
  otpRecipient,
} from "../../../../src/server/mailer.js";
import { hasArea } from "../../../../src/roles.js";
import { siteUrl } from "../../../../src/seo.js";

// The guest emails with a made-up booking and the saved settings: GET shows
// one, POST sends it to the signed-in admin's own inbox.
export const dynamic = "force-dynamic";
function sample(params) {
  const kind = mailKinds.includes(params.kind) ? params.kind : "order";
  const method = params.method === "transfer" ? "transfer" : "midtrans";
  const lang = params.lang === "en" ? "en" : "id";
  return { kind, booking: sampleBooking(kind, { method, lang }) };
}
async function allowed(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const admin = await currentAdmin();
  if (!hasArea(admin.role, "payments") && !hasArea(admin.role, "bookings"))
    return Response.json(
      { error: "Peran ini tidak punya akses ke bagian ini." },
      { status: 403 },
    );
  return null;
}
export async function GET(request) {
  const denied = await allowed(request);
  if (denied) return denied;
  try {
    const query = Object.fromEntries(new URL(request.url).searchParams);
    const { kind, booking } = sample(query);
    const { content } = await getContent();
    const { html } = bookingMail(kind, { booking, content, base: siteUrl() });
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy": "script-src 'none'",
      },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request) {
  const denied = await allowed(request);
  if (denied) return denied;
  try {
    const { kind, booking } = sample(await jsonBody(request, 1000));
    if (!mailConfigured())
      return Response.json(
        {
          error:
            "SMTP belum diatur di hPanel (SMTP_HOST, SMTP_USER, SMTP_PASS).",
        },
        { status: 409 },
      );
    const admin = await currentAdmin();
    const to = otpRecipient(admin);
    const { content } = await getContent();
    const message = bookingMail(kind, { booking, content, base: siteUrl() });
    try {
      await sendMail({
        to,
        ...message,
        subject: "[Contoh] " + message.subject,
      });
    } catch (error) {
      return Response.json({ error: mailFailure(error) }, { status: 502 });
    }
    return Response.json({ ok: true, to });
  } catch (error) {
    return apiFailure(error);
  }
}
