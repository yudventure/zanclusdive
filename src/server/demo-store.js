import "server-only";
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  unlink,
  copyFile,
} from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { constants } from "node:fs";
import { randomUUID } from "node:crypto";
import { demoSeed, withDemoEnglish, withoutSamples } from "../demo-data.js";
import { demoShop, withShop, withSplitProducts } from "../shop-model.js";
import { demoSocials, withContactFields } from "../contact-model.js";
import { withActivities, activityKeys } from "../activity-model.js";
import { withPhotography, photographyVersion } from "../photography.js";
import {
  withTranslations,
  withRajaAmpatTitle,
  withActivityRefresh,
} from "../content-i18n.js";
import { withPriceList } from "../price-list.js";
import { withCalendar } from "../calendar-model.js";
import {
  assertBookable,
  bookingReceipt,
  BookingError,
} from "../booking-model.js";
import { agentHolds } from "../agent-calendar.js";

async function writeState(directory, state) {
  const temporary = join(directory, randomUUID() + ".tmp");
  try {
    await writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
    await rename(temporary, join(directory, "state.json"));
  } finally {
    await unlink(temporary).catch(() => {});
  }
}

// Older versions kept everything in /tmp, which a redeploy can wipe. Data now
// lives in the hosting account's home folder; the old /tmp copy is moved over
// once on first start.
const legacyDirectory = "/tmp/zanclus-demo-cms-v1";
async function dataDirectory() {
  if (process.env.CMS_DEMO_DATA_DIR) return process.env.CMS_DEMO_DATA_DIR;
  const directory = join(homedir(), "zanclus-cms-data");
  try {
    await mkdir(join(directory, "media"), { recursive: true, mode: 0o700 });
  } catch {
    return legacyDirectory;
  }
  try {
    await copyFile(
      join(legacyDirectory, "state.json"),
      join(directory, "state.json"),
      constants.COPYFILE_EXCL,
    );
  } catch {}
  return directory;
}

// The folder the store writes to, once it has been opened.
export const demoStorageDirectory = () =>
  globalThis.__zanclusDemoStores?.get(
    process.env.CMS_DEMO_DATA_DIR || "default",
  )?.directory ?? null;

// Local test servers (CMS_DEMO_LOGIN=true) keep the sample bookings.
const sampleMode = () => process.env.CMS_DEMO_LOGIN === "true";

function store() {
  const key = process.env.CMS_DEMO_DATA_DIR || "default";
  globalThis.__zanclusDemoStores ||= new Map();
  let current = globalThis.__zanclusDemoStores.get(key);
  if (!current) {
    current = { tail: Promise.resolve() };
    current.ready = (async () => {
      const directory = await dataDirectory();
      current.directory = directory;
      await mkdir(join(directory, "media"), { recursive: true, mode: 0o700 });
      let state;
      try {
        state = JSON.parse(
          await readFile(join(directory, "state.json"), "utf8"),
        );
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        state = demoSeed(new Date(), { sampleBookings: sampleMode() });
        await writeState(directory, state);
      }
      if (
        !state.content ||
        !Array.isArray(state.bookings) ||
        !Array.isArray(state.media)
      )
        throw new Error("DEMO_DATA_INVALID");
      if (!state.content.shop) {
        state.content = withShop(state.content, demoShop());
        state.version++;
        await writeState(directory, state);
      }
      if (!state.contactDefaultsVersion) {
        state.content = withContactFields(state.content);
        for (const [key, value] of Object.entries(demoSocials)) {
          if (!state.content.contact[key]) state.content.contact[key] = value;
        }
        state.contactDefaultsVersion = 1;
        state.version++;
        await writeState(directory, state);
      }
      if (activityKeys.some((key) => !state.content.activities?.[key])) {
        state.content = withActivities(withPhotography(state.content));
        state.version++;
        await writeState(directory, state);
      }
      if (state.content.photographyVersion !== photographyVersion) {
        state.content = withActivities(withPhotography(state.content));
        state.version++;
        await writeState(directory, state);
      }
      if (!state.content.en) {
        state.content = withDemoEnglish(withTranslations(state.content));
        state.version++;
        await writeState(directory, state);
      }
      if (!sampleMode() && !state.samplesRemoved) {
        state = { ...withoutSamples(state), samplesRemoved: true };
        state.version++;
        await writeState(directory, state);
      }
      const titled = withSplitProducts(
        withCalendar(
          withPriceList(withActivityRefresh(withRajaAmpatTitle(state.content))),
        ),
      );
      if (JSON.stringify(titled) !== JSON.stringify(state.content)) {
        state.content = titled;
        state.version++;
        await writeState(directory, state);
      }
      return state;
    })();
    globalThis.__zanclusDemoStores.set(key, current);
    current.ready.catch(() => globalThis.__zanclusDemoStores.delete(key));
  }
  return current;
}

async function read() {
  return structuredClone(await store().ready);
}
async function mutate(callback) {
  const current = store();
  const task = current.tail.then(async () => {
    const state = structuredClone(await current.ready);
    const result = await callback(state);
    await writeState(current.directory, state);
    current.ready = Promise.resolve(state);
    return result;
  });
  current.tail = task.catch(() => {});
  return task;
}

