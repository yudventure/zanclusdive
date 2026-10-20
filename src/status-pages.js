// Maintenance and error pages in Indonesian and English. statusMarkup gives
// the page body with its own styles, so it looks the same inside the Next
// pages (404, 500, maintenance) and in the standalone HTML pages served for
// the hosting and the service worker (offline, 502, 503, 504).
import { statusArt } from "./status-art.js";

const t = (id, en) => ({ id, en });

export const statusPages = {
  maintenance: {
    art: "maintenance",
    eyebrow: t("Sedang dalam perawatan", "Under maintenance"),
    title: t(
      "Website sedang kami rawat sebentar.",
      "We're giving the website a quick service.",
    ),
    text: t(
      "Seperti alat selam sebelum turun ke laut, website Zanclus sedang dicek dan disetel. Sebentar lagi kami kembali. Untuk booking atau pertanyaan, tim kami tetap siap di WhatsApp.",
      "Like dive gear before a dive, the Zanclus website is being checked and tuned. We'll be back shortly. For bookings or questions, our team is still on WhatsApp.",
    ),
    actions: ["whatsapp", "retry"],
  },
  page: {
    art: "maintenance",
    eyebrow: t("Halaman sedang diperbarui", "Page being updated"),
    title: t("Halaman ini sedang kami perbarui.", "We're updating this page."),
    text: t(
      "Bagian lain website tetap bisa dibuka seperti biasa. Kembali ke beranda, atau tanya tim kami lewat WhatsApp.",
      "The rest of the website is open as usual. Head back home, or ask our team on WhatsApp.",
    ),
    actions: ["home", "whatsapp"],
  },
  404: {
    art: "lost",
    eyebrow: t("Error 404", "Error 404"),
    title: t(
      "Halaman ini hanyut terbawa arus.",
      "This page drifted off with the current.",
    ),
    text: t(
      "Link-nya mungkin salah ketik, atau halamannya sudah dipindahkan. Kembali ke beranda dan mulai menjelajah lagi dari sana.",
      "The link may be mistyped, or the page has moved. Head back home and explore from there.",
    ),
    actions: ["home", "whatsapp"],
  },
  403: {
    art: "closed",
    eyebrow: t("Error 403", "Error 403"),
    title: t(
      "Area ini khusus tim Zanclus.",
      "This area is for the Zanclus team.",
    ),
    text: t(
      "Seperti zona konservasi laut, bagian ini tidak dibuka untuk umum. Kalau kamu bagian dari tim, masuk dulu lewat halaman operator.",
      "Like a marine protected zone, this part isn't open to the public. If you're on the team, sign in through the operator page first.",
    ),
    actions: ["home", "operator"],
  },
  500: {
    art: "broken",
    eyebrow: t("Error 500", "Error 500"),
    title: t(
      "Ada yang tersangkut di sistem kami.",
      "Something got tangled on our side.",
    ),
    text: t(
      "Bukan salahmu. Coba muat ulang halaman sebentar lagi. Kalau masih terjadi, kabari tim kami lewat WhatsApp.",
      "It's not you. Try reloading in a moment. If it keeps happening, let our team know on WhatsApp.",
    ),
    actions: ["retry", "home", "whatsapp"],
  },
  502: {
    art: "snapped",
    eyebrow: t("Error 502", "Error 502"),
    title: t(
      "Sambungan ke server kami terputus.",
      "We lost the line to our server.",
    ),
    text: t(
      "Server sedang tidak menjawab dengan benar. Biasanya pulih dalam beberapa menit, coba lagi sebentar lagi.",
      "The server isn't answering properly right now. It usually recovers within a few minutes, so try again shortly.",
    ),
    actions: ["retry", "whatsapp"],
  },
  503: {
    art: "maintenance",
    eyebrow: t("Error 503", "Error 503"),
    title: t(
      "Server sedang istirahat sejenak.",
      "Our server is taking a short break.",
    ),
    text: t(
      "Website untuk sementara tidak tersedia. Coba lagi beberapa saat lagi; tim kami tetap bisa dihubungi lewat WhatsApp.",
      "The website is unavailable for the moment. Try again shortly; our team is still reachable on WhatsApp.",
    ),
    actions: ["retry", "whatsapp"],
  },
  504: {
    art: "waiting",
    eyebrow: t("Error 504", "Error 504"),
    title: t(
      "Server terlalu lama menjawab.",
      "The server took too long to answer.",
    ),
    text: t(
      "Seperti menunggu kapal di dermaga, permintaanmu belum dijawab tepat waktu. Coba lagi sebentar lagi.",
      "Like waiting for a boat at the jetty, your request wasn't answered in time. Try again in a moment.",
    ),
    actions: ["retry", "whatsapp"],
  },
  offline: {
    art: "offline",
    eyebrow: t("Tanpa koneksi", "No connection"),
    title: t(
      "Sinyal internetmu sedang hilang.",
      "Your internet signal dropped.",
    ),
    text: t(
      "Periksa Wi-Fi atau data selulermu. Halaman ini dimuat ulang otomatis begitu koneksi kembali.",
      "Check your Wi-Fi or mobile data. This page reloads by itself once you're back online.",
    ),
    actions: ["retry"],
  },
};
// Pages that follow an online payment.
Object.assign(statusPages, {
  paid: {
    art: "celebrate",
    eyebrow: t("Pembayaran lunas", "Payment complete"),
    title: t(
      "Terima kasih, tanggalmu sudah tercatat.",
      "Thank you, your date is booked.",
    ),
    text: t(
      "Pembayaran sudah kami terima dan jadwalnya otomatis masuk kalender tim Zanclus. Tim kami akan menghubungimu lewat WhatsApp untuk detail persiapan.",
      "We've received your payment and the date is now in the Zanclus team's calendar. Our team will contact you on WhatsApp about getting ready.",
    ),
    actions: ["whatsapp", "home"],
  },
  paymentPending: {
    art: "waiting",
    eyebrow: t("Menunggu pembayaran", "Waiting for payment"),
    title: t("Tinggal selesaikan pembayaranmu.", "Just finish your payment."),
    text: t(
      "Untuk transfer bank, virtual account, atau QRIS, ikuti instruksi dari Midtrans. Tanggalnya otomatis tercatat begitu pembayaran lunas. Muat ulang halaman ini untuk melihat status terbaru.",
      "For bank transfer, virtual account or QRIS, follow the Midtrans instructions. Your date is booked automatically once the payment is complete. Reload this page to see the latest status.",
    ),
    actions: ["retry", "whatsapp"],
  },
  // A website order paid by bank transfer, waiting for the transfer.
  transferPending: {
    art: "waiting",
    eyebrow: t("Menunggu transfer", "Waiting for your transfer"),
    title: t(
      "Pesananmu tercatat. Tinggal transfer.",
      "Your order is in. Now make the transfer.",
    ),
    text: t(
      "Transfer jumlah di bawah ke salah satu rekening Zanclus sebelum batas waktunya, lalu kirim bukti transfer lewat WhatsApp. Tanggalnya kami konfirmasi begitu transfer diterima.",
      "Transfer the amount below to one of the Zanclus accounts before the deadline, then send the transfer receipt on WhatsApp. We confirm your date as soon as the transfer arrives.",
    ),
    actions: ["whatsapp", "home"],
  },
  paymentFailed: {
    art: "snapped",
    eyebrow: t("Pembayaran belum berhasil", "Payment didn't go through"),
    title: t(
      "Pembayaran dibatalkan atau kedaluwarsa.",
      "The payment was cancelled or expired.",
    ),
    text: t(
      "Tidak ada pembayaran yang tercatat untuk pesanan ini. Kamu bisa mencoba lagi, atau tanya tim kami lewat WhatsApp dulu.",
      "No payment was recorded for this order. You can try again, or ask our team on WhatsApp first.",
    ),
    actions: ["back", "whatsapp"],
  },
});
export const statusNames = Object.keys(statusPages);

