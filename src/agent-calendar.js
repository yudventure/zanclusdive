// Calendars shared with travel agents and OTAs, in the iCalendar (.ics)
// format that Google Calendar, Apple Calendar, Outlook and OTA extranets
// read. Each agent gets a private feed of the Zanclus schedule; an agent can
// also link their own calendar, which shows in the admin, can use Zanclus'
// daily places and, when they share it, shows in the other agents' feeds as
// busy days. Guest names and phone numbers are never in a feed.
import { programTitle } from "./cms-model.js";
import { calendarText } from "./calendar-model.js";
import {
  bookingDates,
  capacityOf,
  capacityPools,
  placesUsed,
} from "./booking-model.js";

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

// How a linked calendar's events count against Zanclus' daily places, as
// bookings: "info" only shows them in the admin, "places" makes each event
// hold the people written in it (or perEvent), "block" fills or closes the
// day. Free (transparent) events never count. except leaves one calendar
// out, for that calendar's own feed.
export const agentKinds = ["agent", "ota"];
export const agentImpacts = ["info", "places", "block"];
export const feedModes = ["detail", "blocks"];
export function agentHolds(content, agents, { except } = {}) {
  const holds = [];
  for (const agent of agents ?? []) {
    if (!agent?.enabled || agent.id === except) continue;
    const impact = agent.impact ?? "info";
    if (!["places", "block"].includes(impact)) continue;
    const pool = capacityPools[agent.pool] ? agent.pool : "diving";
    const capacity = capacityOf(content, pool);
    for (const event of agent.events ?? []) {
      if (event.free) continue;
      const base = {
        id: `agent-${agent.id}-${event.uid}`,
        source: "agent",
        agentId: agent.id,
        experience: pool,
        startDate: event.start,
        endDate: event.end,
      };
      if (impact === "block")
        holds.push(
          capacity
            ? { ...base, status: "confirmed", participants: capacity }
            : { ...base, status: "closed", participants: 1 },
        );
      else
        holds.push({
          ...base,
          status: "confirmed",
          participants: event.people ?? agent.perEvent ?? 2,
        });
    }
  }
  return holds;
}

// Days to show as unavailable on an OTA: closed for the activity, or with
// fewer places left than the OTA's smallest booking (minPlaces). Other
// linked calendars count; the OTA's own does not, so its bookings do not
// come back to it.
export function unavailableDays({
  content,
  bookings,
  agents,
  agent,
  today,
  last,
}) {
  const pool = capacityPools[agent.pool] ? agent.pool : "diving";
  const capacity = capacityOf(content, pool);
  const all = [
    ...bookings,
    ...agentHolds(content, agents, { except: agent.id }),
  ];
  const used = placesUsed(all, pool, today, last);
  const closed = all.filter(
    (b) => b.status === "closed" && b.experience === pool && b.endDate >= today,
  );
  const minPlaces = agent.feedMinPlaces ?? 4;
  const ranges = [];
  for (let date = today; date <= last; date = nextDay(date)) {
    const shut = closed.some((b) => date >= b.startDate && date <= b.endDate);
    const left = capacity ? capacity - (used[date] ?? 0) : Infinity;
    const reason = shut ? "closed" : left < minPlaces ? "full" : null;
    const previous = ranges.at(-1);
    if (!reason) continue;
    if (
      previous &&
      previous.reason === reason &&
      nextDay(previous.end) === date
    )
      previous.end = date;
    else ranges.push({ start: date, end: date, reason });
  }
  return ranges;
}

// The feed for an OTA: only the days it should stop selling, as all-day
// "not available" events. No bookings, names or activities.
function otaFeed({ content, bookings, agents, agent, now }) {
  const stamp = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const { today, last } = bookingDates(now);
  const pool = capacityPools[agent.pool] ? agent.pool : "diving";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zanclus Dive Center//Ketersediaan OTA//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText("Zanclus Dive Center · " + agent.name)}`,
    "X-WR-TIMEZONE:Asia/Jayapura",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const range of unavailableDays({
    content,
    bookings,
    agents,
    agent,
    today,
    last,
  }))
    lines.push(
      ...allDay(
        `zanclus-${pool}-${range.start}-${range.end}@zanclus`,
        range.start,
        range.end,
        range.reason === "closed"
          ? "Not available · Zanclus tutup"
          : "Not available · Zanclus penuh",
        [`DTSTAMP:${stamp}`, "STATUS:CONFIRMED", "TRANSP:OPAQUE"],
      ),
    );
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

