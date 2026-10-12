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
import { demoShop, withShop } from "../shop-model.js";
import { demoSocials, withContactFields } from "../contact-model.js";
import { withActivities, activityKeys } from "../activity-model.js";
import { withPhotography, photographyVersion } from "../photography.js";
import {
  withTranslations,
  withRajaAmpatTitle,
  withActivityRefresh,
} from "../content-i18n.js";
import { withPriceList } from "../price-list.js";
import {
  assertBookable,
  bookingReceipt,
  BookingError,
} from "../booking-model.js";

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
      const titled = withPriceList(
        withActivityRefresh(withRajaAmpatTitle(state.content)),
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
    assertBookable(state.content, state.bookings, payload);
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
