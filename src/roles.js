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

// Admin pages. The key is the address under /admin/; the intro sits under
// the page title.
export const sections = {
  overview: { title: "Ringkasan cepat", area: null, intro: "" },
  calendar: {
    title: "Kalender reservasi",
    area: "bookings",
    intro:
      "Reservasi, tanggal tutup, dan kalender agen dalam satu bulan. Klik tanggalnya untuk melihat rinciannya.",
  },
  reservations: {
    title: "Reservasi",
    area: "bookings",
    intro:
      "Catat dan ubah reservasi dari WhatsApp, website, dan pembayaran online.",
  },
  customers: {
    title: "Tamu",
    area: "bookings",
    intro:
      "Tamu yang pernah memesan, dengan jumlah kunjungan dan total belanja.",
  },
  payments: {
    title: "Pembayaran online",
    area: "payments",
    intro:
      "Pembayaran Midtrans, email tamu & invoice, rekening transfer, dan riwayat pembayaran.",
  },
  events: {
    title: "Kalender kegiatan",
    area: "website",
    intro:
      "Kegiatan di kalender halaman aktivitas dan banner event di beranda.",
  },
  agents: {
    title: "Agen & kalender",
    area: "agents",
    intro: "Kalender bersama travel agent dan OTA lewat tautan iCal.",
  },
  social: {
    title: "Kalender konten",
    area: "social",
    intro:
      "Rencana konten per platform, dari ide sampai tayang, dengan angka hasilnya.",
  },
  media: {
    title: "Foto & media",
    area: "website",
    intro: "Foto website, media library, dan video.",
  },
  website: {
    title: "Teks website",
    area: "website",
    intro: "Teks beranda dalam dua bahasa.",
  },
  experiences: {
    title: "Pengalaman & harga",
    area: "website",
    intro: "Kartu pengalaman di beranda dan harganya.",
  },
  activities: {
    title: "Halaman aktivitas",
    area: "website",
    intro: "Halaman diving, snorkeling, dan trip laut.",
  },
  courses: {
    title: "Kursus selam",
    area: "website",
    intro: "Kursus selam dan mitra sertifikasi.",
  },
  prices: {
    title: "Daftar harga",
    area: "website",
    intro:
      "Paket utama per aktivitas, sewa alat, layanan tambahan, dan add-on.",
  },
  shop: {
    title: "Dive Shop",
    area: "website",
    intro: "Produk dan sewa alat di Dive Shop.",
  },
  service: {
    title: "Servis alat selam",
    area: "website",
    intro: "Layanan servis alat selam dan harganya.",
  },
  about: {
    title: "Tentang kami",
    area: "website",
    intro: "Halaman tentang kami dan tim.",
  },
  contact: {
    title: "Kontak & sosial media",
    area: "website",
    intro: "Nomor WhatsApp, email, lokasi, dan tautan sosial media.",
  },
  seo: {
    title: "SEO & Search Console",
    area: "website",
    intro:
      "Sitemap, robots.txt, dan kode verifikasi supaya situs terdaftar di Google Search Console.",
  },
  employees: {
    title: "Pegawai",
    area: "hrd",
    intro:
      "Data pegawai, kontrak, gaji, tunjangan, potongan, BPJS, dan rekening.",
  },
  attendance: {
    title: "Absensi",
    area: "hrd",
    intro: "Kehadiran harian dan rekap per bulan.",
  },
  payroll: {
    title: "Slip gaji",
    area: "hrd",
    intro:
      "Slip gaji bulanan dari gaji, tunjangan, potongan, dan absensi. Kunci slip yang sudah dibayar.",
  },
  cashbook: {
    title: "Buku kas",
    area: "finance",
    intro:
      "Pemasukan dan pengeluaran per bulan. Pembayaran online yang lunas masuk sendiri.",
  },
  reports: {
    title: "Laba rugi & pajak",
    area: "finance",
    intro: "Laba rugi dua belas bulan, rincian per kategori, dan rekap pajak.",
  },
  stock: {
    title: "Barang & stok",
    area: "gudang",
    intro:
      "Stok tiap barang dari catatan masuk dan keluar, dengan peringatan stok menipis.",
  },
  movements: {
    title: "Keluar masuk",
    area: "gudang",
    intro: "Catatan barang masuk, keluar, dan koreksi stok per bulan.",
  },
  users: {
    title: "Pengguna & peran",
    area: "users",
    intro: "Akun tim dan peran masing-masing.",
  },
  developer: {
    title: "Mode developer",
    area: "settings",
    intro: "Kunci sementara untuk situs, halaman, atau produk saat perawatan.",
  },
  security: {
    title: "Ubah password",
    area: null,
    intro: "Ganti password akun Anda dengan kode OTP email.",
  },
};
export const sectionKeys = Object.keys(sections);
export const sectionTitle = (key) => sections[key]?.title ?? key;
export const sectionAllowed = (role, key) =>
  key in sections && hasArea(role, sections[key].area);

// The sidebar. A group with a title folds under a row with its icon; a
// group without one is a run of top-level links (the daily desk, and the
// users page at the end).
export const menuGroups = [
  { key: "desk", items: ["overview", "calendar", "reservations", "customers"] },
  {
    key: "website",
    title: "Situs web",
    icon: "website",
    items: [
      "events",
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
      "seo",
    ],
  },
  {
    key: "pr",
    title: "PR & mitra",
    icon: "social",
    items: ["social", "agents"],
  },
  {
    key: "hrd",
    title: "HRD",
    icon: "hrd",
    items: ["employees", "attendance", "payroll"],
  },
  {
    key: "finance",
    title: "Keuangan",
    icon: "finance",
    items: ["payments", "cashbook", "reports"],
  },
  {
    key: "gudang",
    title: "Gudang",
    icon: "gudang",
    items: ["stock", "movements"],
  },
  {
    key: "system",
    title: "Sistem",
    icon: "settings",
    items: ["developer", "security"],
  },
  { key: "users", items: ["users"] },
];
// The groups a role sees, with only the pages it may open.
export function visibleMenu(role) {
  return menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((key) => sectionAllowed(role, key)),
    }))
    .filter((group) => group.items.length);
}
// The sidebar group a page sits in.
export const groupOf = (key) =>
  menuGroups.find((group) => group.items.includes(key))?.key ?? null;

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