const labels = {
  holder: t("a.n.", "Account name"),
  whatsapp: t("Chat WhatsApp", "Chat on WhatsApp"),
  retry: t("Coba lagi", "Try again"),
  home: t("Kembali ke beranda", "Back to home"),
  operator: t("Masuk operator", "Operator sign in"),
  until: t("Perkiraan kembali", "Expected back"),
  note: t("Pesan dari tim", "A note from the team"),
  place: t("Waisai, Raja Ampat", "Waisai, Raja Ampat"),
  switch: t("English", "Bahasa Indonesia"),
  back: t("Coba bayar lagi", "Try paying again"),
  whatsappText: t(
    "Halo Zanclus! Website sedang tidak bisa dibuka, saya ingin bertanya.",
    "Hi Zanclus! The website isn't available right now and I have a question.",
  ),
};

const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

// "Senin, 14 Oktober, 10.00 WIT" from a WIT date and time.
export function untilLabel(until, locale) {
  if (!until) return "";
  const date = new Date(until + ":00+09:00");
  if (Number.isNaN(date.getTime())) return "";
  return (
    date.toLocaleString(locale === "en" ? "en-GB" : "id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jayapura",
    }) + " WIT"
  );
}

const icons = {
  whatsapp:
    '<path d="M20.5 11.6a8.5 8.5 0 0 1-12.7 7.4L3 20.5l1.5-4.7A8.5 8.5 0 1 1 20.5 11.6Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" fill="none"/>',
  retry:
    '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  home: '<path d="M4 11 12 4l8 7M6 10v10h12V10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  operator:
    '<path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" fill="none"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[name]}</svg>`;

export const statusStyles = `
.zs{position:relative;isolation:isolate;min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:48px 24px;overflow:hidden;background:radial-gradient(120% 80% at 75% 0%,#0f5566 0%,#062b3b 48%,#031b29 100%);color:#e8f5f5;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.zs *{box-sizing:border-box}
.zs a{color:inherit;text-decoration:none}
.zs-inner{width:min(1120px,100%);display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:56px;align-items:center}
.zs-top{display:flex;align-items:center;justify-content:space-between;gap:16px}
.zs-logo img{display:block;width:150px;height:auto}
.zs-lang{font-size:12px;color:#9dbdc6;border-bottom:1px solid #ffffff33;padding:4px 0}
.zs-eyebrow{display:inline-flex;align-items:center;gap:10px;margin:44px 0 18px;padding:7px 14px 7px 10px;border:1px solid #bef4a540;border-radius:999px;background:#bef4a512;color:#bef4a5;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase}
.zs-eyebrow::before{content:"";width:8px;height:8px;border-radius:50%;background:#bef4a5;box-shadow:0 0 0 4px #bef4a533;animation:zs-pulse 2.4s ease-in-out infinite}
.zs h1{margin:0;max-width:560px;font-size:clamp(32px,4.2vw,54px);font-weight:600;line-height:1.08;letter-spacing:-1.5px;color:#fff}
.zs-text{margin:20px 0 0;max-width:480px;font-size:16px;line-height:1.75;color:#a9c6cc}
.zs-note{margin:22px 0 0;max-width:480px;padding:14px 18px;border-left:3px solid #bef4a5;border-radius:0 14px 14px 0;background:#ffffff0d}
.zs-note small{display:block;margin-bottom:4px;font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:#85b7bf}
.zs-note p{margin:0;font-size:14px;line-height:1.7;color:#e8f5f5;white-space:pre-line}
.zs-until{display:inline-block;margin:18px 0 0;padding:10px 14px;border-radius:14px;background:#ffffff0f;font-size:13px;line-height:1.6;color:#cfe3e6}
.zs-until strong{color:#fff;font-weight:600}
.zs-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
.zs-accounts{display:grid;gap:10px;margin:24px 0 0;max-width:480px}
.zs-account{display:grid;gap:4px;padding:14px 18px;border:1px solid #bef4a566;border-radius:16px;background:#0a3a4d}
.zs-account small{font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#85b7bf}
.zs-account strong{font-size:24px;letter-spacing:1px;color:#fff;user-select:all}
.zs-account span{font-size:14px;color:#d8eef0}
.zs-details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;margin:24px 0 0;max-width:480px;overflow:hidden;border:1px solid #ffffff1f;border-radius:16px;background:#ffffff1f}
.zs-details div{padding:12px 16px;background:#062b3b}
.zs-details dt{font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:#85b7bf}
.zs-details dd{margin:4px 0 0;font-size:14px;font-weight:600;color:#fff}
.zs-btn{display:inline-flex;align-items:center;gap:10px;padding:15px 22px;border:1px solid #ffffff38;border-radius:999px;font-size:14px;font-weight:600;line-height:1;color:#fff;transition:background .2s,border-color .2s,transform .2s}
.zs-btn svg{width:18px;height:18px}
.zs-btn:hover{border-color:#bef4a5;transform:translateY(-1px)}
.zs-btn.primary{border-color:#bef4a5;background:#bef4a5;color:#062b3b}
.zs-btn.primary:hover{background:#d4fac2}
.zs-foot{margin:40px 0 0;font-size:12px;color:#6f949c;letter-spacing:.3px}
.zs-art{position:relative}
.zs-art::before{content:"";position:absolute;inset:8% 6%;border-radius:50%;background:#1a7a8c;filter:blur(60px);opacity:.35;z-index:-1}
.zs-svg{display:block;width:100%;max-width:520px;height:auto;margin:0 auto;filter:drop-shadow(0 30px 60px #0000004d)}
.zs-bob{animation:zs-bob 5s ease-in-out infinite}
.zs-rise{animation:zs-rise 4s ease-in-out infinite}
.zs-sea span{position:absolute;bottom:-20px;width:10px;height:10px;border:1.5px solid #ffffff2e;border-radius:50%;animation:zs-float 14s linear infinite;z-index:-1}
.zs-sea span:nth-child(1){left:8%;animation-delay:-2s}
.zs-sea span:nth-child(2){left:22%;width:6px;height:6px;animation-duration:11s;animation-delay:-7s}
.zs-sea span:nth-child(3){left:48%;width:14px;height:14px;animation-duration:17s;animation-delay:-4s}
.zs-sea span:nth-child(4){left:71%;width:8px;height:8px;animation-delay:-10s}
.zs-sea span:nth-child(5){left:88%;width:12px;height:12px;animation-duration:19s;animation-delay:-1s}
@keyframes zs-bob{50%{transform:translateY(-8px)}}
@keyframes zs-rise{0%{transform:translateY(8px);opacity:.4}50%{opacity:1}100%{transform:translateY(-10px);opacity:.4}}
@keyframes zs-float{to{transform:translateY(-110vh)}}
@keyframes zs-pulse{50%{box-shadow:0 0 0 8px #bef4a500}}
@media (max-width:860px){.zs{padding:24px 20px 40px;place-items:start center}.zs-inner{grid-template-columns:minmax(0,1fr);gap:0}.zs-copy{display:contents}.zs-top{order:-2}.zs-art{order:-1;max-width:320px;width:100%;margin:18px auto 0}.zs-eyebrow,.zs-until{justify-self:start}.zs-eyebrow{margin-top:18px}.zs-text{font-size:15px}.zs-btn{padding:14px 18px}}
@media (prefers-reduced-motion:reduce){.zs-bob,.zs-rise,.zs-sea span,.zs-eyebrow::before{animation:none}}
`;

// Body of a status page. kind is a key of statusPages. Links are plain
// links so the page also works without JavaScript.
export function statusMarkup({
  kind,
  locale = "en",
  whatsapp = "",
  message = "",
  until = "",
  homeHref = locale === "id" ? "/id" : "/",
  switchHref = "",
  backHref = homeHref,
  details = [],
  whatsappText = "",
  links = [],
  accounts = [],
  styles = true,
}) {
  const page = statusPages[kind] ?? statusPages[500];
  const lang = locale === "id" ? "id" : "en";
  const number = String(whatsapp).replace(/\D/g, "");
  const action = (name, index) => {
    const cls = index === 0 ? "zs-btn primary" : "zs-btn";
    if (name === "whatsapp") {
      if (!number) return "";
      const href = `https://wa.me/${number}?text=${encodeURIComponent(whatsappText || labels.whatsappText[lang])}`;
      return `<a class="${cls}" href="${href}" target="_blank" rel="noopener noreferrer">${icon("whatsapp")}${labels.whatsapp[lang]}</a>`;
    }
    if (name === "retry")
      return `<a class="${cls}" href="" data-retry>${icon("retry")}${labels.retry[lang]}</a>`;
    if (name === "operator")
      return `<a class="${cls}" href="/admin">${icon("operator")}${labels.operator[lang]}</a>`;
    if (name === "back")
      return `<a class="${cls}" href="${escape(backHref)}">${icon("retry")}${labels.back[lang]}</a>`;
    return `<a class="${cls}" href="${escape(homeHref)}">${icon("home")}${labels.home[lang]}</a>`;
  };
  const when = untilLabel(until, lang);
  return `${styles ? `<style>${statusStyles}</style>` : ""}<main class="zs" data-status="${escape(kind)}">
  <div class="zs-sea" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
  <div class="zs-inner">
    <div class="zs-copy">
      <div class="zs-top">
        <a class="zs-logo" href="${escape(homeHref)}"><img src="/assets/logo-header-dark.svg" alt="Zanclus Dive Center" width="150" height="38"></a>
        ${switchHref ? `<a class="zs-lang" href="${escape(switchHref)}" hreflang="${lang === "id" ? "en" : "id"}">${labels.switch[lang]}</a>` : ""}
      </div>
      <p class="zs-eyebrow">${page.eyebrow[lang]}</p>
      <h1>${page.title[lang]}</h1>
      <p class="zs-text">${page.text[lang]}</p>
      ${message ? `<div class="zs-note"><small>${labels.note[lang]}</small><p>${escape(message)}</p></div>` : ""}
      ${when ? `<p class="zs-until">${labels.until[lang]}: <strong>${escape(when)}</strong></p>` : ""}
      ${accounts.length ? `<div class="zs-accounts">${accounts.map((a) => `<div class="zs-account"><small>${escape(a.bank)}</small><strong>${escape(a.number)}</strong><span>${labels.holder[lang]} ${escape(a.holder)}</span></div>`).join("")}</div>` : ""}
      ${details.length ? `<dl class="zs-details">${details.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join("")}</dl>` : ""}
      <div class="zs-actions">${links
        .map(
          ([href, label], index) =>
            `<a class="zs-btn${index === 0 ? " primary" : ""}" href="${escape(href)}">${escape(label)}</a>`,
        )
        .join("")}${page.actions
        .filter((name) => name !== "whatsapp" || number)
        .map((name, index) => action(name, index + links.length))
        .join("")}</div>
      <p class="zs-foot">Zanclus Dive Center · ${labels.place[lang]}</p>
    </div>
    <div class="zs-art">${statusArt[page.art]}</div>
  </div>
</main>`;
}

// A complete HTML page, for the hosting and the service worker. The offline
// page reloads itself when the connection returns.
export function statusDocument(options) {
  const lang = options.locale === "id" ? "id" : "en";
  const page = statusPages[options.kind] ?? statusPages[500];
  const fonts = [400, 500, 600]
    .map(
      (w) =>
        `@font-face{font-family:"Plus Jakarta Sans";src:url("/assets/PlusJakartaSans-${w}.woff2") format("woff2");font-weight:${w};font-display:swap}`,
    )
    .join("");
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#062B3B">
<title>${page.title[lang]} · Zanclus Dive Center</title>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<style>${fonts}html,body{margin:0;background:#031b29}${statusStyles}</style>
</head>
<body>
${statusMarkup({ ...options, styles: false })}
${
  // An admin looking at the website as a visitor, with the way back.
  options.previewExit
    ? `<a href="${escape(options.previewExit)}" style="position:fixed;left:50%;bottom:18px;transform:translateX(-50%);padding:10px 16px;border-radius:999px;background:#bef4a5;color:#062b3b;font:600 13px 'Plus Jakarta Sans',sans-serif;text-decoration:none;box-shadow:0 14px 40px #0000004d">Pratinjau pengunjung. Kembali ke tampilan admin</a>`
    : ""
}
<script>
document.querySelectorAll("[data-retry]").forEach(function (a) {
  a.addEventListener("click", function (e) { e.preventDefault(); location.reload(); });
});
${options.kind === "offline" ? 'addEventListener("online", function () { location.reload(); });' : ""}
</script>
</body>
</html>`;
}
