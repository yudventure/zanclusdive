import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Smaller copies of uploaded photos and of video covers, made once with
// sharp (it comes with Next.js) and kept on disk, so a phone downloads a
// photo the size of its screen instead of the 2400 px upload. Without
// sharp, or when a copy fails, the original is served as before.
let loading = null;
function sharpLibrary() {
  loading ??= import("sharp")
    .then(({ default: sharp }) => {
      // Shared hosting allows few threads per account (the build once
      // stopped for that), so libvips works on one at a time.
      sharp.concurrency(1);
      sharp.cache(false);
      return sharp;
    })
    .catch(() => null);
  return loading;
}

// One copy at a time, so a page full of new photos does not load the CPU.
let queue = Promise.resolve();
const oneAtATime = (task) => {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
};

const folder = () =>
  process.env.MEDIA_CACHE_DIR || join(tmpdir(), "zanclus-image-cache");
// Recently made copies stay in memory too, up to about 40 MB.
const memory = new Map();
let memoryBytes = 0;
function remember(key, data) {
  memory.delete(key);
  memory.set(key, data);
  memoryBytes += data.length;
  for (const [old, value] of memory) {
    if (memoryBytes <= 40 * 1024 * 1024) break;
    memory.delete(old);
    memoryBytes -= value.length;
  }
}
async function cached(key) {
  if (memory.has(key)) return memory.get(key);
  try {
    const data = await readFile(join(folder(), key));
    remember(key, data);
    return data;
  } catch {
    return null;
  }
}
async function keep(key, data) {
  remember(key, data);
  try {
    await mkdir(folder(), { recursive: true });
    await writeFile(join(folder(), key), data);
  } catch {}
}

// Any other kept image (a video cover), by its file name.
export const keptImage = (name) =>
  /^[\w.-]{1,140}$/.test(name) ? cached(name) : Promise.resolve(null);
export const keepImage = (name, data) =>
  /^[\w.-]{1,140}$/.test(name) ? keep(name, data) : Promise.resolve();

// A copy made before, without the original: the photo route answers from
// it before reading the upload from the database. Null when there is none
// yet, or when the original is served instead.
export async function keptCopy(key, width) {
  if (!/^[\w-]{1,120}$/.test(key)) return null;
  const kept = await cached(`${key}-w${width}.webp`);
  return kept?.length ? kept : null;
}

// A WebP copy at most `width` pixels wide, or null to serve the original.
// `key` names the copy in the cache (letters, digits and dashes).
export async function resizedImage(key, original, width, quality = 74) {
  if (!/^[\w-]{1,120}$/.test(key)) return null;
  const name = `${key}-w${width}.webp`;
  const kept = await cached(name);
  if (kept) return kept.length ? kept : null;
  const sharp = await sharpLibrary();
  if (!sharp) return null;
  try {
    const data = await oneAtATime(() =>
      sharp(original, { failOn: "none", limitInputPixels: 60_000_000 })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality, effort: 3 })
        .toBuffer(),
    );
    // A copy no smaller than the upload is not worth sending; an empty
    // file remembers that.
    const useful = data.length < original.length ? data : Buffer.alloc(0);
    await keep(name, useful);
    return useful.length ? useful : null;
  } catch {
    return null;
  }
}
