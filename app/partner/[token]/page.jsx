import { notFound } from "next/navigation";
import { headers } from "next/headers";
import "../../partner.css";
import {
  getContent,
  listBookings,
  listAgents,
} from "../../../src/server/store.js";
import { agentByToken } from "../../../src/server/agents.js";
import { agentFeed, parseCalendar } from "../../../src/agent-calendar.js";
import { bookingDates } from "../../../src/booking-model.js";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Kalender partner · Zanclus Dive Center",
  robots: { index: false, follow: false },
};

const text = {
  id: {
    eyebrow: "KALENDER PARTNER",
    title: (name) => `Halo ${name}, kalender kita tersambung.`,
    intro:
      "Tambahkan kalender Zanclus ke aplikasi kalender Anda. Jadwal tamu, tanggal tutup, dan kegiatan kami muncul otomatis dan diperbarui setiap jam. Nama dan nomor tamu tidak pernah ditampilkan.",
    google: "Tambahkan ke Google Calendar",
    apple: "Apple Calendar / Outlook",
    copy: "Link kalender (.ics)",
    yours: "Kalender Anda di Zanclus",
    linked: (when, count) =>
      `Tersambung. Terakhir dibaca ${when}, ${count} acara mendatang.`,
    notLinked:
      "Belum tersambung. Kirim alamat kalender Anda (di Google Calendar: Setelan kalender → Alamat rahasia dalam format iCal) ke tim Zanclus supaya jadwal Anda tampil di kalender kami.",
    send: "Kirim lewat WhatsApp ↗",
    upcoming: "60 hari ke depan",
    empty: "Belum ada jadwal dalam 60 hari ke depan.",
    switchLang: "English",
    keep: "Simpan halaman ini; link-nya pribadi untuk agen Anda.",
    whatsapp: (name) =>
      `Halo Zanclus! Ini link kalender ${name} untuk disambungkan: `,
  },
  en: {
    eyebrow: "PARTNER CALENDAR",
    title: (name) => `Hi ${name}, our calendars are linked.`,
    intro:
      "Add the Zanclus calendar to your calendar app. Our guest bookings, closed dates and activities appear automatically and refresh every hour. Guest names and numbers are never shown.",
    google: "Add to Google Calendar",
    apple: "Apple Calendar / Outlook",
    copy: "Calendar link (.ics)",
    yours: "Your calendar at Zanclus",
    linked: (when, count) =>
      `Linked. Last read ${when}, ${count} upcoming events.`,
    notLinked:
      "Not linked yet. Send your calendar address (in Google Calendar: Settings → Secret address in iCal format) to the Zanclus team so your schedule shows in our calendar.",
    send: "Send on WhatsApp ↗",
    upcoming: "Next 60 days",
    empty: "Nothing scheduled in the next 60 days.",
    switchLang: "Bahasa Indonesia",
    keep: "Keep this page; its link is private to your agency.",
    whatsapp: (name) => `Hi Zanclus! Here is ${name}'s calendar link: `,
  },
};

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL)
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host")?.split(",")[0].trim() || h.get("host");
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() || "https";
  return `${proto}://${host}`;
}

// The page a travel agent opens from their private link.
export default async function PartnerPage({ params, searchParams }) {
  const { token } = await params;
  const lang = (await searchParams).lang === "en" ? "en" : "id";
  const t = text[lang];
  const agent = await agentByToken(token);
  if (!agent) notFound();
  const [{ content }, bookings, agents, origin] = await Promise.all([
    getContent(),
    listBookings(),
    listAgents(),
    siteOrigin(),
  ]);
  const feedUrl = `${origin}/api/calendar/${agent.token}.ics`;
  const webcal = feedUrl.replace(/^https?:\/\//, "webcal://");
  const { today } = bookingDates();
  const until = new Date(Date.parse(today) + 60 * 86400000)
    .toISOString()
    .slice(0, 10);
  const upcoming = parseCalendar(
    agentFeed({ content, bookings, agents, agent }),
    { from: today, to: until },
  );
  const upcomingOwn = (agent.events ?? []).filter((e) => e.end >= today);
  const date = (value) =>
    new Date(value + "T12:00:00").toLocaleDateString(
      lang === "id" ? "id-ID" : "en-GB",
      { weekday: "short", day: "numeric", month: "short" },
    );
  const whatsapp = content.contact?.whatsapp;
  return (
    <main className="partner">
      <header className="partner-top">
        <img
          src="/assets/logo-header-light.svg"
          alt="Zanclus Dive Center"
          width="150"
          height="38"
        />
        <a href={`?lang=${lang === "id" ? "en" : "id"}`}>{t.switchLang}</a>
      </header>
      <section className="partner-hero">
        <p className="partner-eyebrow">{t.eyebrow}</p>
        <h1>{t.title(agent.name)}</h1>
        <p>{t.intro}</p>
        <div className="partner-actions">
          <a
            className="partner-button primary"
            href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.google} ↗
          </a>
          <a className="partner-button" href={webcal}>
            {t.apple}
          </a>
        </div>
        <label className="partner-link">
          <small>{t.copy}</small>
          <input readOnly value={feedUrl} />
        </label>
        <p className="partner-keep">{t.keep}</p>
      </section>
      <section className="partner-grid">
        <div className="partner-card">
          <h2>{t.upcoming}</h2>
          {upcoming.length ? (
            <ul className="partner-events">
              {upcoming.map((event) => (
                <li key={event.uid}>
                  <time>
                    {date(event.start)}
                    {event.end !== event.start && ` – ${date(event.end)}`}
                  </time>
                  <span>{event.summary}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="partner-muted">{t.empty}</p>
          )}
        </div>
        <div className="partner-card">
          <h2>{t.yours}</h2>
          {agent.importUrl && agent.syncedAt && !agent.syncError ? (
            <p className="partner-ok">
              {t.linked(
                new Date(agent.syncedAt).toLocaleString(
                  lang === "id" ? "id-ID" : "en-GB",
                  {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Jayapura",
                  },
                ) + " WIT",
                upcomingOwn.length,
              )}
            </p>
          ) : (
            <>
              <p className="partner-muted">{t.notLinked}</p>
              {whatsapp && (
                <a
                  className="partner-button"
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(t.whatsapp(agent.name))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.send}
                </a>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