// The feed one agent subscribes to: Zanclus bookings (as numbers of
// guests), closed dates, scheduled activities, and the busy days of agents
// who share their calendar. An OTA gets only the days it cannot sell.
export function agentFeed({
  content,
  bookings,
  agents,
  agent,
  now = new Date(),
}) {
  if (agent.feedMode === "blocks")
    return otaFeed({ content, bookings, agents, agent, now });
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
    // Gear sales, rentals and servicing are not dive days.
    if (["shop", "service"].includes(b.experience)) continue;
    // Online payments count once they are paid; a bill the team tracks
    // by hand does not change what partners see.
    if (
      b.payment &&
      b.payment.provider !== "manual" &&
      b.payment.status !== "paid"
    )
      continue;
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

// A DTSTART/DTEND value as { date, time }, in WIT for times given in UTC.
// time is "HHMMSS", or null for a whole day.
function moment(value) {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(
    value.trim(),
  );
  if (!match) return null;
  const [, y, m, d, hh, mm, ss, utc] = match;
  if (!hh) return { date: `${y}-${m}-${d}`, time: null };
  if (!utc) return { date: `${y}-${m}-${d}`, time: hh + mm + ss };
  const wit = new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss) + 9 * 3600000)
    .toISOString()
    .replace(/[-:]/g, "");
  return {
    date: `${wit.slice(0, 4)}-${wit.slice(4, 6)}-${wit.slice(6, 8)}`,
    time: wit.slice(9, 15),
  };
}
// The moment a DURATION (P1D, P2W, PT3H30M…) after a start.
function addDuration(start, value) {
  const match =
    /^\+?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
      value.trim().toUpperCase(),
    );
  if (!match) return null;
  const [, w = 0, d = 0, h = 0, m = 0, sec = 0] = match.map((x) => x ?? 0);
  const time = start.time ?? "000000";
  const base = Date.parse(
    `${start.date}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}Z`,
  );
  const end = new Date(
    base + ((+w * 7 + +d) * 86400 + +h * 3600 + +m * 60 + +sec) * 1000,
  )
    .toISOString()
    .replace(/[-:]/g, "");
  return {
    date: `${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}`,
    time: start.time ? end.slice(9, 15) : null,
  };
}
const unescapeText = (value) =>
  value
    .replace(/\\n/gi, " ")
    .replace(/\\([,;\\])/g, "$1")
    .trim();
// "4 pax", "2 orang", "3 guests", "Adults: 2" → the number of people.
export function peopleIn(text) {
  const match =
    /(\d{1,3})\s*(?:x\s*)?(?:pax|orang|org|tamu|peserta|guests?|people|persons?|participants?|adults?|divers?|travell?ers?)\b/i.exec(
      text ?? "",
    ) ||
    /\b(?:pax|guests?|participants?|adults?|peserta|tamu|orang)\s*[:=]\s*(\d{1,3})\b/i.exec(
      text ?? "",
    );
  const n = match ? Number(match[1]) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 200 ? n : null;
}

// Events of an agent's or OTA's calendar between from and to (YYYY-MM-DD),
// as { uid, summary, start, end, people, free } with inclusive dates.
// people is read from the title or description; free events (marked
// transparent) are shown but hold no places. Repeating events count once.
export function parseCalendar(text, { from, to, limit = 500 } = {}) {
  const lines = String(text)
    .replace(/^\uFEFF/, "")
    .replace(/\r?\n[ \t]/g, "")
    .split(/\r?\n/);
  const events = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const upper = line.toUpperCase();
    if (upper === "BEGIN:VEVENT") current = {};
    else if (upper === "END:VEVENT") {
      if (current?.start && current.status !== "CANCELLED") {
        const start = current.start.date;
        let end =
          current.end ??
          (current.duration
            ? addDuration(current.start, current.duration)
            : null);
        let last = end?.date ?? start;
        // A whole-day end, or one at midnight, is the day after the last.
        if (end && last > start && (!end.time || end.time === "000000"))
          last = new Date(Date.parse(last + "T00:00:00Z") - day)
            .toISOString()
            .slice(0, 10);
        if (last < start) last = start;
        if ((!from || last >= from) && (!to || start <= to))
          events.push({
            uid: (current.uid || `${start}-${events.length}`).slice(0, 120),
            summary: (current.summary || "Acara").slice(0, 120),
            start,
            end: last,
            people: peopleIn(
              `${current.summary ?? ""} ${current.description ?? ""}`,
            ),
            free: current.transparent === true,
          });
      }
      current = null;
      if (events.length >= limit) break;
    } else if (current) {
      const colon = line.indexOf(":");
      if (colon < 0) continue;
      const [name] = line.slice(0, colon).toUpperCase().split(";");
      const value = line.slice(colon + 1);
      if (name === "DTSTART") current.start = moment(value);
      else if (name === "DTEND") current.end = moment(value);
      else if (name === "DURATION") current.duration = value;
      else if (name === "SUMMARY") current.summary = unescapeText(value);
      else if (name === "DESCRIPTION")
        current.description = unescapeText(value).slice(0, 400);
      else if (name === "UID") current.uid = value.trim();
      else if (name === "STATUS") current.status = value.trim().toUpperCase();
      else if (name === "TRANSP")
        current.transparent = value.trim().toUpperCase() === "TRANSPARENT";
    }
  }
  return events.sort((a, b) => a.start.localeCompare(b.start));
}
