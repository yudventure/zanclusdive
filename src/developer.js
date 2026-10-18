// Developer mode. While it is on, the owner can lock the whole website, a
// page, a homepage section, or a single Dive Shop product or gear service.
// Visitors then see the maintenance page or an "being updated" card in that
// place; a signed-in admin keeps seeing everything, with a bar on top.
// Turning developer mode off lifts every lock at once and keeps the choices
// for next time.

// The admin session cookie (set in src/server/auth.js). proxy.js lets a
// request carrying it through; the page then checks the session itself.
export const adminCookie = "zanclus_admin_session";
// A signed-in admin can look at the website as a visitor does, locks and
// all: /?pratinjau=pengunjung sets this cookie for half an hour, and
// ?pratinjau=admin ends it. proxy.js passes it on in the visitor header.
export const previewCookie = "zanclus_pratinjau";
export const visitorHeader = "x-zanclus-visitor";
export const previewMinutes = 30;

export const lockablePages = [
  ["home", "Beranda", "/"],
  ["diving", "Diving", "/diving"],
  ["snorkeling", "Snorkeling", "/snorkeling"],
  ["trip", "Trip laut", "/trip"],
  ["course", "Kursus selam", "/course"],
  ["about", "Tentang kami", "/about"],
  ["service", "Servis alat selam", "/service"],
  ["dive-shop", "Dive Shop", "/dive-shop"],
];
export const lockableSections = [
  ["experiences", "Pengalaman & daftar harga"],
  ["course", "Panel kursus selam"],
  ["dive-sites", "Peta titik selam"],
  ["ocean", "Jelajahi laut & galeri foto"],
  ["videos", "Video YouTube"],
  ["shop", "Dive Shop di beranda"],
  ["travel", "Cara menuju ke sini"],
  ["contact", "Toko & kontak"],
];
const pageKeys = lockablePages.map(([key]) => key);
const sectionKeys = lockableSections.map(([key]) => key);
const itemPattern = /^(product|service):[a-z0-9-]{1,50}$/;
const untilPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export const defaultDeveloper = {
  enabled: false,
  site: false,
  pages: [],
  sections: [],
  items: [],
  message: { id: "", en: "" },
  until: "",
};

export function withDeveloper(content) {
  return content.developer
    ? content
    : { ...content, developer: structuredClone(defaultDeveloper) };
}

function keys(value, allowed, label) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 200)
    throw new Error(`Pilihan ${label} di mode developer tidak valid.`);
  const out = [];
  for (const key of value) {
    if (typeof key !== "string" || !allowed(key))
      throw new Error(`Pilihan ${label} di mode developer tidak dikenal.`);
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

export function validateDeveloper(input) {
  if (input === undefined || input === null)
    return structuredClone(defaultDeveloper);
  if (typeof input !== "object")
    throw new Error("Pengaturan mode developer tidak valid.");
  const message = {};
  for (const lang of ["id", "en"]) {
    const text = input.message?.[lang] ?? "";
    if (typeof text !== "string" || text.length > 400)
      throw new Error("Pesan perawatan maksimal 400 karakter.");
    message[lang] = text.trim();
  }
  const until = input.until ?? "";
  if (until !== "" && (typeof until !== "string" || !untilPattern.test(until)))
    throw new Error("Perkiraan selesai harus berupa tanggal dan jam.");
  return {
    enabled: input.enabled === true,
    site: input.site === true,
    pages: keys(input.pages, (k) => pageKeys.includes(k), "halaman"),
    sections: keys(input.sections, (k) => sectionKeys.includes(k), "bagian"),
    items: keys(input.items, (k) => itemPattern.test(k), "item"),
    message,
    until,
  };
}

// The locks a visitor meets, as plain objects so they can be handed to
// client components. A signed-in admin, or developer mode switched off,
// gives no locks.
export function visitorLocks(developer, admin = false) {
  const d = developer ?? defaultDeveloper;
  const on = d.enabled === true && !admin;
  const map = (list) =>
    Object.fromEntries((on ? (list ?? []) : []).map((key) => [key, true]));
  return {
    site: on && d.site === true,
    pages: map(d.pages),
    sections: map(d.sections),
    items: map(d.items),
  };
}
export const noLocks = visitorLocks(null);

export const pageLocked = (locks, page) =>
  Boolean(locks?.site || locks?.pages?.[page]);
export const sectionLocked = (locks, section) =>
  Boolean(locks?.sections?.[section]);
export const itemLocked = (locks, kind, id) =>
  Boolean(locks?.items?.[`${kind}:${id}`]);

// The lockable page for a site path without its /id prefix.
export function pageForPath(path) {
  const clean = path.replace(/\/+$/, "") || "/";
  if (clean === "/") return "home";
  if (clean === "/calendar") return "diving";
  const page = lockablePages.find(([, , href]) => href === clean);
  return page?.[0] ?? null;
}

// The latest whole-site and page locks, kept in this server process so that
// proxy.js can answer locked pages with a 503 without reading the CMS.
// Unknown until the content has been read once after a start; the pages
// themselves still check every request.
export function rememberLocks(content) {
  const { site, pages } = visitorLocks(content?.developer);
  globalThis.__zanclusLocks = { site, pages };
}
export const knownLocks = () => globalThis.__zanclusLocks ?? null;

// How many things are locked, for the admin bar and the editor.
export function lockCount(developer) {
  const d = developer ?? defaultDeveloper;
  if (!d.enabled) return 0;
  if (d.site) return 1;
  return d.pages.length + d.sections.length + d.items.length;
}

// Seconds for the Retry-After header: until the expected end, at least five
// minutes and at most a day; an hour when no end is set. Times are WIT.
export function retryAfter(until, now = Date.now()) {
  if (!until) return 3600;
  const end = Date.parse(until + ":00+09:00");
  if (!Number.isFinite(end)) return 3600;
  return Math.min(86400, Math.max(300, Math.round((end - now) / 1000)));
}
