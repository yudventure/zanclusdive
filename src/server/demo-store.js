import "server-only";
import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { demoSeed } from "../demo-data.js";
import { demoShop, withShop } from "../shop-model.js";

async function writeState(directory, state) {
  const temporary = join(directory, randomUUID() + ".tmp");
  try {
    await writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
    await rename(temporary, join(directory, "state.json"));
  } finally {
    await unlink(temporary).catch(() => {});
  }
}

function store() {
  const directory = process.env.CMS_DEMO_DATA_DIR || "/tmp/zanclus-demo-cms-v1";
  globalThis.__zanclusDemoStores ||= new Map();
  let current = globalThis.__zanclusDemoStores.get(directory);
  if (!current) {
    current = { directory, tail: Promise.resolve() };
    current.ready = (async () => {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      let state;
      try {
        state = JSON.parse(
          await readFile(join(directory, "state.json"), "utf8"),
        );
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        state = demoSeed();
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
      return state;
    })();
    globalThis.__zanclusDemoStores.set(directory, current);
    current.ready.catch(() => globalThis.__zanclusDemoStores.delete(directory));
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
    const result = callback(state);
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
export async function addMedia(name, mime, data) {
  return mutate((state) => {
    if (
      state.media.reduce((total, item) => total + item.bytes, 0) + data.length >
      24 * 1024 * 1024
    )
      throw new Error("DEMO_MEDIA_LIMIT");
    const id = randomUUID();
    const item = {
      id,
      name,
      mime,
      bytes: data.length,
      url: "/api/media/" + id,
      created_at: new Date().toISOString(),
    };
    state.media.unshift({ ...item, data: data.toString("base64") });
    return item;
  });
}
export async function getMedia(id) {
  const item = (await read()).media.find((media) => media.id === id);
  return item
    ? { mime: item.mime, data: Buffer.from(item.data, "base64") }
    : null;
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