export async function getContent() {
  const { content, version } = await read();
  return { content, version };
}
export async function saveContent(content, version) {
  return mutate((state) => {
    if (state.version !== version) return false;
    state.content = content;
    state.version++;
    return { content, version: state.version };
  });
}
export async function listBookings() {
  return (await read()).bookings.sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}
export async function saveBooking(payload, id) {
  return mutate((state) => {
    const index = id
      ? state.bookings.findIndex((booking) => booking.id === id)
      : -1;
    if (id && index < 0) return null;
    const booking = {
      ...payload,
      id: id || randomUUID(),
      updatedAt: new Date().toISOString(),
    };
    if (id) state.bookings[index] = booking;
    else state.bookings.push(booking);
    return booking;
  });
}
export async function createBookingRequest(payload, requestId, fingerprint) {
  return mutate((state) => {
    state.bookingRequests ||= {};
    const previous = state.bookingRequests[requestId];
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new BookingError(
          "Permintaan ini sudah dikirim. Buat booking baru untuk data berbeda.",
          409,
        );
      return { receipt: previous.receipt, created: false };
    }
    // Places used by linked agent and OTA calendars count too.
    assertBookable(
      state.content,
      [...state.bookings, ...agentHolds(state.content, state.agents)],
      payload,
    );
    const booking = {
      ...payload,
      id: randomUUID(),
      updatedAt: new Date().toISOString(),
    };
    const receipt = bookingReceipt(booking, false);
    state.bookings.push(booking);
    state.bookingRequests[requestId] = { fingerprint, receipt };
    return { receipt, created: true };
  });
}
// A booking paid online: checked like a website request, saved at once.
export async function createPaymentBooking(payload) {
  return mutate((state) => {
    // Places used by linked agent and OTA calendars count too.
    assertBookable(
      state.content,
      [...state.bookings, ...agentHolds(state.content, state.agents)],
      payload,
    );
    const booking = {
      ...payload,
      id: randomUUID(),
      updatedAt: new Date().toISOString(),
    };
    state.bookings.push(booking);
    return booking;
  });
}
// Changes one booking in place; change returns the new booking, or null to
// leave it as it is.
export async function updateBooking(id, change) {
  return mutate((state) => {
    const index = state.bookings.findIndex((booking) => booking.id === id);
    if (index < 0) return null;
    const next = change(structuredClone(state.bookings[index]));
    if (!next) return state.bookings[index];
    state.bookings[index] = {
      ...next,
      id,
      updatedAt: new Date().toISOString(),
    };
    return state.bookings[index];
  });
}
// A guest changing their own paid booking (a new date, or a cancellation):
// a new date is checked against the daily places without the booking
// itself, inside the same lock as new bookings. change returns the new
// booking or null, and may throw to refuse.
export async function changeOwnBooking(id, change) {
  return mutate((state) => {
    const index = state.bookings.findIndex((booking) => booking.id === id);
    if (index < 0) return null;
    const current = state.bookings[index];
    const next = change(structuredClone(current));
    if (!next) return current;
    if (
      next.status !== "cancelled" &&
      (next.startDate !== current.startDate || next.endDate !== current.endDate)
    )
      assertBookable(
        state.content,
        [
          ...state.bookings.filter((booking) => booking.id !== id),
          ...agentHolds(state.content, state.agents),
        ],
        next,
      );
    state.bookings[index] = {
      ...next,
      id,
      updatedAt: new Date().toISOString(),
    };
    return state.bookings[index];
  });
}
export async function listAgents() {
  return (await read()).agents ?? [];
}
export async function saveAgent(agent) {
  return mutate((state) => {
    state.agents ||= [];
    const index = state.agents.findIndex((a) => a.id === agent.id);
    if (index < 0) state.agents.push(agent);
    else state.agents[index] = agent;
    return agent;
  });
}
// Changes an agent only if it still exists; change returns the new agent
// or null to keep it as is.
export async function updateAgent(id, change) {
  return mutate((state) => {
    const index = (state.agents ||= []).findIndex((a) => a.id === id);
    if (index < 0) return null;
    const next = change(structuredClone(state.agents[index]));
    if (!next) return state.agents[index];
    state.agents[index] = { ...next, id };
    return state.agents[index];
  });
}
export async function deleteAgent(id) {
  return mutate((state) => {
    const before = (state.agents ||= []).length;
    state.agents = state.agents.filter((a) => a.id !== id);
    return state.agents.length < before;
  });
}
// Generic records by kind, as the MySQL store keeps them. A "where" of
// "AND id LIKE ?" with one pattern is honoured; anything else is ignored.
export async function listRecords(kind, where = "", params = []) {
  const all = Object.values((await read()).records?.[kind] ?? {});
  if (where.includes("LIKE") && typeof params[0] === "string") {
    const pattern = new RegExp(
      "^" +
        params[0]
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          .replace(/%/g, ".*")
          .replace(/_/g, ".") +
        "$",
    );
    return all.filter((record) => pattern.test(record.id));
  }
  return all.sort((a, b) => a.id.localeCompare(b.id));
}
export async function saveRecord(kind, record) {
  return mutate((state) => {
    ((state.records ||= {})[kind] ||= {})[record.id] = record;
    return record;
  });
}
export async function deleteRecord(kind, id) {
  return mutate((state) => {
    const bucket = (state.records ||= {})[kind] ?? {};
    const existed = Boolean(bucket[id]);
    if (existed) delete bucket[id];
    return existed;
  });
}
// HRD: employees, attendance by day and locked payslips.
export async function listEmployees() {
  return (await read()).employees ?? [];
}
export async function saveEmployee(employee) {
  return mutate((state) => {
    state.employees ||= [];
    const index = state.employees.findIndex((e) => e.id === employee.id);
    if (index < 0) state.employees.push(employee);
    else state.employees[index] = employee;
    return employee;
  });
}
export async function deleteEmployee(id) {
  return mutate((state) => {
    const before = (state.employees ||= []).length;
    state.employees = state.employees.filter((e) => e.id !== id);
    return state.employees.length < before;
  });
}
export async function listAttendance(month) {
  return Object.values((await read()).attendance ?? {}).filter((record) =>
    record.date.startsWith(month + "-"),
  );
}
export async function saveAttendance(records) {
  return mutate((state) => {
    state.attendance ||= {};
    for (const record of records) state.attendance[record.id] = record;
    return records;
  });
}
export async function listPayslips(month) {
  return Object.values((await read()).payslips ?? {}).filter(
    (slip) => slip.month === month,
  );
}
export async function savePayslip(slip) {
  return mutate((state) => {
    (state.payslips ||= {})[slip.id] = slip;
    return slip;
  });
}
export async function deletePayslip(id) {
  return mutate((state) => {
    const existed = Boolean(state.payslips?.[id]);
    if (existed) delete state.payslips[id];
    return existed;
  });
}
// Staff accounts made in the admin.
export async function listUsers() {
  return (await read()).users ?? [];
}
export async function saveUser(user) {
  return mutate((state) => {
    state.users ||= [];
    const index = state.users.findIndex((u) => u.id === user.id);
    if (index < 0) state.users.push(user);
    else state.users[index] = user;
    return user;
  });
}
export async function deleteUser(id) {
  return mutate((state) => {
    const before = (state.users ||= []).length;
    state.users = state.users.filter((u) => u.id !== id);
    return state.users.length < before;
  });
}
export async function deleteBooking(id) {
  return mutate((state) => {
    const index = state.bookings.findIndex((booking) => booking.id === id);
    if (index < 0) return false;
    state.bookings.splice(index, 1);
    return true;
  });
}
export async function listMedia() {
  return (await read()).media.map(({ data, ...item }) => item);
}
// Photos are stored as files next to state.json; older uploads may still be
// base64 inside the state.
export const mediaLimit = 400 * 1024 * 1024;
export async function addMedia(name, mime, data) {
  const current = store();
  await current.ready;
  const id = randomUUID();
  const file = join(current.directory, "media", id);
  const item = await mutate(async (state) => {
    if (
      state.media.reduce((total, item) => total + item.bytes, 0) + data.length >
      mediaLimit
    )
      throw new Error("DEMO_MEDIA_LIMIT");
    await writeFile(file, data, { mode: 0o600 });
    const item = {
      id,
      name,
      mime,
      bytes: data.length,
      url: "/api/media/" + id,
      created_at: new Date().toISOString(),
    };
    state.media.unshift(item);
    return item;
  });
  return item;
}
export async function getMedia(id) {
  const current = store();
  const item = (await read()).media.find((media) => media.id === id);
  if (!item) return null;
  if (item.data)
    return { mime: item.mime, data: Buffer.from(item.data, "base64") };
  try {
    return {
      mime: item.mime,
      data: await readFile(join(current.directory, "media", id)),
    };
  } catch {
    return null;
  }
}
// Passwords changed in the admin, by lower-case email: { salt, hash,
// changedAt }. Never part of the content or the admin state.
export async function listPasswords() {
  return (await read()).passwords ?? {};
}
export async function savePassword(email, record) {
  return mutate((state) => {
    state.passwords ||= {};
    state.passwords[email.trim().toLowerCase()] = record;
  });
}
export async function deletePassword(email) {
  return mutate((state) => {
    delete (state.passwords ||= {})[email.trim().toLowerCase()];
  });
}
export async function loginBlocked() {
  const { failures } = await read();
  return Date.now() - failures.windowStart < 900000 && failures.attempts >= 8;
}
export async function failLogin() {
  return mutate((state) => {
    const now = Date.now();
    if (now - state.failures.windowStart >= 900000)
      state.failures = { attempts: 1, windowStart: now };
    else state.failures.attempts++;
  });
}
export async function clearLoginFailures() {
  return mutate((state) => {
    state.failures = { attempts: 0, windowStart: 0 };
  });
}
