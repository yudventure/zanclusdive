// Emails to the guest about a booking, in the Zanclus look: the order with
// its payment deadline, the invoice once it is paid, and the notice when
// the deadline passed. Each message has an HTML and a plain-text part and
// is written in the guest's language (Indonesian or English).
import { bookingReference } from "./booking-model.js";
import { localizeContent } from "./content-i18n.js";
import { socialPlatforms } from "./contact-model.js";

export const mailKinds = ["order", "invoice", "expired"];
export const mailKindLabels = {
  order: "Pesanan & batas bayar",
  invoice: "Invoice",
  expired: "Pesanan dibatalkan",
};

const brand = {
  navy: "#062b3b",
  ink: "#0f3346",
  teal: "#20b8b1",
  lime: "#bef4a5",
  muted: "#5f7a8c",
  line: "#e3ebef",
  page: "#eef3f5",
  soft: "#f5f9fa",
};
const font = "'Plus Jakarta Sans', 'Segoe UI', Arial, Helvetica, sans-serif";

const programNames = {
  id: {
    diving: "Diving",
    snorkeling: "Snorkeling",
    trip: "Trip laut",
    course: "Kursus selam",
    shop: "Dive Shop",
    service: "Servis alat selam",
  },
  en: {
    diving: "Diving",
    snorkeling: "Snorkeling",
    trip: "Sea trip",
    course: "Dive course",
    shop: "Dive Shop",
    service: "Dive gear service",
  },
};
export function programName(content, key, lang = "id") {
  const view = lang === "en" ? localizeContent(content, "en") : content;
  return (
    view.experiences?.[key]?.title ??
    programNames[lang === "en" ? "en" : "id"][key] ??
    key
  );
}

// How the guest paid, from Midtrans' payment_type or the admin's choice.
const methods = {
  credit_card: ["Kartu kredit/debit", "Credit/debit card"],
  bank_transfer: [
    "Transfer virtual account",
    "Bank transfer (virtual account)",
  ],
  echannel: ["Mandiri Bill Payment", "Mandiri Bill Payment"],
  permata: ["Permata Virtual Account", "Permata Virtual Account"],
  qris: ["QRIS", "QRIS"],
  gopay: ["GoPay", "GoPay"],
  shopeepay: ["ShopeePay", "ShopeePay"],
  dana: ["DANA", "DANA"],
  cstore: ["Indomaret / Alfamart", "Indomaret / Alfamart"],
  akulaku: ["Akulaku", "Akulaku"],
  kredivo: ["Kredivo", "Kredivo"],
  transfer: ["Transfer bank", "Bank transfer"],
  cash: ["Tunai", "Cash"],
  card: ["Kartu di lokasi (EDC)", "Card at the dive center"],
  other: ["Lainnya", "Other"],
};
export function methodLabel(method, lang = "id") {
  const pair = methods[method];
  if (pair) return pair[lang === "en" ? 1 : 0];
  return method ? String(method).replace(/_/g, " ") : "Midtrans";
}

// INV-20261014-3F9A2C1B: the day it was paid (WIT) and the booking code.
export function invoiceNumber(booking, paidAt) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jayapura",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(paidAt))
    .replace(/-/g, "");
  return `INV-${day}-${bookingReference(booking.id).slice(3, 11)}`;
}

export const dueAt = (from, hours) =>
  new Date(new Date(from).getTime() + hours * 3600000).toISOString();

// Rupiah the Indonesian way in both languages: "Rp 3.400.000".
const money = (n) =>
  "Rp\u00a0" +
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    Number(n) || 0,
  );

// "Kamis, 15 Oktober 2026 · 10.00 WIT"
export function witDateTime(value, lang = "id") {
  const locale = lang === "en" ? "en-GB" : "id-ID";
  const date = new Date(value);
  const day = date.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jayapura",
  });
  const time = date
    .toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Jayapura",
    })
    .replace(":", lang === "en" ? ":" : ".");
  return `${day} · ${time} WIT`;
}
function dayLabel(date, lang, withWeekday = true) {
  return new Date(date + "T12:00:00Z").toLocaleDateString(
    lang === "en" ? "en-GB" : "id-ID",
    {
      ...(withWeekday ? { weekday: "long" } : {}),
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    },
  );
}
export function dateRange(booking, lang = "id") {
  if (booking.endDate && booking.endDate !== booking.startDate)
    return `${dayLabel(booking.startDate, lang, false)} – ${dayLabel(booking.endDate, lang, false)}`;
  return dayLabel(booking.startDate, lang);
}
// "24 jam" / "2 days"
function duration(hours, lang) {
  if (hours > 24 && hours % 24 === 0) {
    const days = hours / 24;
    return lang === "en"
      ? `${days} ${days === 1 ? "day" : "days"}`
      : `${days} hari`;
  }
  return lang === "en"
    ? `${hours} ${hours === 1 ? "hour" : "hours"}`
    : `${hours} jam`;
}

