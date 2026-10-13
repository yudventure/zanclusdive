// Calendars shared with travel agents, in the iCalendar (.ics) format that
// Google Calendar, Apple Calendar and Outlook subscribe to. Each agent gets
// a private feed of the Zanclus schedule; an agent can also link their own
// calendar, which shows in the admin and, when they share it, in the other
// agents' feeds as busy days. Guest names and phone numbers are never in a
// feed.
import { programTitle } from "./cms-model.js";
import { calendarText } from "./calendar-model.js";

const day = 86400000;
const compact = (date) => date.replaceAll("-", "");
const nextDay = (date) =>
  new Date(Date.parse(date + "T00:00:00Z") + day).toISOString().slice(0, 10);

function escapeText(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}
// Lines longer than 75 bytes continue on the next line after a space.
function fold(line) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts = [];
  let current = "";
  for (const char of line) {
    if (Buffer.byteLength(current + char, "utf8") > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
    }
    current += char;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const allDay = (uid, start, end, summary, extra = []) => [
  "BEGIN:VEVENT",
  `UID:${uid}`,
  `DTSTART;VALUE=DATE:${compact(start)}`,
  `DTEND;VALUE=DATE:${compact(nextDay(end))}`,
  `SUMMARY:${escapeText(summary)}`,
  ...extra,
  "END:VEVENT",
];

// The feed one agent subscribes to: Zanclus bookings (as numbers of
// guests), closed dates, scheduled activities, and the busy days of agents
// who share their calendar.
export function agentFeed({
  content,
  bookings,
  agents,
  agent,
  now = new Date(),
}) {
  const stamp = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const from = new Date(now.getTime() - 30 * day).toISOString().slice(0, 10);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zanclus Dive Center//Kalender Agen//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText("Zanclus Dive Center · " + agent.name)}`,
    "X-WR-TIMEZONE:Asia/Jayapura",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  const stamped = [`DTSTAMP:${stamp}`];
  for (const b of bookings) {
    if (b.endDate < from || b.status === "cancelled") continue;
    // Online payments count once they are paid.
    if (b.payment && b.payment.status !== "paid") continue;
    const title = programTitle(content, b.experience);
    if (b.status === "closed") {
      lines.push(
        ...allDay(
          `closed-${b.id}@zanclus`,
          b.startDate,
          b.endDate,
          `Zanclus tutup · ${title}`,
          [...stamped, "TRANSP:OPAQUE"],
        ),
      );
      continue;
    }
    lines.push(
      ...allDay(
        `booking-${b.id}@zanclus`,
        b.startDate,
        b.endDate,
        `Zanclus · ${title} · ${b.participants} tamu${b.payment?.status === "paid" ? " · lunas" : ""}`,
        [
          ...stamped,
          `STATUS:${b.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
        ],
      ),
    );
  }
  for (const [index, event] of (content.calendar?.events ?? []).entries()) {
    if (event.date < from) continue;
    lines.push(
      ...allDay(
        `event-${event.date}-${index}@zanclus`,
        event.date,
        event.date,
        `Zanclus · ${calendarText(event.title, "id")}`,
        [
          ...stamped,
          ...(event.place ? [`LOCATION:${escapeText(event.place)}`] : []),
          `DESCRIPTION:${escapeText(calendarText(event.description, "id"))}`,
          "TRANSP:TRANSPARENT",
        ],
      ),
    );
  }
  for (const other of agents) {
    if (other.id === agent.id || !other.enabled || !other.share) continue;
    for (const event of other.events ?? []) {
      if (event.end < from) continue;
      lines.push(
        ...allDay(
          `agent-${other.id}-${event.uid}@zanclus`,
          event.start,
          event.end,
          `${other.name} · terisi`,
          stamped,
        ),
      );
    }
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

// Day of a DTSTART/DTEND value, in WIT for times given in UTC.
function dateOf(value) {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(
    value.trim(),
  );
  if (!match) return null;
  const [, y, m, d, hh, mm, ss, utc] = match;
  if (utc)
    return new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss) + 9 * 3600000)
      .toISOString()
      .slice(0, 10);
  return `${y}-${m}-${d}`;
}
const unescapeText = (value) =>
  value
    .replace(/\\n/gi, " ")
    .replace(/\\([,;\\])/g, "$1")
    .trim();

// Events of an agent's calendar between from and to (YYYY-MM-DD), as
// { uid, summary, start, end } with inclusive dates. Repeating events
// count once.
export function parseCalendar(text, { from, to, limit = 500 } = {}) {
  const lines = String(text)
    .replace(/\r?\n[ \t]/g, "")
    .split(/\r?\n/);
  const events = [];
  let current = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") current = {};
    else if (line === "END:VEVENT") {
      if (current?.start && current.status !== "CANCELLED") {
        let end = current.end ?? current.start;
        // An all-day DTEND is the day after the last day.
        if (current.endIsDate && end > current.start)
          end = new Date(Date.parse(end + "T00:00:00Z") - day)
            .toISOString()
            .slice(0, 10);
        if (end < current.start) end = current.start;
        if ((!from || end >= from) && (!to || current.start <= to))
          events.push({
            uid: (current.uid || `${current.start}-${events.length}`).slice(
              0,
              120,
            ),
            summary: (current.summary || "Acara").slice(0, 120),
            start: current.start,
            end,
          });
      }
      current = null;
      if (events.length >= limit) break;
    } else if (current) {
      const colon = line.indexOf(":");
      if (colon < 0) continue;
      const [name, ...params] = line.slice(0, colon).toUpperCase().split(";");
      const value = line.slice(colon + 1);
      if (name === "DTSTART") current.start = dateOf(value);
      else if (name === "DTEND") {
        current.end = dateOf(value);
        current.endIsDate =
          params.includes("VALUE=DATE") || /^\d{8}$/.test(value.trim());
      } else if (name === "SUMMARY") current.summary = unescapeText(value);
      else if (name === "UID") current.uid = value.trim();
      else if (name === "STATUS") current.status = value.trim().toUpperCase();
    }
  }
  return events.sort((a, b) => a.start.localeCompare(b.start));
}
