import "server-only";
import { sendMail, mailConfigured } from "./mailer.js";
import { getContent } from "./store.js";
import { siteUrl } from "../seo.js";
import { teamMail, teamRecipients } from "../team-mail.js";
import { later } from "./booking-mail.js";

// Tells the team a booking came in from the website ("new") or was paid
// ("paid"), after the guest's answer is sent. Without SMTP, or with the
// notice switched off, nothing is sent.
export function notifyTeam(booking, kind = "new") {
  if (!booking) return;
  later(async () => {
    if (!mailConfigured()) return;
    const { content } = await getContent();
    if (kind === "paid" && content.payments?.notify?.paid === false) return;
    const to = teamRecipients(content);
    if (!to.length) return;
    const message = teamMail(kind, booking, { content, base: siteUrl() });
    try {
      await sendMail({
        to: to.join(", "),
        ...message,
        replyTo: booking.email || undefined,
      });
    } catch (error) {
      console.error(
        "Team booking email failed:",
        error?.code || error?.message,
      );
    }
  });
}