export const phoneText = (digits) => {
  const d = String(digits || "").replace(/\D/g, "");
  if (d.startsWith("62") && d.length >= 10)
    return `+62 ${d.slice(2, 5)}-${d.slice(5, 9)}-${d.slice(9)}`;
  return d ? "+" + d : "";
};

// What the guest pays for, as rows: the lines of a website order, or the
// program and its participants for a booking entered by the team.
export function invoiceLines(booking, content, lang = "id") {
  const payment = booking.payment ?? {};
  if (payment.lines?.length)
    return payment.lines.map((line) => ({
      name: (lang === "en" && line.name?.en) || line.name?.id || "",
      quantity: line.quantity,
      price: line.price,
      total: line.price * line.quantity,
    }));
  const amount = Number(payment.amount ?? booking.amount) || 0;
  const people =
    ["shop", "service"].includes(booking.experience) || !booking.participants
      ? ""
      : lang === "en"
        ? ` · ${booking.participants} ${booking.participants === 1 ? "guest" : "guests"}`
        : ` · ${booking.participants} peserta`;
  return [
    {
      name: programName(content, booking.experience, lang) + people,
      quantity: 1,
      price: amount,
      total: amount,
    },
  ];
}

// Plain-text email lines: the label on one line, the value indented below,
// without a colon (the owner's writing rule).
const pair = (label, value) => `${label}\n  ${value}`;

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const words = {
  id: {
    orderTag: "Menunggu pembayaran",
    paidTag: "Lunas",
    expiredTag: "Dibatalkan",
    hello: (name) => `Halo ${name},`,
    orderTitle: "Pesanan Anda sudah kami terima",
    orderIntro:
      "Terima kasih telah memilih Zanclus Dive Center. Tempat Anda kami tahan sampai batas waktu pembayaran di bawah ini.",
    dueIn: (d) => `Selesaikan pembayaran dalam ${d}`,
    dueBy: "Batas pembayaran",
    dueMidtrans:
      "Lewat dari batas ini, link pembayaran tidak berlaku dan pesanan otomatis dibatalkan.",
    dueTransfer:
      "Lewat dari batas ini, pesanan dapat dibatalkan dan tempatnya kami lepas untuk tamu lain.",
    pay: (amount) => `Bayar sekarang · ${amount}`,
    payHint:
      "Pembayaran aman lewat Midtrans dengan kartu, transfer virtual account, QRIS, atau e-wallet.",
    transferTitle: "Transfer ke rekening berikut",
    bank: "Bank",
    holder: "Atas nama",
    transferNote: (amount, ref) =>
      `Transfer tepat ${amount} dan tulis kode pesanan ${ref} di berita transfer. Setelah itu kirim bukti transfer lewat WhatsApp agar pembayaran segera kami catat.`,
    sendProof: "Kirim bukti transfer",
    proofText: (ref) =>
      `Halo Zanclus, saya kirim bukti transfer untuk pesanan ${ref}.`,
    summary: "Ringkasan pesanan",
    reference: "Kode pesanan",
    program: "Program",
    date: "Tanggal",
    participants: "Peserta",
    item: "Rincian",
    qty: "Jml",
    price: "Harga",
    subtotal: "Subtotal",
    total: "Total",
    totalDue: "Total tagihan",
    paidTitle: "Pembayaran diterima, terima kasih!",
    paidIntro:
      "Pembayaran Anda sudah kami terima dan pesanan Anda terkonfirmasi. Simpan email ini sebagai invoice dan bukti pembayaran resmi.",
    invoice: "Invoice",
    invoiceDate: "Tanggal invoice",
    paidAt: "Dibayar",
    method: "Metode",
    orderId: "No. transaksi",
    billedTo: "Ditagihkan kepada",
    from: "Dari",
    paid: "Dibayar",
    balance: "Sisa tagihan",
    nextTitle: "Langkah berikutnya",
    nextText:
      "Tim kami akan menghubungi Anda lewat WhatsApp untuk detail jadwal dan titik kumpul. Sampai jumpa di Raja Ampat!",
    expiredTitle: "Pesanan dibatalkan",
    expiredIntro: (when) =>
      `Batas waktu pembayaran sudah lewat (${when}), sehingga pesanan ini kami batalkan dan tempatnya kami lepas. Tidak ada biaya yang ditagihkan.`,
    expiredAgain:
      "Masih ingin ikut? Pesan lagi lewat website atau chat tim kami, kami bantu carikan tanggal yang tersedia.",
    bookAgain: "Pesan lagi",
    questions: "Ada pertanyaan?",
    questionsText: "Balas email ini atau chat tim kami lewat WhatsApp.",
    chat: "Chat WhatsApp",
    footer:
      "Email ini dikirim otomatis untuk pesanan Anda di Zanclus Dive Center.",
    guests: (n) => `${n} peserta`,
  },
  en: {
    orderTag: "Awaiting payment",
    paidTag: "Paid",
    expiredTag: "Cancelled",
    hello: (name) => `Hi ${name},`,
    orderTitle: "We've received your booking",
    orderIntro:
      "Thank you for choosing Zanclus Dive Center. We're holding your place until the payment deadline below.",
    dueIn: (d) => `Please complete your payment within ${d}`,
    dueBy: "Payment due",
    dueMidtrans:
      "After this time the payment link expires and the booking is cancelled automatically.",
    dueTransfer:
      "After this time the booking may be cancelled and the place released to other guests.",
    pay: (amount) => `Pay now · ${amount}`,
    payHint:
      "Secure payment with Midtrans by card, virtual account transfer, QRIS or e-wallet.",
    transferTitle: "Transfer to this account",
    bank: "Bank",
    holder: "Account name",
    transferNote: (amount, ref) =>
      `Please transfer exactly ${amount} and add booking code ${ref} to the transfer note. Then send the receipt on WhatsApp so we can record your payment right away.`,
    sendProof: "Send transfer receipt",
    proofText: (ref) =>
      `Hi Zanclus, here is my transfer receipt for booking ${ref}.`,
    summary: "Booking summary",
    reference: "Booking code",
    program: "Program",
    date: "Date",
    participants: "Guests",
    item: "Item",
    qty: "Qty",
    price: "Price",
    subtotal: "Subtotal",
    total: "Total",
    totalDue: "Amount due",
    paidTitle: "Payment received, thank you!",
    paidIntro:
      "We've received your payment and your booking is confirmed. Please keep this email as your invoice and official receipt.",
    invoice: "Invoice",
    invoiceDate: "Invoice date",
    paidAt: "Paid on",
    method: "Method",
    orderId: "Transaction no.",
    billedTo: "Billed to",
    from: "From",
    paid: "Paid",
    balance: "Balance due",
    nextTitle: "What's next",
    nextText:
      "Our team will contact you on WhatsApp with the schedule and meeting point. See you in Raja Ampat!",
    expiredTitle: "Booking cancelled",
    expiredIntro: (when) =>
      `The payment deadline has passed (${when}), so we've cancelled this booking and released the place. You have not been charged.`,
    expiredAgain:
      "Still keen to join? Book again on our website or chat with our team and we'll help you find an available date.",
    bookAgain: "Book again",
    questions: "Questions?",
    questionsText: "Reply to this email or chat with our team on WhatsApp.",
    chat: "Chat on WhatsApp",
    footer:
      "This email was sent automatically about your booking with Zanclus Dive Center.",
    guests: (n) => `${n} ${n === 1 ? "guest" : "guests"}`,
  },
};

