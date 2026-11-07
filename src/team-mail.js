// The email to the team when a booking comes in from the website, or when
// one is paid: who, what, when, how it is paid, and a button to open it in
// the panel. Indonesian only, for the team. No colons in the text, as in
// every email the owner sends.
import { bookingReference } from "./booking-model.js";
import { formatIDR } from "./i18n.js";
import { methodLabel, programName, witDateTime } from "./booking-mail.js";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const day = (date) =>
  new Date(date + "T12:00:00Z").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
export const teamDates = (b) =>
  b.endDate && b.endDate !== b.startDate
    ? `${day(b.startDate)} sampai ${day(b.endDate)}`
    : day(b.startDate);

// How the booking is paid, in a few words.
export function paymentText(b) {
  const p = b.payment;
  if (!p) return "Permintaan, belum ada pembayaran";
  if (p.status === "paid")
    return `Lunas lewat ${p.provider === "paypal" ? "PayPal" : methodLabel(p.method, "id")}`;
  const due = p.dueAt ? `, batas ${witDateTime(p.dueAt, "id")}` : "";
  if (p.provider === "manual" && p.method === "transfer")
    return `Menunggu transfer bank${due}`;
  if (p.provider === "paypal") return `Menunggu pembayaran PayPal${due}`;
  return `Menunggu pembayaran Midtrans${due}`;
}

export function teamMail(kind, booking, { content, base }) {
  const reference = booking.reference ?? bookingReference(booking.id);
  const program = programName(content, booking.experience, "id");
  const money = formatIDR(
    Number(booking.payment?.amount ?? booking.amount) || 0,
    "id",
  );
  const who = booking.guestName || "Tamu";
  const paid = kind === "paid";
  const subject = paid
    ? `Lunas · ${who} · ${money} · ${program}`
    : `Booking baru · ${who} · ${program} · ${teamDates(booking)}`;
  const intro = paid
    ? `${who} sudah membayar ${money}. Reservasinya kini Dikonfirmasi.`
    : booking.payment
      ? `${who} memesan lewat website dan sedang membayar. Pesanan sudah masuk di Kalender reservasi.`
      : `${who} mengirim permintaan booking lewat website. Hubungi tamu untuk memastikan jadwal dan harga.`;
  const phone = String(booking.phone ?? "").replace(/\D/g, "");
  const wa = phone ? `https://wa.me/${phone}` : "";
  const link = booking.id
    ? `${base}/admin/calendar?booking=${encodeURIComponent(booking.id)}`
    : `${base}/admin/calendar#daftar-reservasi`;
  const rows = [
    ["Kode", reference],
    ["Tamu", who],
    ["WhatsApp", booking.phone ?? ""],
    ["Email", booking.email ?? ""],
    ["Kegiatan", program],
    ["Tanggal", teamDates(booking)],
    ["Peserta", `${booking.participants} orang`],
    ["Nilai", money],
    ["Pembayaran", paymentText(booking)],
    ["Catatan", booking.notes ?? ""],
  ].filter(([, value]) => value);
  const html = `<!doctype html><html lang="id"><body style="margin:0;background:#eef4f7;font-family:Arial,Helvetica,sans-serif;color:#1b3a4b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef4f7;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:26px 24px;">
<tr><td>
<p style="margin:0 0 6px;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;color:${paid ? "#1e7a4f" : "#1f6fa8"};">${paid ? "Pembayaran masuk" : "Booking masuk"}</p>
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#14324a;">${esc(subject)}</h1>
<p style="margin:0 0 18px;font-size:15px;line-height:1.6;">${esc(intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">
${rows
  .map(
    ([label, value]) =>
      `<tr><td style="padding:8px 12px 8px 0;font-size:13px;color:#5d7484;vertical-align:top;white-space:nowrap;">${esc(label)}</td><td style="padding:8px 0;font-size:15px;font-weight:600;white-space:pre-line;">${esc(value)}</td></tr>`,
  )
  .join("")}
</table>
<p style="margin:0 0 10px;"><a href="${esc(link)}" style="display:inline-block;background:#14324a;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px;">Buka di panel</a>${wa ? ` <a href="${esc(wa)}" style="display:inline-block;margin-left:6px;background:#25d366;color:#0b2a17;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px;">WhatsApp tamu</a>` : ""}</p>
<p style="margin:16px 0 0;font-size:12px;color:#7a8e9b;">Email otomatis dari website Zanclus Dive Center. Penerimanya diatur di Pembayaran online, Pemberitahuan booking masuk.</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    subject,
    "",
    intro,
    "",
    ...rows.map(([label, value]) => `${label}  ${value}`),
    "",
    `Buka di panel  ${link}`,
    wa ? `WhatsApp tamu  ${wa}` : "",
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");
  return { subject, html, text };
}

// Who gets it: the addresses set in the panel, or the contact email.
export function teamRecipients(content) {
  const notify = content?.payments?.notify ?? {};
  if (notify.enabled === false) return [];
  const list = (notify.emails ?? []).filter(Boolean);
  if (list.length) return list;
  return content?.contact?.email ? [content.contact.email] : [];
}
