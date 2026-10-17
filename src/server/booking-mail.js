import "server-only";
import { after } from "next/server";
import { sendMail, mailConfigured, mailFailure } from "./mailer.js";
import { getContent, updateBooking } from "./store.js";
import { bookingMail } from "../booking-mail.js";
import { siteUrl } from "../seo.js";

// Sends one email about a booking to the guest and notes it on the
// booking (the last 12 sends), so the admin sees what went out and when.
const logLimit = 12;
export async function sendBookingMail(booking, kind, content) {
  const to = booking.email;
  if (!to) return { ok: false, error: "Reservasi ini belum punya email tamu." };
  content ??= (await getContent()).content;
  const settings = content.payments ?? {};
  let result;
  if (!mailConfigured())
    result = {
      ok: false,
      error:
        "Email belum terkirim karena SMTP belum diatur di hPanel (SMTP_HOST, SMTP_USER, SMTP_PASS).",
    };
  else
    try {
      const message = bookingMail(kind, { booking, content, base: siteUrl() });
      await sendMail({
        to,
        ...message,
        bcc: settings.copyTo || undefined,
        replyTo: content.contact?.email || undefined,
      });
      result = { ok: true };
    } catch (error) {
      console.error("Guest email failed:", error?.code || error?.message);
      result = { ok: false, error: mailFailure(error) };
    }
  const entry = {
    kind,
    to,
    at: new Date().toISOString(),
    ok: result.ok,
    ...(result.error ? { error: result.error } : {}),
  };
  await updateBooking(booking.id, (current) => ({
    ...current,
    mails: [...(current.mails ?? []), entry].slice(-logLimit),
  })).catch((error) =>
    console.error("Guest email log failed:", error?.code || error?.message),
  );
  return { ...result, to };
}

// Emails sent on their own (a website order, a Midtrans payment) follow
// the "email guests" switch in the payment settings.
export async function autoMail(booking, kind) {
  if (!booking?.email) return null;
  const { content } = await getContent();
  if (content.payments?.guestEmails === false) return null;
  return sendBookingMail(booking, kind, content);
}

// After the response is sent, so the guest and Midtrans do not wait for
// the mail server. Outside a request (tests) it runs right away.
export function later(task) {
  const run = () =>
    task().catch((error) =>
      console.error("Guest email failed:", error?.message),
    );
  try {
    after(run);
  } catch {
    run();
  }
}