const pageFor = (experience) =>
  experience === "shop"
    ? "/dive-shop"
    : experience === "course"
      ? "/course"
      : experience === "service"
        ? "/service"
        : ["diving", "snorkeling", "trip"].includes(experience)
          ? "/" + experience
          : "/";

// Pieces of the HTML layout.
const td = (style, inner, attrs = "") =>
  `<td ${attrs} style="${style}">${inner}</td>`;
const button = (href, label, primary = true) =>
  `<a href="${esc(href)}" target="_blank" style="display:inline-block;padding:14px 26px;border-radius:999px;font-family:${font};font-size:15px;font-weight:700;text-decoration:none;${
    primary
      ? `background:${brand.navy};color:#ffffff;border:2px solid ${brand.navy};`
      : `background:#ffffff;color:${brand.navy};border:2px solid ${brand.line};`
  }">${esc(label)}</a>`;
const rows = (pairs) =>
  pairs
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr>${td(`padding:7px 0;color:${brand.muted};font-size:14px;width:42%;vertical-align:top;`, esc(label))}${td(`padding:7px 0;color:${brand.ink};font-size:14px;font-weight:600;vertical-align:top;`, esc(value))}</tr>`,
    )
    .join("");
const table = (inner, style = "") =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;${style}">${inner}</table>`;
const heading = (text) =>
  `<p style="margin:28px 0 10px;font-family:${font};font-size:12px;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;color:${brand.teal};">${esc(text)}</p>`;
