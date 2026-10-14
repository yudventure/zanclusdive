// Who may open which part of the admin. An area is the unit of permission:
// every admin page and every admin API route belongs to one, and a role is
// a list of areas. Shared by the server (checks) and the admin (menu).
export const areas = {
  bookings: "Reservasi, kalender reservasi dan tamu",
  payments: "Pembayaran online",
  website: "Isi website: teks, foto, harga, kegiatan dan banner",
  agents: "Agen, OTA dan sinkron kalender",
  social: "Kalender konten media sosial",
  hrd: "Pegawai, absensi dan kesejahteraan",
  finance: "Buku kas, laba rugi dan pajak",
  gudang: "Stok dan barang masuk/keluar",
  settings: "Mode developer",
  users: "Pengguna dan peran",
};
export const roles = {
  superadmin: {
    label: "Superadmin",
    who: "Owner, developer dan manager: semua menu.",
    areas: Object.keys(areas),
  },
  hrd: {
    label: "HRD",
    who: "Pegawai, absensi, gaji dan asuransi.",
    areas: ["hrd"],
  },
  finance: {
    label: "Finance",
    who: "Laporan keuangan, laba rugi, pajak dan pembayaran online.",
    areas: ["finance", "payments"],
  },
  gudang: {
    label: "Gudang",
    who: "Stok dan keluar masuk barang.",
    areas: ["gudang"],
  },
  pr: {
    label: "PR",
    who: "Media sosial, website, reservasi dan kalender mitra.",
    areas: ["social", "website", "agents", "bookings"],
  },
};
export const roleKeys = Object.keys(roles);
export const roleLabel = (role) => roles[role]?.label ?? role;
export const areasOf = (role) => roles[role]?.areas ?? [];
// A null area is open to every signed-in account.
export const hasArea = (role, area) => !area || areasOf(role).includes(area);

// Admin pages. The key is the address under /admin/.
export const sections = {
  overview: { title: "Ringkasan cepat", area: null },
  calendar: { title: "Kalender reservasi", area: "bookings" },
  reservations: { title: "Reservasi", area: "bookings" },
  customers: { title: "Tamu", area: "bookings" },
  payments: { title: "Pembayaran online", area: "payments" },
  events: { title: "Kalender kegiatan", area: "website" },
  agents: { title: "Agen & kalender", area: "agents" },
  social: { title: "Kalender konten", area: "social" },
  media: { title: "Foto & media", area: "website" },
  website: { title: "Teks website", area: "website" },
  experiences: { title: "Pengalaman & harga", area: "website" },
  activities: { title: "Halaman aktivitas", area: "website" },
  courses: { title: "Kursus selam", area: "website" },
  prices: { title: "Daftar harga", area: "website" },
  shop: { title: "Dive Shop", area: "website" },
  service: { title: "Servis alat selam", area: "website" },
  about: { title: "Tentang kami", area: "website" },
  contact: { title: "Kontak & sosial media", area: "website" },
  hrd: { title: "HRD", area: "hrd" },
  finance: { title: "Keuangan", area: "finance" },
  gudang: { title: "Gudang", area: "gudang" },
  users: { title: "Pengguna & peran", area: "users" },
  developer: { title: "Mode developer", area: "settings" },
  security: { title: "Ubah password", area: null },
};
export const sectionKeys = Object.keys(sections);
export const sectionTitle = (key) => sections[key]?.title ?? key;
export const sectionAllowed = (role, key) =>
  key in sections && hasArea(role, sections[key].area);

// The sidebar, by category. "sub" is a collapsible group inside the
// category; the website editors sit there as before.
export const menuGroups = [
  { key: "main", title: "", items: ["overview"] },
  {
    key: "operations",
    title: "Operasional",
    items: ["calendar", "reservations", "customers", "payments"],
  },
  {
    key: "pr",
    title: "Website & PR",
    items: ["events", "agents", "social"],
    sub: {
      key: "site",
      title: "Pengaturan situs",
      items: [
        "media",
        "website",
        "experiences",
        "activities",
        "courses",
        "prices",
        "shop",
        "service",
        "about",
        "contact",
      ],
    },
  },
  { key: "hrd", title: "HRD", items: ["hrd"] },
  { key: "finance", title: "Finance", items: ["finance"] },
  { key: "gudang", title: "Gudang", items: ["gudang"] },
  {
    key: "settings",
    title: "Pengaturan",
    items: ["users", "developer", "security"],
  },
];
// The groups a role sees, with only the pages it may open.
export function visibleMenu(role) {
  return menuGroups
    .map((group) => {
      const items = group.items.filter((key) => sectionAllowed(role, key));
      const subItems =
        group.sub?.items.filter((key) => sectionAllowed(role, key)) ?? [];
      return {
        ...group,
        items,
        sub: subItems.length ? { ...group.sub, items: subItems } : null,
      };
    })
    .filter((group) => group.items.length || group.sub);
}

// Site content is saved as one document. Each top-level group belongs to
// an area; groups a role may not change are kept as they were.
const contentAreas = { developer: "settings", payments: "payments" };
export function mergeByRole(role, next, current) {
  const merged = {};
  for (const key of new Set([...Object.keys(current), ...Object.keys(next)])) {
    const area = contentAreas[key] ?? "website";
    const source = hasArea(role, area) ? next : current;
    if (key in source) merged[key] = source[key];
  }
  return merged;
}
