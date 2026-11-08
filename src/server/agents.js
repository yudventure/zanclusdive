import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { privateAddress } from "./net-guard.js";
import { listAgents, updateAgent } from "./store.js";
import {
  parseCalendar,
  agentKinds,
  agentImpacts,
  feedModes,
} from "../agent-calendar.js";
import { bookingDates, capacityPools } from "../booking-model.js";

// Travel agents and OTAs linked by calendar. Each has a private feed token
// and may give the address of their own calendar (Google "secret address in
// iCal format", Outlook or Apple .ics link, an OTA's iCal export), which is
// read every 30 minutes.
const stale = 30 * 60000;
export const newToken = () => randomBytes(24).toString("base64url");

function text(value, label, max, required = false) {
  const out = typeof value === "string" ? value.trim() : "";
  if ((required && !out) || out.length > max)
    throw new Error(`${label} tidak valid (maksimal ${max} karakter).`);
  return out;
}
// webcal:// links are https; anything but http(s) is refused.
export function calendarAddress(value) {
  const raw = text(value, "Link kalender agen", 600).replace(
    /^webcals?:\/\//i,
    "https://",
  );
  if (!raw) return "";
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Link kalender agen harus berupa alamat https://.");
  }
  if (!protocols().includes(url.protocol))
    throw new Error("Link kalender agen harus berupa alamat https://.");
  if (url.username || url.password)
    throw new Error("Link kalender agen tidak boleh berisi password.");
  return url.href;
}
const oneOf = (value, options, fallback) =>
  options.includes(value) ? value : fallback;
function whole(value, fallback, label) {
  const n = Number(value ?? fallback);
  if (!Number.isInteger(n) || n < 1 || n > 30)
    throw new Error(`${label} harus 1–30 orang.`);
  return n;
}
export function validateAgent(input, current = {}) {
  if (!input || typeof input !== "object")
    throw new Error("Data agen tidak valid.");
  const importUrl = calendarAddress(input.importUrl ?? current.importUrl ?? "");
  const kind = oneOf(input.kind ?? current.kind, agentKinds, "agent");
  return {
    ...current,
    name: text(input.name ?? current.name, "Nama agen", 80, true),
    contact: text(input.contact ?? current.contact ?? "", "Kontak agen", 120),
    importUrl,
    enabled: (input.enabled ?? current.enabled ?? true) === true,
    share: (input.share ?? current.share ?? true) === true,
    // An OTA gets only the days it cannot sell, and its bookings use
    // Zanclus' daily places; a travel agent sees the schedule.
    kind,
    feedMode: oneOf(
      input.feedMode ?? current.feedMode,
      feedModes,
      kind === "ota" ? "blocks" : "detail",
    ),
    impact: oneOf(
      input.impact ?? current.impact,
      agentImpacts,
      kind === "ota" ? "places" : "info",
    ),
    pool: oneOf(
      input.pool ?? current.pool,
      Object.keys(capacityPools),
      "diving",
    ),
    perEvent: whole(input.perEvent ?? current.perEvent, 2, "Slot per acara"),
    feedMinPlaces: whole(
      input.feedMinPlaces ?? current.feedMinPlaces,
      4,
      "Batas sisa slot",
    ),
    // A new calendar address is read again.
    ...(importUrl !== current.importUrl
      ? { events: [], syncedAt: null, syncError: "" }
      : {}),
  };
}
export function newAgent(input) {
  return {
    id: randomUUID(),
    token: newToken(),
    createdAt: new Date().toISOString(),
    events: [],
    syncedAt: null,
    syncError: "",
    ...validateAgent(input),
  };
}

// Local test servers may read calendars from 127.0.0.1 over http.
const allowLocal = () => process.env.AGENT_CALENDAR_ALLOW_LOCAL === "true";
const protocols = () => (allowLocal() ? ["https:", "http:"] : ["https:"]);
// Fetches a calendar from the internet only: no private network addresses,
// at most three redirects, 10 seconds and 2 MB.
async function fetchCalendar(address) {
  let url = new URL(address);
  for (let hop = 0; hop < 4; hop++) {
    if (!protocols().includes(url.protocol))
      throw new Error("Link kalender harus https://.");
    if (!allowLocal()) {
      const host = url.hostname.replace(/^\[|\]$/g, "");
      const addresses = isIP(host)
        ? [{ address: host }]
        : await lookup(host, { all: true });
      if (!addresses.length || addresses.some((a) => privateAddress(a.address)))
        throw new Error("Alamat kalender tidak bisa dibuka dari server.");
    }
    const response = await fetch(url, {
      redirect: "manual",
      headers: { Accept: "text/calendar, text/plain;q=0.8" },
      signal: AbortSignal.timeout(10000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      url = new URL(response.headers.get("location"), url);
      continue;
    }
    if (!response.ok)
      throw new Error(`Kalender agen menjawab ${response.status}.`);
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2 * 1024 * 1024) {
        reader.cancel().catch(() => {});
        throw new Error("Kalender agen terlalu besar (maksimal 2 MB).");
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks).toString("utf8");
    if (!body.includes("BEGIN:VCALENDAR"))
      throw new Error("Link ini bukan kalender .ics.");
    return body;
  }
  throw new Error("Terlalu banyak pengalihan dari link kalender.");
}

// Reads an agent's calendar when it is older than 30 minutes (or always
// with force) and saves the events or the error. A read already running for
// the agent is shared.
export async function syncAgent(agent, { force = false } = {}) {
  if (!agent.importUrl || !agent.enabled) return agent;
  if (
    !force &&
    agent.syncedAt &&
    Date.now() - Date.parse(agent.syncedAt) < stale
  )
    return agent;
  const running = (globalThis.__zanclusAgentSyncs ||= new Map());
  if (!running.has(agent.id))
    running.set(
      agent.id,
      readAgent(agent).finally(() => running.delete(agent.id)),
    );
  return running.get(agent.id);
}
async function readAgent(agent) {
  const { today, last } = bookingDates();
  const from = new Date(Date.parse(today) - 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  let result;
  try {
    const events = parseCalendar(await fetchCalendar(agent.importUrl), {
      from,
      to: last,
    });
    result = { events, syncError: "" };
  } catch (error) {
    result = {
      syncError: error.message?.slice(0, 200) || "Kalender belum bisa dibaca.",
    };
  }
  // Saved only if the agent is still there with the same calendar address.
  const saved = await updateAgent(agent.id, (current) =>
    current.importUrl === agent.importUrl
      ? { ...current, ...result, syncedAt: new Date().toISOString() }
      : null,
  );
  return saved ?? agent;
}
export async function syncAgents({ force = false } = {}) {
  const agents = await listAgents();
  return Promise.all(agents.map((agent) => syncAgent(agent, { force })));
}
export async function agentByToken(token) {
  if (typeof token !== "string" || token.length < 20) return null;
  return (
    (await listAgents()).find((a) => a.enabled && a.token === token) ?? null
  );
}