const tag = (text, kind) => {
  const colours = {
    order: ["#fff3dc", "#93570b"],
    invoice: ["#e3f8d8", "#17695f"],
    expired: ["#fde8e5", "#a8352a"],
  }[kind];
  return `<span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${colours[0]};color:${colours[1]};font-family:${font};font-size:12px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;">${esc(text)}</span>`;
};

function itemsTable(lines, t, lang, footer) {
  const head = `<tr>${td(`padding:10px 12px;font-size:12px;color:${brand.muted};text-transform:uppercase;letter-spacing:.6px;font-weight:700;`, esc(t.item))}${td(`padding:10px 12px;font-size:12px;color:${brand.muted};text-transform:uppercase;letter-spacing:.6px;font-weight:700;text-align:center;`, esc(t.qty))}${td(`padding:10px 12px;font-size:12px;color:${brand.muted};text-transform:uppercase;letter-spacing:.6px;font-weight:700;text-align:right;`, esc(t.subtotal))}</tr>`;
  const body = lines
    .map(
      (line) =>
        `<tr>${td(`padding:12px;border-top:1px solid ${brand.line};font-size:14px;color:${brand.ink};`, `${esc(line.name)}${line.quantity > 1 ? `<br><span style="font-size:12px;color:${brand.muted};">${esc(money(line.price, lang))} × ${line.quantity}</span>` : ""}`)}${td(`padding:12px;border-top:1px solid ${brand.line};font-size:14px;color:${brand.ink};text-align:center;`, String(line.quantity))}${td(`padding:12px;border-top:1px solid ${brand.line};font-size:14px;color:${brand.ink};text-align:right;white-space:nowrap;`, esc(money(line.total, lang)))}</tr>`,
    )
    .join("");
  const foot = footer
    .map(
      ([label, value, strong]) =>
        `<tr>${td(`padding:${strong ? "14px" : "8px"} 12px;border-top:1px solid ${brand.line};font-size:${strong ? 16 : 14}px;color:${strong ? brand.navy : brand.muted};font-weight:${strong ? 800 : 600};`, esc(label), 'colspan="2"')}${td(`padding:${strong ? "14px" : "8px"} 12px;border-top:1px solid ${brand.line};font-size:${strong ? 18 : 14}px;color:${brand.navy};font-weight:800;text-align:right;white-space:nowrap;`, esc(value))}</tr>`,
    )
    .join("");
  return table(
    head + body + foot,
    `border:1px solid ${brand.line};border-radius:12px;background:#ffffff;`,
  );
}

function layout({
  lang,
  title,
  preheader,
  badge,
  reference,
  body,
  contact,
  base,
}) {
  const t = words[lang];
  const wa = contact.whatsapp ? `https://wa.me/${contact.whatsapp}` : "";
  const socials = Object.entries(socialPlatforms)
    .filter(([key]) => contact[key])
    .map(
      ([key, platform]) =>
        `<a href="${esc(contact[key])}" target="_blank" style="color:#bfe9e4;text-decoration:none;">${esc(platform.label)}</a>`,
    )
    .join(" &nbsp;·&nbsp; ");
  const host = base.replace(/^https?:\/\//, "");
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${brand.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${brand.page};">${esc(preheader)}</div>
${table(
  `<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(6,43,59,.08);">
<tr><td style="background:${brand.navy};padding:22px 28px;">
${table(
  `<tr><td style="vertical-align:middle;"><a href="${esc(base)}" target="_blank"><img src="${esc(base)}/assets/email/zanclus-logo.png" width="176" height="44" alt="Zanclus Dive Center" style="display:block;border:0;width:176px;height:44px;"></a></td><td align="right" style="vertical-align:middle;font-family:${font};font-size:12px;color:#bfe9e4;letter-spacing:.6px;">${esc(t.reference)}<br><span style="font-size:15px;color:#ffffff;font-weight:700;letter-spacing:.4px;">${esc(reference)}</span></td></tr>`,
)}
</td></tr>
<tr><td style="background:${brand.navy};line-height:0;font-size:0;"><img src="${esc(base)}/assets/email/banner-manta.jpg" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>
<tr><td style="height:5px;line-height:5px;font-size:0;background:${brand.teal};">&nbsp;</td></tr>
<tr><td style="padding:30px 32px 8px;font-family:${font};color:${brand.ink};">
${badge}
${body}
</td></tr>
<tr><td style="padding:8px 32px 32px;font-family:${font};">
${table(
  `<tr><td style="background:${brand.soft};border-radius:14px;padding:18px 20px;">
<p style="margin:0 0 4px;font-size:15px;font-weight:700;color:${brand.navy};">${esc(t.questions)}</p>
<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:${brand.muted};">${esc(t.questionsText)}</p>
${wa ? button(wa, t.chat, false) : ""}
</td></tr>`,
)}
</td></tr>
<tr><td style="background:${brand.navy};padding:24px 32px;font-family:${font};font-size:13px;line-height:1.7;color:#d8eef2;">
<strong style="color:#ffffff;font-size:14px;">Zanclus Dive Center</strong><br>
${esc(contact.location || "Waisai, Raja Ampat, Papua Barat Daya, Indonesia")}<br>
${contact.whatsapp ? `WhatsApp <a href="${esc(wa)}" style="color:#ffffff;text-decoration:none;">${esc(phoneText(contact.whatsapp))}</a><br>` : ""}${contact.email ? `<a href="mailto:${esc(contact.email)}" style="color:#ffffff;text-decoration:none;">${esc(contact.email)}</a> &nbsp;·&nbsp; ` : ""}<a href="${esc(base)}" target="_blank" style="color:#ffffff;text-decoration:none;">${esc(host)}</a>
${socials ? `<br>${socials}` : ""}
<p style="margin:14px 0 0;font-size:12px;color:#8fb3bf;">${esc(t.footer)}</p>
</td></tr>
</table>
</td></tr>`,
  `background:${brand.page};`,
)}
</body>
</html>`;
}

const paragraph = (text, style = "") =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${brand.ink};${style}">${text}</p>`;
const title = (text) =>
  `<h1 style="margin:14px 0 12px;font-family:${font};font-size:26px;line-height:1.25;color:${brand.navy};font-weight:800;">${esc(text)}</h1>`;

function contactOf(content) {
  return { ...content.contact };
}

// { subject, html, text } for one email about a booking.
export function bookingMail(
  kind,
  { booking, content, base, now = new Date() },
) {
  const lang = booking.lang === "en" ? "en" : "id";
  const t = words[lang];
  const contact = contactOf(content);
  const payment = booking.payment ?? {};
  const reference = bookingReference(booking.id);
  const name = booking.guestName || (lang === "en" ? "there" : "Tamu");
  const program = programName(content, booking.experience, lang);
  const dates = dateRange(booking, lang);
  const people = ["shop", "service"].includes(booking.experience)
    ? ""
    : t.guests(booking.participants);
  const lines = invoiceLines(booking, content, lang);
  const amount = Number(payment.amount ?? booking.amount) || 0;
  const total = money(amount, lang);
  const settings = content.payments ?? {};
  const wa = contact.whatsapp ? `https://wa.me/${contact.whatsapp}` : "";
  const details = [
    [t.reference, reference],
    [t.program, program],
    [t.date, dates],
    [t.participants, people],
  ];

  if (kind === "order") {
    const due = payment.dueAt;
    const hours = payment.dueHours;
    const transfer = payment.provider === "manual";
    const accounts = settings.accounts ?? [];
    const dueText = due ? witDateTime(due, lang) : "";
    const subject =
      lang === "en"
        ? `Awaiting payment · Booking ${reference} · Zanclus Dive Center`
        : `Menunggu pembayaran · Pesanan ${reference} · Zanclus Dive Center`;
    const proof = wa
      ? `${wa}?text=${encodeURIComponent(t.proofText(reference))}`
      : "";
    const payBlock = transfer
      ? `${heading(t.transferTitle)}${accounts
          .map((a) =>
            table(
              `<tr><td style="padding:14px 18px;font-family:${font};"><p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${brand.muted};font-weight:700;">${esc(t.bank)} ${esc(a.bank)}</p><p style="margin:0 0 4px;font-size:21px;letter-spacing:1px;font-weight:800;color:${brand.navy};">${esc(a.number)}</p><p style="margin:0;font-size:14px;color:${brand.ink};">${esc(t.holder)} <strong>${esc(a.holder)}</strong></p></td></tr>`,
              `border:1px solid ${brand.line};border-radius:12px;margin:0 0 10px;background:#ffffff;border-collapse:separate;`,
            ),
          )
          .join(
            "",
          )}${paragraph(esc(t.transferNote(total, reference)), `font-size:14px;color:${brand.muted};`)}${proof ? `<p style="margin:0 0 6px;">${button(proof, t.sendProof)}</p>` : ""}`
      : payment.redirectUrl
        ? `<p style="margin:22px 0 8px;">${button(payment.redirectUrl, t.pay(total))}</p><p style="margin:0 0 6px;font-size:13px;color:${brand.muted};line-height:1.6;">${esc(t.payHint)}</p>`
        : "";
    const body = `${title(t.orderTitle)}
${paragraph(esc(t.hello(name)))}
${paragraph(esc(t.orderIntro))}
${
  due
    ? table(
        `<tr><td style="background:#fff7e8;border:1px solid #f6dfb3;border-radius:14px;padding:18px 20px;font-family:${font};">
<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#93570b;text-transform:uppercase;letter-spacing:.8px;">${esc(hours ? t.dueIn(duration(hours, lang)) : t.dueBy)}</p>
<p style="margin:0 0 6px;font-size:19px;font-weight:800;color:${brand.navy};">${esc(dueText)}</p>
<p style="margin:0;font-size:13px;line-height:1.6;color:#7a5a2a;">${esc(transfer ? t.dueTransfer : t.dueMidtrans)}</p>
</td></tr>`,
        "margin:6px 0 4px;",
      )
    : ""
}
${payBlock}
${heading(t.summary)}
${table(rows(details), "margin:0 0 14px;")}
${itemsTable(lines, t, lang, [[t.totalDue, total, true]])}`;
    const text = [
      t.hello(name),
      "",
      t.orderTitle + ".",
      t.orderIntro,
      "",
      due ? pair(t.dueBy, dueText) : "",
      due ? (transfer ? t.dueTransfer : t.dueMidtrans) : "",
      "",
      transfer
        ? [
            t.transferTitle,
            ...accounts.map((a) => `- ${a.bank} ${a.number} a.n. ${a.holder}`),
            t.transferNote(total, reference),
            proof ? pair(t.sendProof, proof) : "",
          ].join("\n")
        : payment.redirectUrl
          ? pair(t.pay(total), payment.redirectUrl)
          : "",
      "",
      t.summary.toUpperCase(),
      ...details.filter(([, v]) => v).map(([l, v]) => pair(l, v)),
      ...lines.map((l) =>
        pair(`${l.name} × ${l.quantity}`, money(l.total, lang)),
      ),
      pair(t.totalDue, total),
      "",
      `${t.questions} ${t.questionsText}`,
      wa,
      "",
      "Zanclus Dive Center · " + base.replace(/^https?:\/\//, ""),
    ]
      .filter((line, i, all) => line !== "" || all[i - 1] !== "")
      .join("\n");
    return {
      subject,
      html: layout({
        lang,
        title: subject,
        preheader: due ? `${t.dueBy} ${dueText}` : t.orderTitle,
        badge: tag(t.orderTag, "order"),
        reference,
        body,
        contact,
        base,
      }),
      text,
    };
  }

  if (kind === "invoice") {
    const paidAt = payment.paidAt ?? payment.updatedAt ?? now.toISOString();
    const number = payment.invoiceNumber ?? invoiceNumber(booking, paidAt);
    const subject =
      lang === "en"
        ? `Invoice ${number} · Payment received · Zanclus Dive Center`
        : `Invoice ${number} · Pembayaran diterima · Zanclus Dive Center`;
    const note =
      (lang === "en" ? settings.invoiceNote?.en : settings.invoiceNote?.id) ||
      settings.invoiceNote?.id ||
      "";
    const meta = [
      [
        t.invoiceDate,
        dayLabel(
          new Date(paidAt).toLocaleDateString("en-CA", {
            timeZone: "Asia/Jayapura",
          }),
          lang,
          false,
        ),
      ],
      [t.paidAt, witDateTime(paidAt, lang)],
      [t.method, methodLabel(payment.method, lang)],
      [t.orderId, payment.provider === "manual" ? "" : payment.orderId],
    ];
    const billed = [booking.guestName, booking.phone, booking.email]
      .filter(Boolean)
      .map((v) => `<span style="white-space:nowrap;">${esc(v)}</span>`)
      .join("<br>");
    const from = [
      "Zanclus Dive Center",
      contact.location || "Waisai, Raja Ampat, Papua Barat Daya",
      contact.whatsapp ? "WA " + phoneText(contact.whatsapp) : "",
      contact.email,
    ]
      .filter(Boolean)
      .map(esc)
      .join("<br>");
    const body = `${title(t.paidTitle)}
${paragraph(esc(t.hello(name)))}
${paragraph(esc(t.paidIntro))}
${table(
  `<tr><td style="padding:22px 22px 6px;">
${table(
  `<tr><td style="font-family:${font};vertical-align:top;"><p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${brand.teal};font-weight:800;">${esc(t.invoice)}</p><p style="margin:4px 0 0;font-size:20px;font-weight:800;color:${brand.navy};">${esc(number)}</p></td><td align="right" style="vertical-align:top;"><span style="display:inline-block;padding:7px 14px;border:2px solid #17695f;border-radius:8px;color:#17695f;font-family:${font};font-size:14px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">${esc(t.paidTag)}</span></td></tr>`,
)}
</td></tr>
<tr><td style="padding:6px 22px 4px;">${table(rows(meta))}</td></tr>
<tr><td style="padding:10px 22px 18px;">
${table(
  `<tr><td width="50%" style="vertical-align:top;padding-right:10px;font-family:${font};"><p style="margin:0 0 6px;font-size:12px;letter-spacing:.8px;text-transform:uppercase;color:${brand.muted};font-weight:700;">${esc(t.billedTo)}</p><p style="margin:0;font-size:14px;line-height:1.6;color:${brand.ink};font-weight:600;">${billed}</p></td><td width="50%" style="vertical-align:top;padding-left:10px;font-family:${font};"><p style="margin:0 0 6px;font-size:12px;letter-spacing:.8px;text-transform:uppercase;color:${brand.muted};font-weight:700;">${esc(t.from)}</p><p style="margin:0;font-size:14px;line-height:1.6;color:${brand.ink};">${from}</p></td></tr>`,
)}
</td></tr>`,
  `border:1px solid ${brand.line};border-radius:14px;background:${brand.soft};margin:6px 0 18px;`,
)}
${heading(t.summary)}
${table(rows(details), "margin:0 0 14px;")}
${itemsTable(lines, t, lang, [
  [t.total, total, true],
  [t.paid, money(amount, lang)],
  [t.balance, money(0, lang)],
])}
${heading(t.nextTitle)}
${paragraph(esc(t.nextText))}
${note ? paragraph(esc(note).replace(/\n/g, "<br>"), `font-size:13px;color:${brand.muted};background:${brand.soft};border-radius:12px;padding:14px 16px;`) : ""}`;
    const text = [
      t.hello(name),
      "",
      t.paidTitle,
      t.paidIntro,
      "",
      `${t.invoice.toUpperCase()} ${number} · ${t.paidTag.toUpperCase()}`,
      ...meta.filter(([, v]) => v).map(([l, v]) => pair(l, v)),
      pair(
        t.billedTo,
        [booking.guestName, booking.phone, booking.email]
          .filter(Boolean)
          .join(", "),
      ),
      "",
      t.summary.toUpperCase(),
      ...details.filter(([, v]) => v).map(([l, v]) => pair(l, v)),
      ...lines.map((l) =>
        pair(`${l.name} × ${l.quantity}`, money(l.total, lang)),
      ),
      pair(t.total, total),
      pair(t.paid, money(amount, lang)),
      pair(t.balance, money(0, lang)),
      "",
      t.nextText,
      note,
      "",
      `${t.questions} ${t.questionsText}`,
      wa,
      "",
      "Zanclus Dive Center · " + base.replace(/^https?:\/\//, ""),
    ]
      .filter((line, i, all) => line !== "" || all[i - 1] !== "")
      .join("\n");
    return {
      subject,
      html: layout({
        lang,
        title: subject,
        preheader: `${t.invoice} ${number} · ${total} · ${t.paidTag}`,
        badge: tag(t.paidTag, "invoice"),
        reference,
        body,
        contact,
        base,
      }),
      text,
    };
  }

  if (kind === "expired") {
    const when = payment.dueAt ? witDateTime(payment.dueAt, lang) : "";
    const subject =
      lang === "en"
        ? `Booking ${reference} cancelled · payment deadline passed`
        : `Pesanan ${reference} dibatalkan · batas pembayaran lewat`;
    const again =
      base + (lang === "en" ? "" : "/id") + pageFor(booking.experience);
    const body = `${title(t.expiredTitle)}
${paragraph(esc(t.hello(name)))}
${paragraph(esc(t.expiredIntro(when || "-")))}
${paragraph(esc(t.expiredAgain))}
<p style="margin:6px 0 4px;">${button(again, t.bookAgain)}</p>
${heading(t.summary)}
${table(rows(details), "margin:0 0 14px;")}`;
    const text = [
      t.hello(name),
      "",
      t.expiredTitle,
      t.expiredIntro(when || "-"),
      t.expiredAgain,
      pair(t.bookAgain, again),
      "",
      ...details.filter(([, v]) => v).map(([l, v]) => pair(l, v)),
      "",
      wa,
    ].join("\n");
    return {
      subject,
      html: layout({
        lang,
        title: subject,
        preheader: t.expiredTitle,
        badge: tag(t.expiredTag, "expired"),
        reference,
        body,
        contact,
        base,
      }),
      text,
    };
  }
  throw new Error("Jenis email tidak dikenal.");
}

// A made-up booking to preview the emails in the admin.
export function sampleBooking(
  kind,
  { method = "midtrans", lang = "id", now = new Date() } = {},
) {
  const created = new Date(now.getTime() - 3600000).toISOString();
  const start = new Date(now.getTime() + 9 * 86400000)
    .toISOString()
    .slice(0, 10);
  const manual = method === "transfer";
  return {
    id: "3f9a2c1b-7e40-4d2a-9b1c-5a6e7f8d9c0b",
    experience: "diving",
    status:
      kind === "invoice"
        ? "confirmed"
        : kind === "expired"
          ? "cancelled"
          : "pending",
    source: manual ? "whatsapp" : "website",
    startDate: start,
    endDate: start,
    guestName: "Rina Pratama",
    phone: "+62 812-3456-7890",
    email: "rina@example.com",
    participants: 2,
    amount: 3400000,
    lang,
    payment: {
      provider: manual ? "manual" : "midtrans",
      orderId: manual ? undefined : "ZC-SAMPLE-3F9A2C1B",
      status:
        kind === "invoice"
          ? "paid"
          : kind === "expired"
            ? "expired"
            : manual
              ? "unpaid"
              : "pending",
      amount: 3400000,
      method: kind === "invoice" ? (manual ? "transfer" : "qris") : undefined,
      lines: [
        {
          name: { id: "Fun Dive 2x", en: "Fun Dive 2x" },
          price: 1500000,
          quantity: 2,
        },
        {
          name: { id: "Sewa alat lengkap", en: "Full gear rental" },
          price: 200000,
          quantity: 2,
        },
      ],
      createdAt: created,
      dueHours: 24,
      dueAt: dueAt(created, 24),
      redirectUrl: manual
        ? undefined
        : "https://app.midtrans.com/snap/v4/redirection/sample",
      paidAt: kind === "invoice" ? now.toISOString() : undefined,
    },
  };
}
